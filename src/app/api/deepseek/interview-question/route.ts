import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession, addBatchedQuestions } from '@/lib/session-service';
import { generateSpeech } from '@/lib/tts-service';
import { verifySession } from '@/lib/auth';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * API endpoint to generate interview questions
 * POST /api/deepseek/interview-question
 */
export async function POST(request: Request) {
  try {
    console.log('[interview-question] Generating interview question');
    
    // Basic auth verification
    const session = await verifySession(request);
    if (!session) {
      console.error('[interview-question] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request data
    const { sessionId, isFirstQuestion = false } = await request.json();
    console.log(`[interview-question] Request for ${isFirstQuestion ? 'first' : 'follow-up'} question, sessionId: ${sessionId}`);
    
    if (!sessionId) {
      console.error('[interview-question] Missing sessionId');
      return NextResponse.json(
        { error: 'Missing required fields: sessionId' },
        { status: 400 }
      );
    }

    // Get the session data
    const sessionData = await getSession(sessionId);
    if (!sessionData) {
      console.error(`[interview-question] Session ${sessionId} not found`);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Generate the question
    let aiQuestionText;
    
    if (isFirstQuestion) {
      console.log('[interview-question] Generating first question');
      // Generate the first question
      aiQuestionText = await generateFirstQuestion(sessionData.initialContext);
      console.log(`[interview-question] First question generated: "${aiQuestionText.substring(0, 50)}..."`);
      
      // Also generate the initial batch of questions in parallel
      // We don't await this, as we want to return the first question quickly
      generateInitialBatchOfQuestions(sessionId, sessionData.initialContext)
        .then(() => console.log('[interview-question] Initial batch generation completed'))
        .catch(error => console.error('[interview-question] Error generating initial batch:', error));
    } else {
      // This branch is used by the interview-turn API which manages its own logic
      console.warn('[interview-question] Non-first question requested - should use interview-turn API');
      return NextResponse.json(
        { error: 'For non-first questions, use the interview-turn API' },
        { status: 400 }
      );
    }

    // Generate speech with ElevenLabs
    console.log('[interview-question] Converting question to speech');
    const audioArrayBuffer = await generateSpeech(aiQuestionText);
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
    console.log('[interview-question] Successfully generated question and audio');
    return NextResponse.json({
      success: true,
      aiQuestionText,
      aiQuestionAudio: audioBase64
    });

  } catch (error) {
    console.error('Error in interview-question API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to generate interview question', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Generate the first question of the interview
 */
async function generateFirstQuestion(initialContext: string): Promise<string> {
  const systemPrompt = `You are an expert interviewer. Your goal is to ask an informed, insightful, and open-ended initial question to a Subject Matter Expert (SME) about a technical or medical procedure.
Based on the context provided, ask a broad opening question that will help you understand the procedure better.
Your question should be concise (1-2 sentences) but specific enough to show you have some background knowledge.
Maintain a professional, curious tone.
IMPORTANT: Only return the question itself, with no additional explanation, asterisks, formatting or commentary. Do not include any text like "Question:" or "My question is:" or any other prefixes.`;

  const userPrompt = `
## Context:
${initialContext}

Generate an opening question for a Subject Matter Expert interview about the procedure described in the context above. 
The question should be specific enough to show you have some background knowledge but open-ended enough to let the expert elaborate.
IMPORTANT: Return ONLY the question itself - no explanation, no commentary, no formatting. Just the plain question text.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat", // Use deepseek-chat model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    // Extract just the question, removing any explanatory text
    let questionText = completion.choices[0].message.content || "Could you walk me through this procedure and explain the key steps involved?";
    
    // Clean up any potential formatting or explanations
    questionText = questionText
      .replace(/^(Question:|My question is:|Here's my question:|I would ask:)?\s*/i, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove markdown bold
      .replace(/^\s*["'](.*)["']\s*$/, '$1')  // Remove quotes
      .trim();

    return questionText;
  } catch (error) {
    console.error('Error generating first question:', error);
    return "Could you walk me through this procedure and explain the key steps involved?";
  }
}

/**
 * Generate the initial batch of questions
 */
async function generateInitialBatchOfQuestions(sessionId: string, initialContext: string): Promise<void> {
  try {
    console.log('[generateInitialBatch] Starting batch generation for session', sessionId);
    
    // Wait a short delay to ensure the first question has been processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate directly in this function instead of calling another API endpoint
    // This avoids the authentication issues when making API calls from server components
    console.log('[generateInitialBatch] Generating questions directly');
    
    // Generate batch of 20 questions
    const systemPrompt = `You are an expert interviewer preparing questions for a comprehensive interview with a Subject Matter Expert (SME) about a technical or medical procedure.

Your goal is to generate 20 diverse, insightful questions that will help extract thorough knowledge to create training modules.

This is the initial batch - cover broad aspects of the procedure including: preparation, execution, troubleshooting, best practices, common mistakes, variations, and edge cases.

For each question, also provide:
1. A category (e.g., "preparation", "execution", "troubleshooting", "best-practices", etc.)
2. 3-5 keywords that would indicate this question is relevant to ask

Format your response as a JSON array where each object has:
{
  "question": "the actual question text",
  "category": "category name", 
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

IMPORTANT: Return ONLY the JSON array - no explanation, no commentary, no formatting. Just the plain JSON.`;

    const userPrompt = `
## Procedure Context:
${initialContext}

Generate 20 comprehensive questions to thoroughly understand this procedure for training module creation.
`;

    const { v4: uuidv4 } = await import('uuid');
    
    // Call DeepSeek directly
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from DeepSeek');
    }

    // Parse the JSON response
    let questionsData;
    try {
      questionsData = JSON.parse(responseText);
      console.log(`[generateInitialBatch] Successfully parsed ${questionsData.length} questions`);
    } catch (parseError) {
      console.error('[generateInitialBatch] Failed to parse JSON response', parseError);
      console.log('[generateInitialBatch] Response text:', responseText.substring(0, 200) + '...');
      throw new Error('Failed to parse batch questions response');
    }
    
    // Convert to BatchedQuestion objects
    const batchedQuestions = questionsData.map((q: any) => ({
      id: uuidv4(),
      question: q.question,
      category: q.category,
      keywords: q.keywords,
      used: false
    }));

    // Add the batched questions to the session
    const success = await addBatchedQuestions(sessionId, batchedQuestions);
    
    if (success) {
      console.log(`[generateInitialBatch] Added ${batchedQuestions.length} questions to session ${sessionId}`);
    } else {
      console.error(`[generateInitialBatch] Failed to add questions to session ${sessionId}`);
      throw new Error('Failed to add questions to session');
    }
    
    // Get session again to verify questions were added
    const updatedSession = await getSession(sessionId);
    console.log(`[generateInitialBatch] Session now has ${updatedSession?.batchedQuestions?.length || 0} batched questions`);
    
    return;
  } catch (error) {
    console.error('[generateInitialBatch] Error generating initial batch of questions:', error);
    throw error;
  }
} 