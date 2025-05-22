import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/session-service';
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
    // Basic auth verification
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request data
    const { sessionId, isFirstQuestion = false } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId' },
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

    // Generate the question
    let aiQuestionText;
    
    if (isFirstQuestion) {
      aiQuestionText = await generateFirstQuestion(sessionData.initialContext);
    } else {
      // This branch is used by the interview-turn API which manages its own logic
      return NextResponse.json(
        { error: 'For non-first questions, use the interview-turn API' },
        { status: 400 }
      );
    }

    // Generate speech with ElevenLabs
    const audioArrayBuffer = await generateSpeech(aiQuestionText);
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
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
Maintain a professional, curious tone.`;

  const userPrompt = `
## Context:
${initialContext}

Generate an opening question for a Subject Matter Expert interview about the procedure described in the context above. 
The question should be specific enough to show you have some background knowledge but open-ended enough to let the expert elaborate.
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

    return completion.choices[0].message.content || "Could you walk me through this procedure and explain the key steps involved?";
  } catch (error) {
    console.error('Error generating first question:', error);
    return "Could you walk me through this procedure and explain the key steps involved?";
  }
} 