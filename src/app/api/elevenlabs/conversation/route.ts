import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId, sessionId, scenarioId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    console.log(`🔗 Creating conversation with agent: ${agentId} for scenario: ${scenarioId}`);

    // Get signed URL from ElevenLabs using the correct endpoint
    const signedUrlResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to get signed URL from ElevenLabs' 
      }, { status: 500 });
    }

    const signedUrlData = await signedUrlResponse.json();
    
    console.log(`✅ Got signed URL for agent: ${agentId}`);

    return NextResponse.json({
      signedUrl: signedUrlData.signed_url,
      sessionId: sessionId || `session-${Date.now()}`,
      agentId,
      scenarioId
    });

  } catch (error) {
    console.error('Error creating ElevenLabs conversation:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 