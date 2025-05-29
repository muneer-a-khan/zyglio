/**
 * Streaming Interview Component
 * Real-time interview with streaming agents and transcript buffering
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  MessageSquare,
  Activity,
  Wifi,
  WifiOff,
  Brain
} from 'lucide-react';
import { useStreamingInterview } from '@/hooks/use-streaming-interview';
import type { AgentResponse, SharedContext } from '@/hooks/use-streaming-interview';

interface StreamingInterviewProps {
  sessionId: string;
  procedureTitle: string;
  initialContext: string;
  onInterviewComplete?: (finalResponse: string) => void;
}

export default function StreamingInterview({
  sessionId,
  procedureTitle,
  initialContext,
  onInterviewComplete
}: StreamingInterviewProps) {
  // Streaming hook
  const {
    connected,
    isConnecting,
    error,
    agents,
    sharedContext,
    primaryResponse,
    bufferStats,
    addTranscriptChunk,
    forceProcess,
    getContext,
    clearError,
    getAgentResponse,
    isAgentActive
  } = useStreamingInterview({
    sessionId,
    onAgentComplete: (agentType, response) => {
      console.log(`Agent ${agentType} completed:`, response);
    },
    onContextUpdate: (context) => {
      console.log('Context updated:', context);
    },
    onPrimaryResponseReady: (response) => {
      console.log('Primary response ready:', response);
      // Could trigger TTS here
    }
  });

  // Local state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalQuestion, setFinalQuestion] = useState<string | null>(null);
  
  // Refs for speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecognitionActiveRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Update local transcript display
        setTranscript(finalTranscript + interimTranscript);

        // Send final transcripts to buffer immediately
        if (finalTranscript.trim()) {
          addTranscriptChunk(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        isRecognitionActiveRef.current = false;
      };

      recognition.onend = () => {
        setIsRecording(false);
        isRecognitionActiveRef.current = false;
        
        // Force process any remaining content when recording stops
        if (transcript.trim()) {
          forceProcess();
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current && isRecognitionActiveRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [addTranscriptChunk, forceProcess, transcript]);

  // Start/stop recording
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
      isRecognitionActiveRef.current = true;
    }
  };

  // Force process current buffer
  const handleForceProcess = () => {
    forceProcess();
  };

  // Get agent status icon
  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'validation': return <AlertTriangle className="w-4 h-4" />;
      case 'clarification': return <HelpCircle className="w-4 h-4" />;
      case 'follow-up': return <MessageSquare className="w-4 h-4" />;
      case 'topic-analysis': return <Activity className="w-4 h-4" />;
      case 'topic-discovery': return <Brain className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Get agent color
  const getAgentColor = (agentType: string, isActive: boolean) => {
    if (isActive) return 'bg-blue-100 text-blue-800 border-blue-200';
    
    switch (agentType) {
      case 'validation': return 'bg-red-50 text-red-700 border-red-200';
      case 'clarification': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'follow-up': return 'bg-green-50 text-green-700 border-green-200';
      case 'topic-analysis': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'topic-discovery': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Streaming Interview: {procedureTitle}
        </h1>
        <p className="text-gray-600">{initialContext}</p>
      </div>

      {/* Connection Status */}
      <Card className={`border-2 ${connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${connected ? 'text-green-800' : 'text-red-800'}`}>
                {isConnecting ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {bufferStats && (
              <div className="text-sm text-gray-600">
                Buffer: {bufferStats.wordCount} words, {bufferStats.chunkCount} chunks
                {bufferStats.hasCompleteChunks && (
                  <Badge variant="outline" className="ml-2">Ready to Process</Badge>
                )}
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-700 text-sm">
              {error}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearError}
                className="ml-2 h-6 px-2"
              >
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="flex items-center gap-2"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            
            <Button
              onClick={handleForceProcess}
              variant="outline"
              disabled={!bufferStats?.wordCount}
            >
              Force Process Buffer
            </Button>
          </div>
          
          {transcript && (
            <div className="p-3 bg-gray-50 border rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current transcript:</p>
              <p className="text-gray-900">{transcript}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Responses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(agents).map(([agentType, response]) => (
          <Card 
            key={agentType}
            className={`border-2 ${getAgentColor(agentType, isAgentActive(agentType))}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getAgentIcon(agentType)}
                {agentType.charAt(0).toUpperCase() + agentType.slice(1).replace('-', ' ')}
                {isAgentActive(agentType) && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs text-blue-600">Thinking...</span>
                  </div>
                )}
                {response.isComplete && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                {response.content && (
                  <div className="p-2 bg-white rounded border">
                    {response.content}
                  </div>
                )}
                
                {response.metadata && Object.keys(response.metadata).length > 0 && (
                  <div className="text-xs text-gray-500">
                    <details>
                      <summary className="cursor-pointer">Metadata</summary>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(response.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Primary Response */}
      {primaryResponse && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <MessageSquare className="w-5 h-5" />
              AI Response ({primaryResponse.priority})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-lg border">
              <p className="text-gray-900">{primaryResponse.responseText}</p>
            </div>
            
            {primaryResponse.metadata && (
              <div className="mt-3 text-xs text-blue-600">
                <details>
                  <summary className="cursor-pointer">Response Metadata</summary>
                  <pre className="mt-1 p-2 bg-blue-100 rounded text-xs overflow-auto">
                    {JSON.stringify(primaryResponse.metadata, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shared Context Debug */}
      {sharedContext && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Debug: Shared Context</CardTitle>
          </CardHeader>
          <CardContent>
            <details>
              <summary className="cursor-pointer text-sm">View Raw Context</summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(sharedContext, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 