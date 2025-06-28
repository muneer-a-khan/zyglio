import { NextRequest, NextResponse } from 'next/server';
import { streamingProcessor } from '@/lib/streaming-ai';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, sessionId, chunk, task = 'topicAnalysis' } = await request.json();

    switch (action) {
      case 'initialize':
        streamingProcessor.initializeStream(sessionId, task, 'speed');
        return NextResponse.json({ success: true, sessionId });

      case 'chunk':
        const stream = await streamingProcessor.processPartialInput(sessionId, chunk);
        if (stream) {
          return new NextResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }
        return NextResponse.json({ success: true, processed: false });

      case 'finalize':
        const result = await streamingProcessor.finalizeStream(sessionId);
        return NextResponse.json({ success: true, result });

      case 'status':
        const status = streamingProcessor.getStatus(sessionId);
        return NextResponse.json({ success: true, status });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in stream-analyze:', error);
    return NextResponse.json({
      error: 'Failed to process streaming analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle streaming connections
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  // Return status for existing stream
  const status = streamingProcessor.getStatus(sessionId);
  return NextResponse.json({ status });
} 