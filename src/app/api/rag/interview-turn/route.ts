import { NextResponse } from 'next/server';
import { generateEmbedding, getSession, retrieveRelevantContext, updateConversationHistory } from '@/lib/rag-service';
import { generateSpeech } from '@/lib/tts-service';
import { verifySession } from '@/lib/auth'; // Assuming you have a session verification function
import OpenAI from 'openai';

// Initialize OpenAI client for whisper
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
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

    // 1. Speech-to-Text using Whisper API
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
    });
    
    const smeResponseText = transcription.text;
    
    // 2. Dynamic retrieval for this turn
    const dynamicContext = await getDynamicContext(smeResponseText);
    
    // 3. Update conversation history with user response
    await updateConversationHistory(sessionId, {
      role: 'user',
      content: smeResponseText
    });
    
    // 4. Generate AI follow-up question
    const aiQuestionText = await generateInterviewQuestion(
      sessionData.initialContext,
      dynamicContext,
      sessionData.conversationHistory,
      smeResponseText
    );
    
    // 5. Convert AI question to speech using ElevenLabs
    const audioArrayBuffer = await generateSpeech(aiQuestionText);
    
    // 6. Update conversation history with AI question
    await updateConversationHistory(sessionId, {
      role: 'ai',
      content: aiQuestionText
    });
    
    // Create response headers and construct a Response object
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    // Convert audio ArrayBuffer to base64 for JSON transport
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
    return NextResponse.json({
      success: true,
      smeResponseText,
      aiQuestionText,
      aiQuestionAudio: audioBase64,
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

/**
 * Helper function to get dynamic context based on user's response
 */
async function getDynamicContext(userResponse: string): Promise<string> {
  // Get relevant chunks for the user response
  const ragResult = await retrieveRelevantContext(userResponse, 3);
  return ragResult.context;
}

/**
 * Generate an interview question using DeepSeek
 */
async function generateInterviewQuestion(
  initialContext: string,
  dynamicContext: string, 
  conversationHistory: Array<{role: 'ai'|'user', content: string}>,
  latestUserResponse: string
): Promise<string> {
  // Format the conversation history text
  const conversationHistoryText = conversationHistory
    .map(entry => `${entry.role === 'user' ? 'SME' : 'AI'}: ${entry.content}`)
    .join('\n');
  
  // Create system prompt
  const systemPrompt = `You are an expert interviewer. Your goal is to ask informed, insightful, and open-ended follow-up questions to a Subject Matter Expert (SME) on a technical or medical procedure. 
You have comprehensive background knowledge provided below.
Maintain a professional, curious, and empathetic tone.
Focus on probing deeper, seeking clarification, and exploring nuances based on the SME's last statement and the context.
Do NOT simply rephrase or summarize the SME's previous answer.
Do NOT ask generic questions already covered by the context unless specifically for clarification.
Keep your questions concise.`;

  // Full context combining initial and dynamic contexts
  const fullContext = `
## Broad Topic Context:
${initialContext}

## Current Turn's Dynamic Context:
${dynamicContext}
`;

  // User prompt with conversation history and latest response
  const userPrompt = `
## Conversation So Far:
${conversationHistoryText}
SME's last statement: "${latestUserResponse}"

Given the conversation history and all provided background information, what is your next insightful question for the SME?
`;

  // Call DeepSeek model
  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat", // Use deepseek-chat model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullContext + '\n\n' + userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return completion.choices[0].message.content || "What more can you tell me about this procedure?";
  } catch (error) {
    console.error('Error generating interview question:', error);
    return "Could you elaborate further on what you just explained?";
  }
} 