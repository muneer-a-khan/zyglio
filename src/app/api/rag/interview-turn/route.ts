import { NextResponse } from 'next/server';
import { getSession, updateConversationHistory } from '@/lib/session-service';
import { generateSpeech } from '@/lib/tts-service';
import { verifySession } from '@/lib/auth';
import { selectNextQuestion, incrementQuestionsAsked, markInterviewCompleted, addBatchedQuestions, BatchedQuestion } from '@/lib/session-service';
import OpenAI from 'openai';

// Initialize OpenAI client for whisper
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API endpoint to handle interview turns between AI and user
 * POST /api/rag/interview-turn
 */
export async function POST(request: Request) {
  try {
    console.log('[interview-turn] Processing new interview turn request');
    
    // Basic auth verification
    const session = await verifySession(request);
    if (!session) {
      console.error('[interview-turn] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request data
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const audioBlob = formData.get('audioBlob') as Blob;
    const forceEndInterview = formData.get('forceEndInterview') === 'true';
    
    console.log(`[interview-turn] Processing turn for session ${sessionId}, forceEnd=${forceEndInterview}`);
    
    if (!sessionId || !audioBlob) {
      console.error('[interview-turn] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and audioBlob' },
        { status: 400 }
      );
    }

    // Get the session data
    const sessionData = await getSession(sessionId);
    if (!sessionData) {
      console.error(`[interview-turn] Session ${sessionId} not found`);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(`[interview-turn] Session found, questions asked: ${sessionData.questionsAsked}, batched questions: ${sessionData.batchedQuestions.length}, completed: ${sessionData.interviewCompleted}`);

    // Check if interview is already completed
    if (sessionData.interviewCompleted) {
      console.warn(`[interview-turn] Attempted to continue completed interview ${sessionId}`);
      return NextResponse.json(
        { error: 'Interview has already been completed' },
        { status: 400 }
      );
    }

    // Force end interview if requested
    if (forceEndInterview) {
      console.log(`[interview-turn] Force ending interview ${sessionId}`);
      await markInterviewCompleted(sessionId);
      
      // Return the conversation history without processing audio
      return NextResponse.json({
        success: true,
        interviewCompleted: true,
        assessment: {
          reasoning: 'Interview manually ended by user',
          confidence: 100,
          coveredAreas: [],
          missingAreas: []
        },
        conversationHistory: sessionData.conversationHistory
      });
    }

    // 1. Speech-to-Text using Whisper API
    console.log('[interview-turn] Converting speech to text');
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
    });
    
    const smeResponseText = transcription.text;
    console.log(`[interview-turn] User response: "${smeResponseText.substring(0, 50)}..."`);
    
    // 2. Update conversation history with user response
    await updateConversationHistory(sessionId, {
      role: 'user',
      content: smeResponseText
    });
    
    // 3. Increment questions asked counter
    const questionsAsked = await incrementQuestionsAsked(sessionId);
    console.log(`[interview-turn] Questions asked: ${questionsAsked}`);
    
    // 4. Check if interview should end (after at least 3 questions)
    if (questionsAsked >= 3) {
      console.log('[interview-turn] Checking if interview should end');
      const assessmentResponse = await fetch(new URL('/api/deepseek/interview-assessment', process.env.NEXTAUTH_URL).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (assessmentResponse.ok) {
        const assessment = await assessmentResponse.json();
        console.log(`[interview-turn] Assessment results - should end: ${assessment.shouldEndInterview}, confidence: ${assessment.confidence}`);
        
        if (assessment.shouldEndInterview) {
          console.log('[interview-turn] Interview has enough information, ending');
          await markInterviewCompleted(sessionId);
          
          return NextResponse.json({
            success: true,
            smeResponseText,
            interviewCompleted: true,
            assessment: {
              reasoning: assessment.reasoning,
              confidence: assessment.confidence,
              coveredAreas: assessment.coveredAreas,
              missingAreas: assessment.missingAreas
            },
            conversationHistory: sessionData.conversationHistory
          });
        }
      }
    }
    
    // 5. Check if we need to generate more questions (every 5 questions after initial batch)
    const unusedQuestions = sessionData.batchedQuestions.filter((q: BatchedQuestion) => !q.used).length;
    console.log(`[interview-turn] Questions remaining: ${unusedQuestions} unused of ${sessionData.batchedQuestions.length} total`);
    
    if (questionsAsked > 0 && questionsAsked % 5 === 0 && unusedQuestions < 3) {
      console.log(`[interview-turn] Generating batch of questions after ${questionsAsked} questions (unused: ${unusedQuestions})`);
      
      const batchResponse = await fetch(new URL('/api/deepseek/batch-questions', process.env.NEXTAUTH_URL).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          isInitialBatch: false, 
          numberOfQuestions: 5 
        })
      });
      
      if (batchResponse.ok) {
        const batchData = await batchResponse.json();
        await addBatchedQuestions(sessionId, batchData.batchedQuestions);
        console.log(`[interview-turn] Added ${batchData.batchedQuestions.length} questions to the session`);
      } else {
        console.error('[interview-turn] Failed to generate new batch of questions');
      }
    }
    
    // 6. Select the next question from batched questions
    console.log('[interview-turn] Selecting next question');
    const nextQuestion = await selectNextQuestion(sessionId, smeResponseText);
    
    if (!nextQuestion) {
      console.warn('[interview-turn] No next question available, ending interview');
      // Fallback if no questions available
      await markInterviewCompleted(sessionId);
      
      return NextResponse.json({
        success: true,
        smeResponseText,
        interviewCompleted: true,
        assessment: {
          reasoning: 'No more questions available',
          confidence: 50,
          coveredAreas: ['Basic information gathered'],
          missingAreas: []
        },
        conversationHistory: sessionData.conversationHistory
      });
    }
    
    const aiQuestionText = nextQuestion.question;
    console.log(`[interview-turn] Selected question: "${aiQuestionText.substring(0, 50)}..."`);
    
    // 7. Convert AI question to speech
    console.log('[interview-turn] Converting question to speech');
    const audioArrayBuffer = await generateSpeech(aiQuestionText);
    
    // 8. Update conversation history with AI question
    await updateConversationHistory(sessionId, {
      role: 'ai',
      content: aiQuestionText
    });
    
    // Convert audio ArrayBuffer to base64 for JSON transport
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
    console.log('[interview-turn] Successfully completed turn');
    return NextResponse.json({
      success: true,
      smeResponseText,
      aiQuestionText,
      aiQuestionAudio: audioBase64,
      interviewCompleted: false,
      questionsAsked,
      questionCategory: nextQuestion.category,
      conversationHistory: sessionData.conversationHistory
    });

  } catch (error) {
    console.error('Error in interview-turn API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to process interview turn', details: errorMessage },
      { status: 500 }
    );
  }
} 