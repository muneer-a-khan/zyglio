import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

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
      connections.set(connectionId, controller);
      
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
        connections.delete(connectionId);
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

// Function to broadcast updates to all connected clients for a task
export function broadcastProcessingUpdate(
  userId: string, 
  taskId: string, 
  update: {
    mediaItemId: string;
    status: string;
    progress: number;
    stage: string;
    errorMessage?: string;
    summary?: string;
    keyTopics?: string[];
    filename?: string;
  }
) {
  const connectionId = `${userId}-${taskId}`;
  const controller = connections.get(connectionId);
  
  if (controller) {
    try {
      const data = JSON.stringify({
        type: 'processing_update',
        taskId,
        ...update,
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      console.log(`Broadcasted update for ${connectionId}:`, update.stage);
    } catch (error) {
      console.error(`Failed to send SSE update for ${connectionId}:`, error);
      // Remove invalid connection
      connections.delete(connectionId);
    }
  }
}

// Function to broadcast completion message
export function broadcastProcessingComplete(
  userId: string,
  taskId: string,
  summary: {
    total: number;
    completed: number;
    failed: number;
    completedItems: Array<{
      mediaItemId: string;
      filename: string;
      summary?: string;
      keyTopics?: string[];
    }>;
    failedItems: Array<{
      mediaItemId: string;
      filename: string;
      errorMessage: string;
    }>;
  }
) {
  const connectionId = `${userId}-${taskId}`;
  const controller = connections.get(connectionId);
  
  if (controller) {
    try {
      const data = JSON.stringify({
        type: 'processing_complete',
        taskId,
        summary,
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      console.log(`Broadcasted completion for ${connectionId}`);
    } catch (error) {
      console.error(`Failed to send SSE completion for ${connectionId}:`, error);
      connections.delete(connectionId);
    }
  }
} 