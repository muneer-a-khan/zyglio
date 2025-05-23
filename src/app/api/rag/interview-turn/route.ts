import { NextResponse } from 'next/server';
import { getSession, updateConversationHistory } from '@/lib/rag-service';
import { generateSpeech } from '@/lib/tts-service';
import { verifySession } from '@/lib/auth';
import { selectNextQuestion, incrementQuestionsAsked, markInterviewCompleted, addBatchedQuestions } from '@/lib/session-service';
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
    // Basic auth verification
    const session = await verifySession(request);
    if (!session) {
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
    
    if (!sessionId || !audioBlob) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and audioBlob' },
        { status: 400 }
      );
    }

    // Get the session data
    const sessionData = await getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if interview is already completed
    if (sessionData.interviewCompleted) {
      return NextResponse.json(
        { error: 'Interview has already been completed' },
        { status: 400 }
      );
    }

    // Force end interview if requested
    if (forceEndInterview) {
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
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
    });
    
    const smeResponseText = transcription.text;
    
    // 2. Update conversation history with user response
    await updateConversationHistory(sessionId, {
      role: 'user',
      content: smeResponseText
    });
    
    // 3. Increment questions asked counter
    const questionsAsked = await incrementQuestionsAsked(sessionId);
    
    // 4. Check if interview should end (after at least 3 questions)
    if (questionsAsked >= 3) {
      const assessmentResponse = await fetch(new URL('/api/deepseek/interview-assessment', process.env.NEXTAUTH_URL).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (assessmentResponse.ok) {
        const assessment = await assessmentResponse.json();
        
        if (assessment.shouldEndInterview) {
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
    const unusedQuestions = sessionData.batchedQuestions.filter(q => !q.used).length;
    if (questionsAsked > 0 && questionsAsked % 5 === 0 && unusedQuestions < 3) {
      console.log(`Generating batch of questions after ${questionsAsked} questions (unused: ${unusedQuestions})`);
      
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
        console.log(`Added ${batchData.batchedQuestions.length} questions to the session`);
      }
    }
    
    // 6. Select the next question from batched questions
    const nextQuestion = await selectNextQuestion(sessionId, smeResponseText);
    
    if (!nextQuestion) {
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
    
    // 7. Convert AI question to speech
    const audioArrayBuffer = await generateSpeech(aiQuestionText);
    
    // 8. Update conversation history with AI question
    await updateConversationHistory(sessionId, {
      role: 'ai',
      content: aiQuestionText
    });
    
    // Convert audio ArrayBuffer to base64 for JSON transport
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
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