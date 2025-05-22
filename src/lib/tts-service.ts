/**
 * ElevenLabs Text-to-Speech service
 */
export async function generateSpeech(text: string, voiceId: string = 'EXAVITQu4vr4xnSDxMaL'): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not defined in environment variables');
  }
  
  // Default to premium "Rachel" voice if none specified
  // See https://api.elevenlabs.io/v1/voices for a list of available voices
  const elevenLabsVoiceId = voiceId;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2', // Using their latest and fastest model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0, 
          use_speaker_boost: true,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error generating speech with ElevenLabs:', error);
    throw error;
  }
}

/**
 * Get a list of available ElevenLabs voices
 */
export async function getVoices(): Promise<any> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not defined in environment variables');
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
} 