import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Voice options
export enum TTSVoice {
  ALLOY = "alloy",
  ECHO = "echo",
  FABLE = "fable",
  ONYX = "onyx",
  NOVA = "nova",
  SHIMMER = "shimmer",
}

/**
 * Generate speech audio from text using OpenAI's TTS API
 * 
 * @param text - The text to convert to speech
 * @param voice - The voice to use (default: NOVA)
 * @returns An ArrayBuffer containing the audio data
 */
export async function generateSpeech(
  text: string,
  voice: TTSVoice = TTSVoice.NOVA
): Promise<ArrayBuffer> {
  try {
    // Check for empty or invalid text
    if (!text || text.trim() === "") {
      throw new Error("Empty or invalid text provided for speech generation");
    }
    
    // Truncate if text is too long (OpenAI has limits)
    const maxChars = 4096;
    const truncatedText = text.length > maxChars 
      ? text.substring(0, maxChars - 3) + "..."
      : text;
    
    // Generate speech using OpenAI's TTS API
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: truncatedText,
    });
    
    // Convert the response to an ArrayBuffer
    const arrayBuffer = await mp3Response.arrayBuffer();
    
    return arrayBuffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    
    // Return an empty ArrayBuffer if there's an error
    return new ArrayBuffer(0);
  }
}

/**
 * Chunk a long text into suitable segments for TTS processing
 * 
 * @param text - The long text to chunk
 * @param maxCharsPerChunk - Maximum characters per chunk
 * @returns An array of text chunks
 */
export function chunkTextForTTS(
  text: string, 
  maxCharsPerChunk: number = 4000
): string[] {
  // If text is short enough, return it as is
  if (text.length <= maxCharsPerChunk) {
    return [text];
  }
  
  // Split text by sentences and chunk them
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit, start a new chunk
    if (currentChunk.length + sentence.length > maxCharsPerChunk) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    } else {
      // Append the sentence to the current chunk
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  // Add the final chunk if not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * ElevenLabs Text-to-Speech service
 */
export async function generateSpeechElevenLabs(text: string, voiceId: string = 'EXAVITQu4vr4xnSDxMaL'): Promise<ArrayBuffer> {
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