"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface EnhancedVoiceCertificationProps {
  moduleId: string;
  userId?: string;
  onCertificationComplete: (results: any) => void;
  className?: string;
}

interface ConversationMessage {
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
  questionContext?: string;
  responseLength?: number;
  speakingTime?: number;
}

interface ProgressMetrics {
  totalExchanges: number;
  userResponses: number;
  agentQuestions: number;
  totalUserWords: number;
  avgResponseLength: number;
  totalSpeakingTime: number;
  estimatedProgress: number;
  estimatedScore: number;
}

export function EnhancedVoiceCertification({ 
  moduleId, 
  userId, 
  onCertificationComplete,
  className = '' 
}: EnhancedVoiceCertificationProps) {
  console.log('🎯 Enhanced Voice Certification Component Loaded');
  console.log('Module ID:', moduleId);

  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(5);
  const [agentStatus, setAgentStatus] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [sessionId, setSessionId] = useState<string>('');
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics>({
    totalExchanges: 0,
    userResponses: 0,
    agentQuestions: 0,
    totalUserWords: 0,
    avgResponseLength: 0,
    totalSpeakingTime: 0,
    estimatedProgress: 0,
    estimatedScore: 0
  });
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [currentSpeakingStart, setCurrentSpeakingStart] = useState<Date | null>(null);
  const [lastQuestionContext, setLastQuestionContext] = useState<string>('');

  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use the official ElevenLabs React SDK
  const conversationSdk = useConversation({
    onConnect: () => {
      console.log('✅ Connected to certification agent!');
      toast.success('Connected to certification agent!');
      setAgentStatus('speaking');
      setIsSessionActive(true);
      setSessionStartTime(new Date());
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from certification');
      setAgentStatus('listening');
      setIsSessionActive(false);
    },
    onMessage: async (message) => {
      console.log('🤖 Agent message:', message);
      
      if (message.source === 'ai' && message.message) {
        const messageContent = message.message || '';
        const newMessage: ConversationMessage = {
          role: 'agent',
          content: messageContent,
          timestamp: new Date()
        };
        
        setConversation(prev => [...prev, newMessage]);
        setAgentStatus('listening');
        
        // Track questions and update context
        if (messageContent.toLowerCase().includes('question') || 
            messageContent.toLowerCase().includes('tell me') ||
            messageContent.toLowerCase().includes('explain') ||
            messageContent.toLowerCase().includes('describe') ||
            messageContent.toLowerCase().includes('how would you') ||
            messageContent.includes('?')) {
          setQuestionCount(prev => prev + 1);
          setLastQuestionContext(messageContent);
        }

        // Update transcript in backend
        if (sessionId) {
          await updateTranscript(sessionId, messageContent, 'agent_response', lastQuestionContext);
        }
        
             } else if (message.source === 'user' && message.message) {
         const messageContent = message.message || '';
         const speakingTime = currentSpeakingStart ? 
           Math.round((new Date().getTime() - currentSpeakingStart.getTime()) / 1000) : 0;
         
         const newMessage: ConversationMessage = {
           role: 'user',
           content: messageContent,
           timestamp: new Date(),
           questionContext: lastQuestionContext,
           responseLength: messageContent.length,
           speakingTime
         };
         
         setConversation(prev => [...prev, newMessage]);
         setCurrentSpeakingStart(null);
         setAgentStatus('thinking');

         // Update transcript in backend with detailed metrics
         if (sessionId) {
           await updateTranscript(
             sessionId, 
             messageContent, 
             'user_transcript', 
             lastQuestionContext,
             messageContent.length,
             speakingTime
           );

           // Perform enhanced scoring if we have a question context
           if (lastQuestionContext) {
             await performEnhancedScoring(
               sessionId,
               messageContent,
               lastQuestionContext,
               conversation,
               speakingTime,
               messageContent.length
             );
           }
         }
       }
    },
    onError: (error: string) => {
      console.error('❌ Certification error:', error);
      toast.error(`Connection error: ${error}`);
    },
    onModeChange: (mode: { mode: string }) => {
      console.log('🔄 Mode changed:', mode);
      setAgentStatus(mode.mode === 'speaking' ? 'speaking' : 'listening');
      
      // Start speaking timer when user starts speaking
      if (mode.mode === 'listening' && !currentSpeakingStart) {
        setCurrentSpeakingStart(new Date());
      }
    }
  });

  const updateTranscript = async (
    sessionId: string,
    transcript: string,
    messageType: string,
    questionContext?: string,
    responseLength?: number,
    speakingTime?: number
  ) => {
    try {
      const response = await fetch('/api/certification/voice-interview/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          transcript,
          messageType,
          timestamp: new Date().toISOString(),
          questionContext,
          responseLength,
          speakingTime
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProgressMetrics(prev => ({
          ...prev,
          estimatedProgress: data.progress || 0,
          estimatedScore: data.estimatedScore || 0,
          totalExchanges: data.totalExchanges || 0,
          userResponses: data.userResponses || 0
        }));
        setCurrentScore(data.estimatedScore || 0);
      }
    } catch (error) {
      console.error('Failed to update transcript:', error);
    }
  };

  const performEnhancedScoring = async (
    sessionId: string,
    response: string,
    question: string,
    conversationHistory: any[],
    speakingTime?: number,
    responseLength?: number
  ) => {
    try {
      const scoringResponse = await fetch('/api/certification/voice-interview/enhanced-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          response,
          question,
          conversationHistory,
          speakingTime,
          responseLength,
          confidence: Math.min(95, Math.max(50, (responseLength || 0) / 10 + (speakingTime || 0) / 2))
        }),
      });

      if (scoringResponse.ok) {
        const scoreData = await scoringResponse.json();
        setCurrentScore(scoreData.overallScore || 0);
        
        // Show scoring feedback
        if (scoreData.feedback) {
          toast.success(`Score: ${scoreData.score}/${scoreData.maxScore} - ${scoreData.feedback.substring(0, 100)}...`);
        }
        
        return scoreData;
      }
    } catch (error) {
      console.error('Failed to perform enhanced scoring:', error);
    }
  };

  const startCertification = useCallback(async () => {
    try {
      console.log('🎬 Starting enhanced voice certification...');
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Generate session ID
      const newSessionId = `cert-${moduleId}-${Date.now()}`;
      setSessionId(newSessionId);
      
      // Start conversation with agent
      await conversationSdk.startSession({
        agentId: 'agent_01jzk7f85fedsssv51bkehfmg5' // Replace with your actual agent ID
      });
      
      console.log('🎯 Enhanced certification session started!');
      
    } catch (error) {
      console.error('Failed to start certification:', error);
      toast.error('Failed to start certification. Please check microphone permissions.');
    }
  }, [conversationSdk, moduleId]);

  const stopCertification = useCallback(async () => {
    try {
      await conversationSdk.endSession();
      console.log('🏁 Enhanced certification ended');
      
      // Calculate final results
      const finalScore = Math.min(currentScore, 100);
      const passed = finalScore >= 70;
      
      const results = {
        score: finalScore,
        passed,
        questionsAnswered: questionCount,
        conversation: conversation,
        progressMetrics,
        sessionId,
        timeElapsed: sessionStartTime ? 
          Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000) : 0,
        certificationLevel: passed ? 'Certified' : 'Needs Improvement'
      };
      
      if (passed) {
        toast.success(`🎉 Congratulations! You passed with ${finalScore}%`);
      } else {
        toast.error(`📊 Score: ${finalScore}%. You need 70% to pass.`);
      }
      
      onCertificationComplete(results);
      
    } catch (error) {
      console.error('Error ending certification:', error);
      toast.error('Error ending certification');
    }
  }, [conversationSdk, currentScore, questionCount, conversation, progressMetrics, sessionId, sessionStartTime, onCertificationComplete]);

  const getStatusIcon = () => {
    switch (agentStatus) {
      case 'speaking': return <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'thinking': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default: return <Mic className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    switch (agentStatus) {
      case 'speaking': return 'Agent is speaking...';
      case 'thinking': return 'Agent is thinking...';
      default: return 'Listening for your response...';
    }
  };

  const isConnected = conversationSdk.status === 'connected';
  const isConnecting = conversationSdk.status === 'connecting';
  const progressPercentage = Math.min((questionCount / maxQuestions) * 100, 100);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Award className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-blue-800">
              🎯 Enhanced Voice Certification
            </CardTitle>
          </div>
          <p className="text-blue-700">
            Real-time transcript tracking and progress monitoring
          </p>
          
          {/* Engine Image for Marine Training Module */}
          {moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' && (
            <div className="mt-4 flex justify-center">
              <div className="relative w-72 h-48 rounded-lg overflow-hidden border-2 border-blue-200">
                <Image
                  src="/assets/engine-s12r.png"
                  alt="Mitsubishi S12R Engine"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-xs font-semibold bg-blue-600/80 px-2 py-1 rounded">
                    Mitsubishi S12R Engine
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Real-time Progress Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Real-time Progress</span>
              <span className="text-sm text-muted-foreground">
                {progressMetrics.totalExchanges} exchanges
              </span>
            </div>
            <Progress value={progressMetrics.estimatedProgress} className="w-full" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Score: {progressMetrics.estimatedScore}%
                </Badge>
                <Badge variant={progressMetrics.estimatedScore >= 70 ? "default" : "secondary"}>
                  {progressMetrics.estimatedScore >= 70 ? "Passing" : "Below Passing"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  {progressMetrics.userResponses} responses
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getStatusIcon()}
                {getStatusText()}
              </div>
              {sessionStartTime && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000)}s
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Words:</span>
                <span className="font-medium">{progressMetrics.totalUserWords}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Response:</span>
                <span className="font-medium">{progressMetrics.avgResponseLength} words</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Speaking Time:</span>
                <span className="font-medium">{progressMetrics.totalSpeakingTime}s</span>
              </div>
              <div className="flex justify-between">
                <span>Questions:</span>
                <span className="font-medium">{progressMetrics.agentQuestions}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
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
                    Connecting...
                  </>
                ) : (
                  <>
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Start Enhanced Certification
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
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 
                  isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-sm font-medium">
                  {isConnected ? 'Connected' : 
                   isConnecting ? 'Connecting...' : 'Not Connected'}
                </span>
              </div>
              
              {isConnected && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {conversationSdk.isSpeaking ? (
                    <>
                      <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />
                      Agent is speaking
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-green-500" />
                      Agent is listening
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation History */}
      {conversation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Real-time Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    msg.role === 'agent'
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'bg-green-50 border-l-4 border-green-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={msg.role === 'agent' ? 'default' : 'secondary'}>
                      {msg.role === 'agent' ? '🤖 Agent' : '👤 You'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                    {msg.speakingTime && (
                      <span className="text-xs text-muted-foreground">
                        ({msg.speakingTime}s)
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{msg.content}</p>
                  {msg.questionContext && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Context: {msg.questionContext.substring(0, 50)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Enhanced Features:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Real-time transcript tracking and analysis</li>
              <li>• Live progress updates based on engagement</li>
              <li>• Speaking time and response length monitoring</li>
              <li>• ElevenLabs AI scoring integration</li>
              <li>• Detailed analytics and metrics</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 