import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ElevenLabsService } from '@/lib/elevenlabs-service';

const elevenLabsService = new ElevenLabsService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId, sessionId, scenarioId } = await request.json();
    
    if (!agentId || !sessionId || !scenarioId) {
      return NextResponse.json(
        { error: 'Missing required parameters: agentId, sessionId, scenarioId' },
        { status: 400 }
      );
    }

    console.log(`Starting conversation for agent ${agentId}, scenario ${scenarioId}, session ${sessionId}`);

    // Get signed WebSocket URL from ElevenLabs service
    const signedUrl = await elevenLabsService.getConversationWebSocketUrl(agentId, {
      sessionId,
      scenarioId,
      userId: session.user.id
    });

    return NextResponse.json({
      success: true,
      signedUrl,
      agentId,
      sessionId,
      scenarioId
    });

  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start conversation', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 