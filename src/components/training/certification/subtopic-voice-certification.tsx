'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Award,
  PhoneCall,
  MessageCircle,
  Volume2,
  BookOpen,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { getAgentIdForSubtopic, getSubtopicAgentConfig } from '@/lib/subtopic-agents';

interface SubtopicVoiceCertificationProps {
  moduleId: string;
  subtopic: string;
  onCertificationComplete: (results: any) => void;
  className?: string;
}

interface ConversationMessage {
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

interface ProgressData {
  scenariosCompleted: number;
  totalPoints: number;
  currentScore: number;
  totalExchanges: number;
  sessionDuration: number;
}

export function SubtopicVoiceCertification({ 
  moduleId, 
  subtopic,
  onCertificationComplete,
  className = '' 
}: SubtopicVoiceCertificationProps) {
  console.log('🔥🔥🔥 THIS IS THE REAL SUBTOPIC COMPONENT BEING USED');
  console.log('SubtopicVoiceCertification rendered');
  console.log('SubtopicVoiceCertification props:', { moduleId, subtopic, onCertificationComplete, className });
  
  console.log(`🎯 SUBTOPIC VOICE CERTIFICATION: ${subtopic} in module ${moduleId}`);
  
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [maxQuestions] = useState(5);
  const [agentConfig, setAgentConfig] = useState<any>(null);
  // const [progressData, setProgressData] = useState<ProgressData>({
  //   scenariosCompleted: 0,
  //   totalPoints: 0,
  //   currentScore: 0,
  //   totalExchanges: 0,
  //   sessionDuration: 0
  // });
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Timer for session duration tracking only (no auto-pass)
  useEffect(() => {
    if (sessionStartTime && !isSessionComplete) {
      const interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sessionStartTime, isSessionComplete]);

  // Get agent configuration for this subtopic
  useEffect(() => {
    try {
      const config = getSubtopicAgentConfig(moduleId, subtopic);
      setAgentConfig(config);
      console.log(`Agent config for ${subtopic}:`, config);
    } catch (error) {
      console.error('Error getting agent config:', error);
      // Set default configuration using the universal agent
      setAgentConfig({
        agentId: 'agent_01jzk7f85fedsssv51bkehfmg5',
        agentName: 'Universal Training Expert',
        expertise: `${subtopic} specialist`,
        passingScore: 70
      });
    }
  }, [moduleId, subtopic]);

  // Use the official ElevenLabs React SDK
  const conversationSdk = useConversation({
    onConnect: () => {
      console.log('🎯 ON_CONNECT CALLBACK FIRED');
      console.log('Connected to ElevenLabs conversation (subtopic)');
      toast.success(`Connected to ${agentConfig?.agentName || 'Training Expert'}!`);
      setSessionStartTime(new Date());
    },
    onDisconnect: () => {
      console.log('🎯 ON_DISCONNECT CALLBACK FIRED');
      console.log('Disconnected from ElevenLabs conversation (subtopic)');
    },
    onMessage: (message: any) => {
      console.log('🎯 ON_MESSAGE CALLBACK FIRED');
      console.log('Message received:', message);
      
      // Handle different message types based on ElevenLabs React SDK documentation
      if (message.type === 'tentative_transcription') {
        console.log('🎯 Tentative Transcript:', message.formatted?.transcript);
        // Update UI with partial transcript if needed
      } else if (message.type === 'final_transcription') {
        console.log('🎯 Final Transcript:', message.formatted?.transcript);
        const transcriptContent = message.formatted?.transcript || '';
        if (transcriptContent) {
          const newMessage = {
            id: Date.now().toString(),
            content: transcriptContent,
            role: 'user' as const,
            timestamp: new Date()
          };
          setConversation(prev => [...prev, newMessage]);
          updateProgressFromTranscript(transcriptContent, 'user');
        }
        // Set to thinking after user speaks
        setUiAgentState('thinking');
      } else if (message.type === 'llm_response') {
        console.log('🎯 LLM Response:', message.formatted?.transcript);
        const responseContent = message.formatted?.transcript || '';
        if (responseContent) {
          const newMessage = {
            id: Date.now().toString(),
            content: responseContent,
            role: 'agent' as const,
            timestamp: new Date()
          };
          setConversation(prev => [...prev, newMessage]);
          updateProgressFromTranscript(responseContent, 'agent');
        }
        // Agent finished speaking, go back to listening
        setUiAgentState('listening');
      } else if (message.type === 'debug') {
        console.log('🎯 Debug message:', message);
      }
    },
    onModeChange: (mode: { mode: string }) => {
      console.log('🎯 ON_MODE_CHANGE CALLBACK FIRED:', mode);
      // Use mode change for speaking/listening states
      setUiAgentState(mode.mode === 'speaking' ? 'speaking' : 'listening');
    }
  });

  // Get status directly from SDK
  const { status: sdkStatus, isSpeaking } = conversationSdk;
  const [uiAgentState, setUiAgentState] = useState<'listening' | 'speaking' | 'thinking' | 'disconnected' | 'connecting'>('connecting');

  // Sync UI state with SDK status
  useEffect(() => {
    if (sdkStatus === 'connected') {
      setUiAgentState('listening');
    } else if (sdkStatus === 'disconnected') {
      setUiAgentState('disconnected');
    } else if (sdkStatus === 'connecting') {
      setUiAgentState('connecting');
    }
  }, [sdkStatus]);

  // Status helper functions
  const getStatusIcon = (status: string, isSpeaking: boolean) => {
    if (isSpeaking) return <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />;
    if (status === 'thinking') return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    if (status === 'connected') return <Mic className="h-4 w-4 text-green-500" />;
    return <MicOff className="h-4 w-4 text-gray-500" />; // Disconnected or other states
  };

  const getStatusText = (status: string, isSpeaking: boolean, agentName?: string) => {
    if (isSpeaking) return `${agentName || 'Training Expert'} is speaking...`;
    if (status === 'thinking') return `${agentName || 'Training Expert'} is thinking...`;
    if (status === 'connected') return 'Listening for your response...';
    if (status === 'connecting') return 'Connecting...';
    return 'Disconnected.';
  };

  console.log('conversationSdk:', conversationSdk);
  console.log('conversationSdk.status:', conversationSdk.status);
  
  // Log all available properties and methods on the SDK
  console.log('🎯 SDK PROPERTIES:', Object.keys(conversationSdk));
  console.log('🎯 SDK METHODS:', Object.getOwnPropertyNames(Object.getPrototypeOf(conversationSdk)));

  useEffect(() => {
    window.addEventListener('message', (event) => {
      console.log('Window message event:', event);
    });
  }, []);

  const updateProgressFromTranscript = (content: string, role: 'agent' | 'user') => {
    // setProgressData(prev => {
    //   let newData = { ...prev };
    //   // Update total exchanges
    //   newData.totalExchanges = conversation.length + 1;
    //   // Update session duration
    //   if (sessionStartTime) {
    //     newData.sessionDuration = Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000);
    //   }
    //   // Look for scenario completion indicators in agent messages
    //   if (role === 'agent') {
    //     const lowerContent = content.toLowerCase();
    //     if (lowerContent.includes('scenario complete') || 
    //         lowerContent.includes('next scenario') ||
    //         lowerContent.includes('moving to') ||
    //         lowerContent.includes('scenario finished')) {
    //       newData.scenariosCompleted = prev.scenariosCompleted + 1;
    //       toast.success(`✅ Scenario ${prev.scenariosCompleted + 1} completed!`);
    //     }
    //     // Look for scoring information
    //     const scoreMatch = content.match(/(\d+)\s*(?:points?|score)/i);
    //     if (scoreMatch) {
    //       const points = parseInt(scoreMatch[1]);
    //       newData.totalPoints += points;
    //       newData.currentScore = Math.round((newData.totalPoints / (newData.scenariosCompleted * 10)) * 100);
    //       toast.success(`🎯 +${points} points! Total: ${newData.totalPoints}`);
    //     }
    //     // Look for percentage scores
    //     const percentMatch = content.match(/(\d+)%/);
    //     if (percentMatch) {
    //       const score = parseInt(percentMatch[1]);
    //       newData.currentScore = score;
    //     }
    //   }
    //   // Estimate progress based on conversation flow
    //   if (newData.totalExchanges > 0) {
    //     const estimatedScenarios = Math.min(8, Math.max(5, Math.ceil(newData.totalExchanges / 4)));
    //     const progressPercent = Math.min(100, (newData.scenariosCompleted / estimatedScenarios) * 100);
    //     if (newData.scenariosCompleted > 0) {
    //       newData.currentScore = Math.max(newData.currentScore, Math.round(progressPercent));
    //     }
    //   }
    //   console.log('ProgressData updated (subtopic):', newData);
    //   return newData;
    // });
  };

  const startCertification = useCallback(async () => {
    if (!agentConfig) {
      toast.error('Agent configuration not loaded');
      return;
    }

    try {
      console.log(`🎬 Starting ${subtopic} voice certification...`);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start conversation with the configured agent
      await conversationSdk.startSession({
        agentId: agentConfig.agentId
      });
      
      console.log(`🎯 ${subtopic} certification session started with agent: ${agentConfig.agentId}`);
      
    } catch (error) {
      console.error('Failed to start certification:', error);
      toast.error('Failed to start certification. Please check microphone permissions.');
    }
  }, [conversationSdk, agentConfig, subtopic]);

  const stopCertification = useCallback(async () => {
    try {
      await conversationSdk.endSession();
      console.log(`🏁 ${subtopic} certification ended`);
      
      // Simply end the session without showing results
      toast.info('Certification session ended');
      
    } catch (error) {
      console.error('Error ending certification:', error);
      toast.error('Error ending certification');
    }
  }, [conversationSdk, subtopic]);

  const isConnected = sdkStatus === 'connected';
  const isConnecting = sdkStatus === 'connecting';
  // const progressPercentage = Math.min((progressData.scenariosCompleted / 5) * 100, 100);

  console.log('Rendering subtopic certification component', sessionDuration);
  if (!agentConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading certification configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Subtopic Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Award className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-blue-800">
              {agentConfig?.agentName || 'Subtopic Voice Certification'}
            </CardTitle>
          </div>
          <p className="text-blue-700">
            Real-time transcript tracking with ElevenLabs scoring
          </p>
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="bg-white">
              {agentConfig.expertise}
            </Badge>
            <Badge variant="outline" className="bg-white">
              Passing Score: {agentConfig.passingScore}%
            </Badge>
            <Badge variant="outline" className="bg-white">
              {maxQuestions} Questions
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Section - Commented out for now */}
      {/* <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {sessionDuration}s
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Score: 85%
                </Badge>
                <Badge variant="default">
                  Passing
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50">
                  <Award className="h-3 w-3 mr-1" />
                  85 points
                </Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getStatusIcon(sdkStatus, isSpeaking)}
                {getStatusText(sdkStatus, isSpeaking, agentConfig?.agentName)}
              </div>
              {sessionStartTime && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {sessionDuration}s
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Main Certification Interface */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Control Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={startCertification}
                disabled={isConnected || isConnecting}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to {agentConfig.agentName}...
                  </>
                ) : (
                  <>
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Start {subtopic} Certification
                  </>
                )}
              </Button>

              <Button
                onClick={stopCertification}
                disabled={!isConnected}
                variant="destructive"
                size="lg"
              >
                <MicOff className="mr-2 h-4 w-4" />
                End Certification
              </Button>
            </div>

            {/* Session Status */}
            {isConnected && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {getStatusIcon(sdkStatus, isSpeaking)}
                  <span className="font-medium">{getStatusText(sdkStatus, isSpeaking, agentConfig?.agentName)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    Session: {Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Display */}
            {conversation.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Conversation
                </h4>
                <div className="space-y-3">
                                      {conversation.map((msg, index) => (
                     <div key={index} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={msg.role === 'agent' ? 'default' : 'secondary'}>
                          {msg.role === 'agent' ? `🎯 ${agentConfig.agentName}` : '👤 You'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="ml-2 pl-3 border-l-2 border-gray-300 text-gray-700">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {!isConnected && (
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">
                  Ready for {subtopic} Certification? 🎯
                </h4>
                <div className="space-y-2 text-blue-600 text-sm max-w-2xl mx-auto">
                  <p>
                    Click "Start Certification" to begin your voice assessment for this chapter.
                  </p>
                  <p>
                    You'll have a conversation with <strong>{agentConfig.agentName}</strong> who will ask you questions about 
                    <strong> "{subtopic}"</strong> to assess your understanding.
                  </p>
                  <p className="text-xs text-blue-500">
                    Make sure you're in a quiet environment with a good microphone connection.
                  </p>
                </div>
              </div>
            )}

            {/* Technical Details */}
            {!isConnected && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-gray-600 pt-4 border-t">
                <div>
                  <strong>Assessment Format:</strong><br />
                  Voice conversation
                </div>
                <div>
                  <strong>Duration:</strong><br />
                  5-10 minutes
                </div>
                <div>
                  <strong>Passing Score:</strong><br />
                  {agentConfig.passingScore}%
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 