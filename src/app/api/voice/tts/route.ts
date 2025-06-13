import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Validation schema for TTS requests
const ttsSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text too long (max 5000 characters)"),
  voiceId: z.string().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  speakerBoost: z.boolean().optional()
});

/**
 * POST /api/voice/tts - Generate speech using ElevenLabs
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }

    // Check if ElevenLabs API key is configured
    const elevenlabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ttsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input data",
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Default voice settings
    const defaultSettings = {
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella voice
      stability: 0.5,
      similarityBoost: 0.5,
      style: 0,
      speakerBoost: true
    };

    const settings = {
      voiceId: data.voiceId || defaultSettings.voiceId,
      stability: data.stability ?? defaultSettings.stability,
      similarityBoost: data.similarityBoost ?? defaultSettings.similarityBoost,
      style: data.style ?? defaultSettings.style,
      speakerBoost: data.speakerBoost ?? defaultSettings.speakerBoost
    };

    try {
      // Call ElevenLabs TTS API
      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey
        },
        body: JSON.stringify({
          text: data.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            use_speaker_boost: settings.speakerBoost
          }
        })
      });

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error('ElevenLabs TTS API error:', errorText);
        return NextResponse.json(
          { error: `TTS generation failed: ${ttsResponse.status}` },
          { status: ttsResponse.status }
        );
      }

      // Get the audio blob
      const audioBuffer = await ttsResponse.arrayBuffer();
      
      // Return the audio file
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          'X-TTS-Voice-ID': settings.voiceId,
          'X-TTS-Text-Length': data.text.length.toString(),
          'X-TTS-Settings': JSON.stringify({
            stability: settings.stability,
            similarityBoost: settings.similarityBoost,
            style: settings.style,
            speakerBoost: settings.speakerBoost
          })
        }
      });
    } catch (ttsError) {
      console.error("ElevenLabs TTS error:", ttsError);
      return NextResponse.json(
        { 
          error: "TTS service error",
          message: ttsError instanceof Error ? ttsError.message : "Unknown TTS error"
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error in TTS endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/tts - Get TTS service status and available voices
 */
export async function GET() {
  try {
    const elevenlabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    
    if (!elevenlabsApiKey) {
      return NextResponse.json({
        success: false,
        service: "ElevenLabs TTS",
        status: "missing_api_key",
        ready: false
      });
    }

    try {
      // Fetch available voices from ElevenLabs
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': elevenlabsApiKey
        }
      });

      if (!voicesResponse.ok) {
        throw new Error(`Failed to fetch voices: ${voicesResponse.status}`);
      }

      const voicesData = await voicesResponse.json();
      
      return NextResponse.json({
        success: true,
        service: "ElevenLabs TTS",
        status: "configured",
        ready: true,
        voices: voicesData.voices?.map((voice: any) => ({
          id: voice.voice_id,
          name: voice.name,
          category: voice.category,
          description: voice.description,
          previewUrl: voice.preview_url,
          settings: voice.settings
        })) || [],
        limits: {
          maxTextLength: 5000,
          supportedFormats: ["audio/mpeg"],
          settings: {
            stability: { min: 0, max: 1, default: 0.5 },
            similarityBoost: { min: 0, max: 1, default: 0.5 },
            style: { min: 0, max: 1, default: 0 },
            speakerBoost: { default: true }
          }
        }
      });
    } catch (voicesError) {
      console.error("Error fetching voices:", voicesError);
      return NextResponse.json({
        success: true,
        service: "ElevenLabs TTS",
        status: "configured_but_limited",
        ready: true,
        error: "Could not fetch voice list",
        defaultVoice: {
          id: 'EXAVITQu4vr4xnSDxMaL',
          name: 'Bella',
          category: 'premade'
        }
      });
    }
  } catch (error) {
    console.error("Error checking TTS service status:", error);
    return NextResponse.json(
      { error: "Failed to check TTS service status" },
      { status: 500 }
    );
  }
} 