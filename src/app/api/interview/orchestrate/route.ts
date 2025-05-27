import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { orchestrateAgents } from '@/lib/agents/orchestrator';
import { verifySession } from '@/lib/auth';
import { getSession, updateConversationHistory } from '@/lib/session-service';

// Initialize OpenAI client for whisper
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API endpoint to orchestrate agents for voice interview
 * POST /api/interview/orchestrate
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
    
    const userTranscript = transcription.text;
    
    // 2. Update conversation history with user response
    await updateConversationHistory(sessionId, {
      role: 'user',
      content: userTranscript
    });
    
    // 3. Orchestrate agents to analyze and respond
    const result = await orchestrateAgents({
      transcript: userTranscript,
      procedureContext: sessionData.initialContext,
      conversationHistory: sessionData.conversationHistory,
      sessionId
    });
    
    // 4. Update conversation history with AI response
    await updateConversationHistory(sessionId, {
      role: 'ai',
      content: result.responseText
    });
    
    // Get updated conversation history
    const updatedSessionData = await getSession(sessionId);
    
    return NextResponse.json({
      success: true,
      userTranscript,
      aiResponse: result.responseText,
      aiResponseAudio: result.audioBase64,
      validationIssues: result.validationIssues,
      clarificationsMade: result.clarificationsMade,
      followUpChosen: result.followUpChosen,
      conversationHistory: updatedSessionData?.conversationHistory || []
    });

  } catch (error) {
    console.error('Error in interview orchestration API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to process interview turn', details: errorMessage },
      { status: 500 }
    );
  }
} 