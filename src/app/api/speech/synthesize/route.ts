import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Base URL for the ElevenLabs API
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({
        error: 'Text is required for speech synthesis'
      }, { status: 400 });
    }

    // ElevenLabs API key from environment variables
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // Voice ID to use (default to "premade/adam" if not specified)
    // You can replace this with other voice IDs from ElevenLabs
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'premade/adam';

    // Call ElevenLabs TTS API
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    // Get the audio data as an ArrayBuffer
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Convert to base64 for transmission over JSON
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
    return NextResponse.json({
      success: true,
      audioBase64
    });
    
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    return NextResponse.json({
      error: 'Failed to synthesize speech',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 