import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { SSEService } from '@/lib/services/sse.service';

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return new Response('Missing taskId parameter', { status: 400 });
  }

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      const connectionId = `${session.user.id}-${taskId}`;
      
      // Store the controller for this connection
      SSEService.addConnection(connectionId, controller);
      
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connected',
        taskId,
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      
      console.log(`SSE connection established for task ${taskId}`);
      
      // Handle connection cleanup
      request.signal.addEventListener('abort', () => {
        console.log(`SSE connection closed for task ${taskId}`);
        SSEService.removeConnection(connectionId);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

 