import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateSpeech } from '@/lib/tts-service';
import { verifySession } from '@/lib/auth';
import { getSession, updateConversationHistory } from '@/lib/session-service';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * API endpoint to generate first interview question
 * POST /api/interview/first-question
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
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
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

    // Generate first question
    const questionText = await generateFirstQuestion(sessionData.initialContext);
    
    // Generate speech from the question
    const audioBuffer = await generateSpeech(questionText);
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    // Update conversation history with AI question
    await updateConversationHistory(sessionId, {
      role: 'ai',
      content: questionText
    });
    
    // Get updated conversation history
    const updatedSessionData = await getSession(sessionId);
    
    return NextResponse.json({
      success: true,
      questionText,
      questionAudio: audioBase64,
      conversationHistory: updatedSessionData?.conversationHistory || []
    });

  } catch (error) {
    console.error('Error generating first question:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to generate first question', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Generate the first question of the interview
 */
async function generateFirstQuestion(initialContext: string): Promise<string> {
  const systemPrompt = `You are an expert medical/technical interviewer. Your goal is to ask an informed, insightful, and open-ended initial question to a Subject Matter Expert (SME) about a technical or medical procedure.
Based on the enhanced context provided, ask a specific opening question that demonstrates your knowledge and will help you understand the procedure better.
Your question should be concise (1-2 sentences) but specific enough to show you've done your research.
Maintain a professional, curious tone.
Refer to specific elements from the context to show your understanding of the topic.`;

  const userPrompt = `
## Enhanced Context:
${initialContext}

Generate an opening question for a Subject Matter Expert interview about the procedure described in the context above. 
The question should reference specific aspects from the enhanced context to demonstrate your background knowledge while remaining open-ended enough to let the expert elaborate.
Focus on one of the key topics or relevant factors mentioned if appropriate.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
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