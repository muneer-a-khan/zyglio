// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

export class SSEService {
  static addConnection(connectionId: string, controller: ReadableStreamDefaultController) {
    connections.set(connectionId, controller);
  }

  static removeConnection(connectionId: string) {
    connections.delete(connectionId);
  }

  // Function to broadcast updates to all connected clients for a task
  static broadcastProcessingUpdate(
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
  static broadcastProcessingComplete(
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
} 