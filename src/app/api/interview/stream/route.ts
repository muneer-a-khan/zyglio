/**
 * Interview Streaming API
 * Handles real-time transcript buffering and agent streaming via Server-Sent Events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { 
  streamingOrchestrator, 
  type StreamEvent,
  selectPrimaryResponse 
} from '@/lib/streaming-orchestrator';
import { getSessionData } from '@/lib/session-service';

// Store active connections
const activeConnections = new Map<string, {
  controller: ReadableStreamDefaultController;
  sessionId: string;
  lastActivity: Date;
}>();

// Cleanup inactive connections every 5 minutes
setInterval(() => {
  const now = new Date();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [id, connection] of activeConnections.entries()) {
    if (now.getTime() - connection.lastActivity.getTime() > timeout) {
      try {
        connection.controller.close();
      } catch (error) {
        console.error('Error closing inactive connection:', error);
      }
      activeConnections.delete(id);
      streamingOrchestrator.unregisterCallback(connection.sessionId);
    }
  }
}, 5 * 60 * 1000);

/**
 * POST - Add transcript content to buffer
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, transcriptChunk, action } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session exists
    const sessionData = await getSessionData(sessionId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    switch (action) {
      case 'add_transcript':
        if (!transcriptChunk) {
          return NextResponse.json({ error: 'Transcript chunk is required' }, { status: 400 });
        }
        
        // Add to buffer - this will trigger agent processing if needed
        streamingOrchestrator.addTranscriptContent(sessionId, transcriptChunk);
        
        return NextResponse.json({ 
          success: true, 
          bufferStats: streamingOrchestrator.getBufferStats(sessionId)
        });

      case 'force_process':
        // Force processing of current buffer (e.g., on pause or timeout)
        streamingOrchestrator.forceTriggerProcessing(sessionId);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Processing triggered',
          bufferStats: streamingOrchestrator.getBufferStats(sessionId)
        });

      case 'get_context':
        // Get current shared context
        const context = streamingOrchestrator.getSharedContext(sessionId);
        const primaryResponse = context ? selectPrimaryResponse(context) : null;
        
        return NextResponse.json({ 
          success: true, 
          context,
          primaryResponse,
          bufferStats: streamingOrchestrator.getBufferStats(sessionId)
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in streaming API:', error);
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Establish Server-Sent Events connection for real-time streaming
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Session ID is required', { status: 400 });
    }

    // Verify session exists
    const sessionData = await getSessionData(sessionId);
    if (!sessionData) {
      return new Response('Session not found', { status: 404 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const connectionId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store connection
        activeConnections.set(connectionId, {
          controller,
          sessionId,
          lastActivity: new Date()
        });

        // Send initial connection confirmation
        const initialMessage = `data: ${JSON.stringify({
          type: 'connected',
          sessionId,
          timestamp: new Date().toISOString()
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(initialMessage));

        // Register stream callback with orchestrator
        streamingOrchestrator.registerCallback(sessionId, (event: StreamEvent) => {
          try {
            // Update last activity
            const connection = activeConnections.get(connectionId);
            if (connection) {
              connection.lastActivity = new Date();
            }

            // Send event data
            const message = `data: ${JSON.stringify({
              ...event,
              timestamp: event.timestamp.toISOString()
            })}\n\n`;
            
            controller.enqueue(new TextEncoder().encode(message));

            // Send heartbeat if needed
            if (event.type === 'agent_complete') {
              setTimeout(() => {
                if (activeConnections.has(connectionId)) {
                  const heartbeat = `data: ${JSON.stringify({
                    type: 'heartbeat',
                    sessionId,
                    timestamp: new Date().toISOString()
                  })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(heartbeat));
                }
              }, 1000);
            }

          } catch (error) {
            console.error('Error sending stream event:', error);
          }
        });

        // Handle connection cleanup
        const cleanup = () => {
          activeConnections.delete(connectionId);
          streamingOrchestrator.unregisterCallback(sessionId);
        };

        // Set up cleanup on connection close
        request.signal.addEventListener('abort', cleanup);
        
        // Also clean up after 30 minutes maximum
        setTimeout(() => {
          if (activeConnections.has(connectionId)) {
            try {
              controller.close();
            } catch (error) {
              console.error('Error closing long-running connection:', error);
            }
            cleanup();
          }
        }, 30 * 60 * 1000); // 30 minutes
      },

      cancel() {
        // Connection was cancelled by client
        console.log(`Stream cancelled for session ${sessionId}`);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      },
    });

  } catch (error) {
    console.error('Error establishing stream connection:', error);
    return new Response('Failed to establish stream connection', { status: 500 });
  }
}

/**
 * DELETE - Close streaming connection and cleanup
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Clean up all connections for this session
    for (const [connectionId, connection] of activeConnections.entries()) {
      if (connection.sessionId === sessionId) {
        try {
          connection.controller.close();
        } catch (error) {
          console.error('Error closing connection:', error);
        }
        activeConnections.delete(connectionId);
      }
    }

    // Clean up orchestrator
    streamingOrchestrator.clearSession(sessionId);

    return NextResponse.json({ 
      success: true, 
      message: 'Stream connections closed and session cleaned up' 
    });

  } catch (error) {
    console.error('Error closing stream connections:', error);
    return NextResponse.json({
      error: 'Failed to close connections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 