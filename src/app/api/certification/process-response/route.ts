import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // This endpoint has been replaced by the new ElevenLabs conversational AI system
  // Response processing is now handled automatically by ElevenLabs agents via server tools
  
  return NextResponse.json({
    error: 'This endpoint has been deprecated',
    message: 'Voice certification now uses ElevenLabs conversational AI agents. Response processing is handled automatically through server tools.',
    migration: 'Use /api/certification/elevenlabs/start with ElevenLabs agents for automatic response processing'
  }, { status: 410 });
} 