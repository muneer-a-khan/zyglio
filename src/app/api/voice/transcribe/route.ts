import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/voice/transcribe - Transcribe audio using OpenAI Whisper
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

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 503 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;
    const language = formData.get('language') as string;
    const model = formData.get('model') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'audio/wav', 
      'audio/mp3', 
      'audio/m4a', 
      'audio/webm', 
      'audio/ogg',
      'audio/mpeg'
    ];
    
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${audioFile.type}` },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit for Whisper)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25MB." },
        { status: 400 }
      );
    }

    try {
      // Prepare form data for OpenAI Whisper API
      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile);
      whisperFormData.append('model', model || 'whisper-1');
      whisperFormData.append('response_format', 'verbose_json');
      
      if (language) {
        whisperFormData.append('language', language);
      }

      // Call OpenAI Whisper API
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: whisperFormData
      });

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        console.error('OpenAI Whisper API error:', errorText);
        return NextResponse.json(
          { error: `Transcription failed: ${whisperResponse.status}` },
          { status: whisperResponse.status }
        );
      }

      const transcriptionResult = await whisperResponse.json();
      
      // Calculate average confidence from segments
      const calculateAverageConfidence = (segments: any[]): number => {
        if (!segments || segments.length === 0) return 0.8; // Default confidence
        
        const totalConfidence = segments.reduce((sum, segment) => 
          sum + (segment.confidence || 0.8), 0
        );
        return totalConfidence / segments.length;
      };

      const confidence = calculateAverageConfidence(transcriptionResult.segments || []);

      return NextResponse.json({
        success: true,
        transcription: {
          text: transcriptionResult.text || '',
          confidence: confidence,
          language: transcriptionResult.language || language || 'en',
          duration: transcriptionResult.duration || 0,
          segments: transcriptionResult.segments?.map((segment: any) => ({
            start: segment.start,
            end: segment.end,
            text: segment.text,
            confidence: segment.confidence || 0.8
          })) || []
        },
        metadata: {
          model: model || 'whisper-1',
          fileSize: audioFile.size,
          fileType: audioFile.type,
          fileName: audioFile.name
        }
      });
    } catch (whisperError) {
      console.error("OpenAI Whisper transcription error:", whisperError);
      return NextResponse.json(
        { 
          error: "Transcription service error",
          message: whisperError instanceof Error ? whisperError.message : "Unknown transcription error"
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error in transcription endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/transcribe - Get transcription service status
 */
export async function GET() {
  try {
    const hasOpenAI = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    return NextResponse.json({
      success: true,
      service: "OpenAI Whisper",
      status: hasOpenAI ? "configured" : "missing_api_key",
      supportedFormats: [
        "audio/wav", 
        "audio/mp3", 
        "audio/m4a", 
        "audio/webm", 
        "audio/ogg",
        "audio/mpeg"
      ],
      maxFileSize: "25MB",
      ready: hasOpenAI
    });
  } catch (error) {
    console.error("Error checking transcription service status:", error);
    return NextResponse.json(
      { error: "Failed to check transcription service status" },
      { status: 500 }
    );
  }
} 