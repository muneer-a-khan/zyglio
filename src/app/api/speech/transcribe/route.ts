import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import OpenAI from 'openai';
import { Readable } from 'stream';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the form data with the audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const procedureId = formData.get('procedureId');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Convert Blob to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a filename with appropriate extension
    const filename = `recording-${Date.now()}.wav`;

    // Create a file object that OpenAI SDK can use
    const file = new File([buffer], filename, { type: audioFile.type });

    // Use OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en",
      response_format: "json",
    });

    // Return the transcribed text
    return NextResponse.json({
      success: true,
      text: transcription.text,
      procedureId
    });
    
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({
      error: 'Failed to transcribe audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 