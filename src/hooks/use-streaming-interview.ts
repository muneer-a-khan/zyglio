/**
 * Streaming Interview Hook
 * Manages real-time transcript streaming and agent responses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { StreamEvent, SharedContext } from '@/lib/streaming-orchestrator';

export interface AgentResponse {
  agentType: string;
  content: string;
  isComplete: boolean;
  metadata?: any;
  timestamp: Date;
}

export interface StreamingState {
  connected: boolean;
  agents: Record<string, AgentResponse>;
  sharedContext: SharedContext | null;
  primaryResponse: {
    responseText: string;
    priority: 'validation' | 'clarification' | 'follow-up';
    metadata: any;
  } | null;
  bufferStats: {
    chunkCount: number;
    wordCount: number;
    oldestChunkAge: number;
    hasCompleteChunks: boolean;
  } | null;
}

export interface UseStreamingInterviewOptions {
  sessionId: string;
  onAgentComplete?: (agentType: string, response: AgentResponse) => void;
  onContextUpdate?: (context: SharedContext) => void;
  onPrimaryResponseReady?: (response: any) => void;
  autoReconnect?: boolean;
}

export function useStreamingInterview({
  sessionId,
  onAgentComplete,
  onContextUpdate,
  onPrimaryResponseReady,
  autoReconnect = true
}: UseStreamingInterviewOptions) {
  const [state, setState] = useState<StreamingState>({
    connected: false,
    agents: {},
    sharedContext: null,
    primaryResponse: null,
    bufferStats: null
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Add transcript chunk to buffer
  const addTranscriptChunk = useCallback(async (transcriptChunk: string) => {
    if (!sessionId || !transcriptChunk.trim()) return;

    try {
      const response = await fetch('/api/interview/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcriptChunk,
          action: 'add_transcript'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add transcript chunk: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        bufferStats: data.bufferStats
      }));

    } catch (error) {
      console.error('Error adding transcript chunk:', error);
      setError(error instanceof Error ? error.message : 'Failed to add transcript chunk');
    }
  }, [sessionId]);

  // Force process current buffer
  const forceProcess = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/interview/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'force_process'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to force process: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        bufferStats: data.bufferStats
      }));

    } catch (error) {
      console.error('Error forcing process:', error);
      setError(error instanceof Error ? error.message : 'Failed to force process');
    }
  }, [sessionId]);

  // Get current context
  const getContext = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/interview/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'get_context'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get context: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        sharedContext: data.context,
        primaryResponse: data.primaryResponse,
        bufferStats: data.bufferStats
      }));

      return data;

    } catch (error) {
      console.error('Error getting context:', error);
      setError(error instanceof Error ? error.message : 'Failed to get context');
    }
  }, [sessionId]);

  // Establish SSE connection
  const connect = useCallback(() => {
    if (!sessionId || eventSourceRef.current || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      const eventSource = new EventSource(
        `/api/interview/stream?sessionId=${encodeURIComponent(sessionId)}`
      );

      eventSource.onopen = () => {
        console.log('Streaming connection established');
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        setState(prev => ({ ...prev, connected: true }));
      };

      eventSource.onmessage = (event) => {
        try {
          const streamEvent: StreamEvent = JSON.parse(event.data);
          
          switch (streamEvent.type) {
            case 'connected':
              console.log('Stream connection confirmed');
              break;

            case 'agent_start':
              console.log(`Agent ${streamEvent.agentType} started`);
              setState(prev => ({
                ...prev,
                agents: {
                  ...prev.agents,
                  [streamEvent.agentType!]: {
                    agentType: streamEvent.agentType!,
                    content: '',
                    isComplete: false,
                    timestamp: new Date(streamEvent.timestamp)
                  }
                }
              }));
              break;

            case 'agent_stream':
              setState(prev => ({
                ...prev,
                agents: {
                  ...prev.agents,
                  [streamEvent.agentType!]: {
                    agentType: streamEvent.agentType!,
                    content: streamEvent.content || '',
                    isComplete: false,
                    metadata: streamEvent.metadata,
                    timestamp: new Date(streamEvent.timestamp)
                  }
                }
              }));
              break;

            case 'agent_complete':
              const completedResponse = {
                agentType: streamEvent.agentType!,
                content: streamEvent.content || '',
                isComplete: true,
                metadata: streamEvent.metadata,
                timestamp: new Date(streamEvent.timestamp)
              };

              setState(prev => ({
                ...prev,
                agents: {
                  ...prev.agents,
                  [streamEvent.agentType!]: completedResponse
                }
              }));

              onAgentComplete?.(streamEvent.agentType!, completedResponse);
              break;

            case 'context_update':
              const updatedContext = streamEvent.metadata?.updatedContext;
              if (updatedContext) {
                setState(prev => ({
                  ...prev,
                  sharedContext: updatedContext
                }));
                onContextUpdate?.(updatedContext);
                
                // Check if we should notify about primary response
                if (streamEvent.metadata?.agentType === 'follow-up') {
                  getContext().then(data => {
                    if (data?.primaryResponse) {
                      onPrimaryResponseReady?.(data.primaryResponse);
                    }
                  });
                }
              }
              break;

            case 'error':
              console.error('Stream error:', streamEvent.content);
              setError(streamEvent.content || 'Stream error');
              break;

            case 'heartbeat':
              // Just acknowledge heartbeat
              break;

            default:
              console.log('Unknown stream event:', streamEvent);
          }
        } catch (error) {
          console.error('Error parsing stream event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setIsConnecting(false);
        setState(prev => ({ ...prev, connected: false }));
        
        eventSource.close();
        eventSourceRef.current = null;
        
        // Attempt reconnection if enabled
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          console.log(`Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Connection lost and unable to reconnect');
        }
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('Error establishing connection:', error);
      setIsConnecting(false);
      setError(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [sessionId, isConnecting, autoReconnect, onAgentComplete, onContextUpdate, onPrimaryResponseReady, getContext]);

  // Disconnect
  const disconnect = useCallback(async () => {
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({ ...prev, connected: false }));

    // Clean up server-side resources
    if (sessionId) {
      try {
        await fetch('/api/interview/stream', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
      } catch (error) {
        console.error('Error cleaning up server connection:', error);
      }
    }
  }, [sessionId]);

  // Auto-connect on mount and sessionId change
  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId]); // Only depend on sessionId, not connect/disconnect to avoid loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    // State
    connected: state.connected,
    isConnecting,
    error,
    agents: state.agents,
    sharedContext: state.sharedContext,
    primaryResponse: state.primaryResponse,
    bufferStats: state.bufferStats,
    
    // Actions
    addTranscriptChunk,
    forceProcess,
    getContext,
    connect,
    disconnect,
    
    // Utils
    clearError: () => setError(null),
    getAgentResponse: (agentType: string) => state.agents[agentType],
    isAgentActive: (agentType: string) => state.agents[agentType] && !state.agents[agentType].isComplete
  };
} 