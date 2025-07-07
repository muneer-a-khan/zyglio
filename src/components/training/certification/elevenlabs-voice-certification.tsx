"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, Pause, Square, CheckCircle, AlertCircle, Clock, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ScenarioAgent {
  id: string;
  agentId: string;
  scenarioId: string;
  name: string;
  isActive: boolean;
}

interface ElevenLabsVoiceCertificationProps {
  moduleId: string;
  scenarios: Array<{
    id: string;
    title: string;
    description: string;
    maxQuestions: number;
    passingScore: number;
  }>;
  onCertificationComplete: (results: any) => void;
  className?: string;
}

export default function ElevenLabsVoiceCertification({
  moduleId,
  scenarios,
  onCertificationComplete,
  className
}: ElevenLabsVoiceCertificationProps) {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'checking' | 'missing' | 'creating' | 'ready' | 'error'>('checking');
  const [scenarioAgents, setScenarioAgents] = useState<Record<string, ScenarioAgent>>({});
  const [currentAgent, setCurrentAgent] = useState<ScenarioAgent | null>(null);
  const [scenarioResults, setScenarioResults] = useState<Record<string, any>>({});
  const [overallScore, setOverallScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentScenario = scenarios[currentScenarioIndex];

  // Initialize certification session
  useEffect(() => {
    initializeSession();
  }, []);

  // Check/create agents for all scenarios
  useEffect(() => {
    if (sessionId) {
      checkAndCreateAgentsForAllScenarios();
    }
  }, [sessionId]);

  // Set current agent when scenario changes
  useEffect(() => {
    if (currentScenario && scenarioAgents[currentScenario.id]) {
      setCurrentAgent(scenarioAgents[currentScenario.id]);
      setAgentStatus('ready');
    } else if (currentScenario) {
      setAgentStatus('missing');
    }
  }, [currentScenario, scenarioAgents]);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/certification/elevenlabs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          moduleId,
          scenarios: scenarios.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start certification session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setAgentStatus('error');
    }
  };

  const checkAndCreateAgentsForAllScenarios = async () => {
    const agents: Record<string, ScenarioAgent> = {};
    
    for (const scenario of scenarios) {
      try {
        setAgentStatus('checking');
        
        // Check if agent exists for this scenario
        const checkResponse = await fetch(`/api/elevenlabs/agents?moduleId=${moduleId}&scenarioId=${scenario.id}`);
        const checkData = await checkResponse.json();

        if (checkData.agent && checkData.agent.isActive) {
          // Agent exists
          agents[scenario.id] = checkData.agent;
        } else {
          // Create agent for this scenario
          setAgentStatus('creating');
          
          const createResponse = await fetch('/api/elevenlabs/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              moduleId,
              scenarioId: scenario.id,
              scenarioData: {
                title: scenario.title,
                description: scenario.description,
                difficulty: 'NORMAL'
              }
            })
          });

          if (!createResponse.ok) {
            throw new Error(`Failed to create agent for scenario: ${scenario.title}`);
          }

          const createData = await createResponse.json();
          agents[scenario.id] = createData.agent;
        }
      } catch (error) {
        console.error(`Error setting up agent for scenario ${scenario.title}:`, error);
        setAgentStatus('error');
        return;
      }
    }

    setScenarioAgents(agents);
    setAgentStatus('ready');
  };

  const startConversation = async () => {
    if (!currentAgent || !sessionId) return;

    try {
      // Get WebSocket URL from ElevenLabs service
      const response = await fetch('/api/elevenlabs/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: currentAgent.agentId,
          sessionId,
          scenarioId: currentScenario.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const { signedUrl } = await response.json();

      // Connect to WebSocket
      wsRef.current = new WebSocket(signedUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to ElevenLabs WebSocket');
        setIsConnected(true);
        // Clear conversation for new scenario
        setConversation([]);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      wsRef.current.onclose = () => {
        console.log('Disconnected from ElevenLabs WebSocket');
        setIsConnected(false);
        setIsRecording(false);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsRecording(false);
      };

    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'conversation.agent_response':
        if (data.agent_response_text) {
          addMessage('assistant', data.agent_response_text);
        }
        break;
      
      case 'conversation.user_transcript':
        if (data.user_transcript) {
          addMessage('user', data.user_transcript);
        }
        break;
      
      case 'conversation.interruption':
        console.log('Conversation interrupted');
        break;
      
      case 'conversation.response_generated':
        // Handle scoring data if included
        if (data.response_data) {
          handleScoreUpdate(data.response_data);
        }
        break;
    }
  };

  const handleScoreUpdate = (scoreData: any) => {
    if (scoreData.scenarioScore !== undefined) {
      setScenarioResults(prev => ({
        ...prev,
        [currentScenario.id]: {
          ...prev[currentScenario.id],
          score: scoreData.scenarioScore,
          completed: scoreData.scenarioScore >= currentScenario.passingScore
        }
      }));
    }

    if (scoreData.overallScore !== undefined) {
      setOverallScore(scoreData.overallScore);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setConversation(prev => [...prev, {
      role,
      content,
      timestamp: new Date()
    }]);
  };

  const startRecording = async () => {
    if (!isConnected || !wsRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        sendAudioToWebSocket(audioBlob);
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all audio tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const sendAudioToWebSocket = (audioBlob: Blob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      audioBlob.arrayBuffer().then(buffer => {
        const message = {
          user_audio_chunk: Array.from(new Uint8Array(buffer))
        };
        wsRef.current?.send(JSON.stringify(message));
      });
    }
  };

  const endScenario = async () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Move to next scenario or complete certification
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
      setIsConnected(false);
    } else {
      // Complete certification
      await completeCertification();
    }
  };

  const completeCertification = async () => {
    try {
      const response = await fetch('/api/certification/elevenlabs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          scenarioResults,
          overallScore
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete certification');
      }

      const results = await response.json();
      setIsCompleted(true);
      onCertificationComplete(results);
    } catch (error) {
      console.error('Failed to complete certification:', error);
    }
  };

  const getScenarioStatus = (scenarioId: string) => {
    const result = scenarioResults[scenarioId];
    if (!result) return 'pending';
    return result.completed ? 'completed' : 'in-progress';
  };

  if (agentStatus === 'checking' || agentStatus === 'creating') {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            {agentStatus === 'checking' ? 'Checking Certification Agents...' : 'Creating Scenario Agents...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {agentStatus === 'checking' 
                ? 'Verifying that all scenario agents are ready for your certification...'
                : 'Setting up specialized agents for each certification scenario. This may take a moment...'
              }
            </p>
            
            <div className="space-y-2">
              {scenarios.map((scenario, index) => (
                <div key={scenario.id} className="flex items-center gap-2 p-2 border rounded">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    scenarioAgents[scenario.id] ? "bg-green-500" : "bg-gray-300"
                  )} />
                  <span className="text-sm">{scenario.title}</span>
                  {scenarioAgents[scenario.id] && (
                    <Badge variant="secondary" className="ml-auto">Ready</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (agentStatus === 'error') {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Setup Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Failed to set up certification agents. Please try again.
          </p>
          <Button onClick={checkAndCreateAgentsForAllScenarios} variant="outline">
            Retry Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isCompleted) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Certification Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {overallScore}%
              </div>
              <p className="text-muted-foreground">Overall Score</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Scenario Results:</h3>
              {scenarios.map(scenario => {
                const result = scenarioResults[scenario.id];
                return (
                  <div key={scenario.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{scenario.title}</span>
                    <Badge variant={result?.completed ? "success" : "destructive"}>
                      {result?.score || 0}% {result?.completed ? "✓" : "✗"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Voice Certification</span>
          <Badge variant="outline">
            Scenario {currentScenarioIndex + 1} of {scenarios.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Progress */}
        <div className="space-y-3">
          <h3 className="font-semibold">Certification Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {scenarios.map((scenario, index) => {
              const status = getScenarioStatus(scenario.id);
              const isCurrent = index === currentScenarioIndex;
              
              return (
                <div key={scenario.id} className={cn(
                  "p-2 border rounded text-sm",
                  isCurrent && "border-primary bg-primary/5",
                  status === 'completed' && "border-green-500 bg-green-50",
                  status === 'in-progress' && "border-yellow-500 bg-yellow-50"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'completed' && "bg-green-500",
                      status === 'in-progress' && "bg-yellow-500",
                      status === 'pending' && "bg-gray-300"
                    )} />
                    <span className="font-medium truncate">{scenario.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Scenario */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-blue-900 mb-2">
              Current Scenario: {currentScenario.title}
            </h3>
            <p className="text-blue-700 text-sm">
              {currentScenario.description}
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
              isConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-gray-400"
              )} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            {!isConnected && (
              <Button onClick={startConversation} size="sm">
                Start Scenario
              </Button>
            )}
          </div>

          {/* Voice Controls */}
          {isConnected && (
            <div className="flex items-center gap-4">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className="px-8"
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={endScenario}>
                {currentScenarioIndex < scenarios.length - 1 ? 'Next Scenario' : 'Complete Certification'}
              </Button>
            </div>
          )}
        </div>

        {/* Conversation Display */}
        {conversation.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
            <h3 className="font-semibold sticky top-0 bg-white pb-2">Conversation</h3>
            {conversation.map((message, index) => (
              <div key={index} className={cn(
                "flex gap-3 p-3 rounded-lg",
                message.role === 'user' ? "bg-blue-50 ml-8" : "bg-gray-50 mr-8"
              )}>
                <div className="flex-shrink-0">
                  {message.role === 'user' ? (
                    <User className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Bot className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{message.content}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 