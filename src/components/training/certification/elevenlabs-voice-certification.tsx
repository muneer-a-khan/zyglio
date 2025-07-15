"use client";

import { useState, useCallback } from 'react';
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
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface ElevenLabsVoiceCertificationProps {
  moduleId: string;
  userId?: string;
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

export function ElevenLabsVoiceCertification({ 
  moduleId, 
  userId, 
  onCertificationComplete,
  className = '' 
}: ElevenLabsVoiceCertificationProps) {
  console.log('🏀 BASKETBALL VOICE CERTIFICATION COMPONENT LOADED - OFFICIAL SDK VERSION');
  console.log('Module ID:', moduleId);
  console.log('Basketball Agent ID: agent_01jzk7f85fedsssv51bkehfmg5');

  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(5);
  const [agentStatus, setAgentStatus] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [progressData, setProgressData] = useState<ProgressData>({
    scenariosCompleted: 0,
    totalPoints: 0,
    currentScore: 0,
    totalExchanges: 0,
    sessionDuration: 0
  });
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Use the official ElevenLabs React SDK
  const conversationSdk = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs conversation');
      toast.success('Connected to Coach Alex!');
      setAgentStatus('speaking');
      setSessionStartTime(new Date());
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs conversation');
      setAgentStatus('listening');
    },
    onMessage: (message: any) => {
      const messageContent = (typeof message.message === 'string' ? message.message : '') || (typeof message.text === 'string' ? message.text : '');
      console.log('Agent message content:', messageContent, message);
      
      if ((message.type && message.type === 'agent_response') || (message.source === 'ai' && messageContent)) {
        const newMessage: ConversationMessage = {
          role: 'agent',
          content: messageContent,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, newMessage]);
        setAgentStatus('listening');
        updateProgressFromTranscript(messageContent, 'agent');
        
        // Track questions and simulate scoring
        if (messageContent.toLowerCase().includes('scenario') || 
            messageContent.toLowerCase().includes('question')) {
          setQuestionCount(prev => prev + 1);
        }
      } else if ((message.type && message.type === 'user_transcript') || (message.source === 'user' && messageContent)) {
        const newMessage: ConversationMessage = {
          role: 'user',
          content: messageContent,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, newMessage]);
        setAgentStatus('thinking');
        updateProgressFromTranscript(messageContent, 'user');
      }
    },
    onError: (error) => {
      console.error('❌ Basketball certification error:', error);
      toast.error(`Connection error: ${error}`);
    },
    onModeChange: (mode: { mode: string }) => {
      console.log('🔄 Mode changed:', mode);
      setAgentStatus(mode.mode === 'speaking' ? 'speaking' : 'listening');
    }
  });

  const updateProgressFromTranscript = (content: string, role: 'agent' | 'user') => {
    setProgressData(prev => {
      let newData = { ...prev };
      // Update total exchanges
      newData.totalExchanges = conversation.length + 1;
      // Update session duration
      if (sessionStartTime) {
        newData.sessionDuration = Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000);
      }
      // Look for scenario completion indicators in agent messages
      if (role === 'agent') {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('scenario complete') || 
            lowerContent.includes('next scenario') ||
            lowerContent.includes('moving to') ||
            lowerContent.includes('scenario finished')) {
          newData.scenariosCompleted = prev.scenariosCompleted + 1;
          toast.success(`✅ Scenario ${prev.scenariosCompleted + 1} completed!`);
        }
        // Look for scoring information
        const scoreMatch = content.match(/(\d+)\s*(?:points?|score)/i);
        if (scoreMatch) {
          const points = parseInt(scoreMatch[1]);
          newData.totalPoints += points;
          newData.currentScore = Math.round((newData.totalPoints / (newData.scenariosCompleted * 10)) * 100);
          toast.success(`🎯 +${points} points! Total: ${newData.totalPoints}`);
        }
        // Look for percentage scores
        const percentMatch = content.match(/(\d+)%/);
        if (percentMatch) {
          const score = parseInt(percentMatch[1]);
          newData.currentScore = score;
        }
      }
      // Estimate progress based on conversation flow
      if (newData.totalExchanges > 0) {
        const estimatedScenarios = Math.min(8, Math.max(5, Math.ceil(newData.totalExchanges / 4)));
        const progressPercent = Math.min(100, (newData.scenariosCompleted / estimatedScenarios) * 100);
        if (newData.scenariosCompleted > 0) {
          newData.currentScore = Math.max(newData.currentScore, Math.round(progressPercent));
        }
      }
      console.log('ProgressData updated:', newData);
      return newData;
    });
  };

  const startCertification = useCallback(async () => {
    try {
      console.log('🎬 Starting basketball voice certification...');
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start conversation with basketball agent
      await conversationSdk.startSession({
        agentId: 'agent_01jzk7f85fedsssv51bkehfmg5'
      });
      
      console.log('🏀 Basketball certification session started!');
      
    } catch (error) {
      console.error('Failed to start basketball certification:', error);
      toast.error('Failed to start certification. Please check microphone permissions.');
    }
  }, [conversationSdk]);

  const stopCertification = useCallback(async () => {
    try {
      await conversationSdk.endSession();
      console.log('🏁 Basketball certification ended');
      
      // Calculate final results
      const finalScore = Math.min(currentScore, 100);
      const passed = finalScore >= 70;
      
      const results = {
        score: finalScore,
        passed,
        questionsAnswered: questionCount,
        conversation: conversation,
        certificationLevel: passed ? 'Basketball Certified' : 'Needs Improvement'
      };
      
      if (passed) {
        toast.success(`🏀 Congratulations! You passed with ${finalScore}%`);
      } else {
        toast.error(`🏀 Score: ${finalScore}%. You need 70% to pass.`);
      }
      
      onCertificationComplete(results);
      
    } catch (error) {
      console.error('Error ending basketball certification:', error);
      toast.error('Error ending certification');
    }
  }, [conversationSdk, currentScore, questionCount, conversation, onCertificationComplete]);

  const handleManualComplete = () => {
    // For testing - manually complete certification
    const results = {
      score: 85,
      passed: true,
      questionsAnswered: 5,
      conversation: conversation,
      certificationLevel: 'Basketball Certified'
    };
    
    toast.success('🏀 Basketball Certification Complete! (Manual)');
    onCertificationComplete(results);
  };

  const getStatusIcon = () => {
    switch (agentStatus) {
      case 'speaking': return <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'thinking': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default: return <Mic className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    switch (agentStatus) {
      case 'speaking': return 'Coach Alex is speaking...';
      case 'thinking': return 'Coach Alex is thinking...';
      default: return 'Listening for your response...';
    }
  };

  const isConnected = conversationSdk.status === 'connected';
  const isConnecting = conversationSdk.status === 'connecting';
  const progressPercentage = Math.min((progressData.scenariosCompleted / 5) * 100, 100);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header - Marine Engine or Basketball */}
      {moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Award className="h-8 w-8 text-blue-600" />
              <CardTitle className="text-2xl font-bold text-blue-800">
                🚢 Marine Engine Voice Certification
              </CardTitle>
            </div>
            <p className="text-blue-700">
              Chat with Engine Expert to demonstrate your Mitsubishi S12R knowledge
            </p>
            
            {/* Engine Image for Marine Training Module */}
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
          </CardHeader>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Award className="h-8 w-8 text-orange-600" />
              <CardTitle className="text-2xl font-bold text-orange-800">
                🏀 Basketball Voice Certification
              </CardTitle>
            </div>
            <p className="text-orange-700">
              Chat with Coach Alex to demonstrate your basketball knowledge
            </p>
          </CardHeader>
        </Card>
      )}

      {/* Progress Section - Commented out for now */}
      {/* <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {progressData.scenariosCompleted}/5 scenarios
              </span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Score: {progressData.currentScore}%
                </Badge>
                <Badge variant={progressData.currentScore >= 70 ? "default" : "secondary"}>
                  {progressData.currentScore >= 70 ? "Passing" : "Below Passing"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50">
                  <Award className="h-3 w-3 mr-1" />
                  {progressData.totalPoints} points
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
                  {progressData.sessionDuration}s
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Connection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4 justify-center">
              <Button
                onClick={startCertification}
                disabled={isConnected || isConnecting}
                size="lg"
                className={moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? 
                  "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? 
                      "Connecting to Engine Expert..." : "Connecting to Coach Alex..."}
                  </>
                ) : (
                  <>
                    <PhoneCall className="mr-2 h-4 w-4" />
                    {moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? 
                      "Start Engine Certification" : "Start Basketball Certification"}
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

            {/* Agent Status */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 
                  isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-sm font-medium">
                  {isConnected ? 
                    (moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? 
                      'Connected to Engine Expert' : 'Connected to Coach Alex') : 
                   isConnecting ? 'Connecting...' : 'Not Connected'}
                </span>
              </div>
              
              {isConnected && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {conversationSdk.isSpeaking ? (
                    <>
                      <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />
                      {moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? 
                        'Engine Expert is speaking' : 'Coach Alex is speaking'}
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-green-500" />
                      {moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? 
                        'Engine Expert is listening' : 'Coach Alex is listening'}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Test Button */}
            <div className="text-center">
              <Button
                onClick={handleManualComplete}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Test Complete Certification
              </Button>
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
              Certification Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    msg.role === 'agent'
                      ? 'bg-orange-50 border-l-4 border-orange-500'
                      : 'bg-blue-50 border-l-4 border-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={msg.role === 'agent' ? 'default' : 'secondary'}>
                      {msg.role === 'agent' ? 
                        (moduleId === '56178fd2-8106-4b4f-8567-0217fac890f2' ? 
                          '🚢 Engine Expert' : '🏀 Coach Alex') : '👤 You'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
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
              How it works:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Click "Start Basketball Certification" to connect to Coach Alex</li>
              <li>• Speak clearly about basketball concepts and scenarios</li>
              <li>• Answer 5 scenarios to complete your certification</li>
              <li>• You need 70% or higher to pass</li>
              <li>• Your conversation is analyzed in real-time</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 