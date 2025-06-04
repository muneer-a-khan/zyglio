import { useEffect, useRef, useState } from 'react';

export interface ProcessingUpdate {
  type: 'connected' | 'processing_update' | 'processing_complete';
  taskId: string;
  mediaItemId?: string;
  status?: string;
  progress?: number;
  stage?: string;
  filename?: string;
  summary?: string;
  keyTopics?: string[];
  errorMessage?: string;
  timestamp: string;
}

export interface ProcessingStatus {
  [mediaItemId: string]: {
    status: string;
    progress: number;
    stage: string;
    filename: string;
    summary?: string;
    keyTopics?: string[];
    errorMessage?: string;
    lastUpdated: string;
  };
}

export function useProcessingSSE(taskId: string | null) {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!taskId) return;

    // Create SSE connection
    const eventSource = new EventSource(`/api/sse/media-processing?taskId=${taskId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
      setConnectionError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: ProcessingUpdate = JSON.parse(event.data);
        console.log('Received SSE update:', update);

        switch (update.type) {
          case 'connected':
            setIsConnected(true);
            break;

          case 'processing_update':
            if (update.mediaItemId) {
              setProcessingStatus(prev => ({
                ...prev,
                [update.mediaItemId!]: {
                  status: update.status || 'unknown',
                  progress: update.progress || 0,
                  stage: update.stage || '',
                  filename: update.filename || 'Unknown file',
                  summary: update.summary,
                  keyTopics: update.keyTopics,
                  errorMessage: update.errorMessage,
                  lastUpdated: update.timestamp
                }
              }));
            }
            break;

          case 'processing_complete':
            // Handle completion summary if needed
            console.log('Processing complete:', update);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
      setConnectionError('Connection lost');
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log('Attempting to reconnect SSE...');
          // The useEffect will handle reconnection when it re-runs
        }
      }, 3000);
    };

    // Cleanup on unmount or taskId change
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [taskId]);

  // Function to manually reconnect
  const reconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setConnectionError(null);
    // The useEffect will handle reconnection when it re-runs
  };

  return {
    processingStatus,
    isConnected,
    connectionError,
    reconnect
  };
} 