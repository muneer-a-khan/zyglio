import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getSession } from '@/lib/session-service';

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

    // Forward the request to the new API
    const response = await fetch(new URL('/api/deepseek/interview-question', process.env.NEXTAUTH_URL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        isFirstQuestion: true
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate first question');
    }
    
    const data = await response.json();
    
    // Get updated conversation history
    const updatedSessionData = await getSession(sessionId);
    
    return NextResponse.json({
      success: true,
      questionText: data.aiQuestionText,
      questionAudio: data.aiQuestionAudio,
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