import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Base URL for the ElevenLabs API
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// List of known working ElevenLabs voice IDs
const VOICE_OPTIONS = {
  rachel: '21m00Tcm4TlvDq8ikWAM', // Rachel
  adam: 'pNInz6obpgDQGcFmaJgB',   // Adam
  antoni: 'ErXwobaYiN019PkySvjV', // Antoni
  thomas: 'GBv7mTt0atIp3Br8iCZE', // Thomas
  domi: 'AZnzlk1XvdvUeBnXmlld',   // Domi
  bella: 'EXAVITQu4vr4xnSDxMaL',  // Bella
  josh: 'TxGEqnHWrfWFTfGW9XjX',   // Josh
};

// Default TTS model
const DEFAULT_MODEL = 'eleven_flash_v2_5';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, model = DEFAULT_MODEL } = await request.json();
    
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

    // Get voice ID from environment variable or use default
    let voiceId = process.env.ELEVENLABS_VOICE_ID;
    
    // If not set or invalid format, use a default voice
    if (!voiceId || !voiceId.match(/^[a-zA-Z0-9]{21,24}$/)) {
      voiceId = VOICE_OPTIONS.adam; // Default to Adam
    }

    console.log(`Using ElevenLabs voice ID: ${voiceId}, model: ${model}`);

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
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`ElevenLabs API error: ${response.status} ${response.statusText}`, errorData);
      
      // Try with a different voice if the original one failed
      if (voiceId !== VOICE_OPTIONS.adam) {
        console.log("Retrying with backup voice...");
        const backupResponse = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${VOICE_OPTIONS.adam}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text: text,
            model_id: model,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });
        
        if (!backupResponse.ok) {
          const backupErrorData = await backupResponse.json().catch(() => ({ error: 'Unknown error with backup voice' }));
          console.error(`Backup voice API error: ${backupResponse.status}`, backupErrorData);
          throw new Error(`ElevenLabs API error with backup voice: ${backupResponse.status}`);
        }
        
        // Get the audio data as an ArrayBuffer from backup voice
        const audioArrayBuffer = await backupResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
        
        return NextResponse.json({
          success: true,
          audioBase64,
          voice: 'backup',
          model
        });
      }
      
      // If original voice failed and we're already using Adam, throw the error
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    // Get the audio data as an ArrayBuffer
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Convert to base64 for transmission over JSON
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
    return NextResponse.json({
      success: true,
      audioBase64,
      voice: 'primary',
      model
    });
    
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    
    // Try browser TTS as final fallback
    return NextResponse.json({
      error: 'Failed to synthesize speech with ElevenLabs, falling back to browser TTS',
      fallback: true,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 