"use client";

import { useState, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Award,
  PhoneCall,
  MessageCircle,
  Volume2,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface SimpleTranscriptTrackerProps {
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

export function SimpleTranscriptTracker({ 
  moduleId, 
  userId, 
  onCertificationComplete,
  className = '' 
}: SimpleTranscriptTrackerProps) {
  console.log('SimpleTranscriptTracker mounted');
  console.log('🎯 Simple Transcript Tracker - Reading ElevenLabs Data');
  console.log('Module ID:', moduleId);

  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [agentStatus, setAgentStatus] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [progressData, setProgressData] = useState<ProgressData>({
    scenariosCompleted: 0,
    totalPoints: 0,
    currentScore: 0,
    totalExchanges: 0,
    sessionDuration: 0
  });

  // Use the official ElevenLabs React SDK
  const conversationSdk = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs conversation');
      toast.success('Connected to certification agent!');
      setAgentStatus('speaking');
      setIsSessionActive(true);
      setSessionStartTime(new Date());
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs conversation');
      setAgentStatus('listening');
      setIsSessionActive(false);
    },
    onMessage: (message: any) => {
      console.log('onMessage fired:', message);
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
        
        // Check if this is a scenario completion or scoring message
        updateProgressFromTranscript(messageContent, 'agent');
        
      } else if ((message.type && message.type === 'user_transcript') || (message.source === 'user' && messageContent)) {
        const newMessage: ConversationMessage = {
          role: 'user',
          content: messageContent,
          timestamp: new Date()
        };
        
        setConversation(prev => [...prev, newMessage]);
        setAgentStatus('thinking');

        // Update progress based on user response
        updateProgressFromTranscript(messageContent, 'user');
      }
    },
    onError: (error) => {
      console.error('❌ ElevenLabs error:', error);
      toast.error(`Connection error: ${error.message}`);
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
        
        // Check for scenario completion phrases
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
        // Assume 5-8 scenarios for certification
        const estimatedScenarios = Math.min(8, Math.max(5, Math.ceil(newData.totalExchanges / 4)));
        const progressPercent = Math.min(100, (newData.scenariosCompleted / estimatedScenarios) * 100);
        
        // Update progress if we have scenario data
        if (newData.scenariosCompleted > 0) {
          newData.currentScore = Math.max(newData.currentScore, Math.round(progressPercent));
        }
      }

      return newData;
    });
  };

  const startCertification = useCallback(async () => {
    try {
      console.log('Starting ElevenLabs certification...');
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start conversation with ElevenLabs agent
      await conversationSdk.startSession({
        agentId: 'agent_01jzk7f85fedsssv51bkehfmg5' // Replace with your actual agent ID
      });
      
      console.log('ElevenLabs certification session started!');
      
    } catch (error) {
      console.error('Failed to start certification:', error);
      toast.error('Failed to start certification. Please check microphone permissions.');
    }
  }, [conversationSdk]);

  const stopCertification = useCallback(async () => {
    try {
      await conversationSdk.endSession();
      console.log('ElevenLabs certification ended');
      
      // Calculate final results from transcript data
      const finalScore = progressData.currentScore;
      const passed = finalScore >= 70;
      
      const results = {
        score: finalScore,
        passed,
        scenariosCompleted: progressData.scenariosCompleted,
        totalPoints: progressData.totalPoints,
        conversation: conversation,
        sessionDuration: progressData.sessionDuration,
        totalExchanges: progressData.totalExchanges,
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
  }, [conversationSdk, progressData, conversation, onCertificationComplete]);

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
  const progressPercentage = Math.min((progressData.scenariosCompleted / 5) * 100, 100);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Award className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-blue-800">
              🎯 ElevenLabs Voice Certification
            </CardTitle>
          </div>
          <p className="text-blue-700">
            Real-time transcript tracking with ElevenLabs scoring
          </p>
        </CardHeader>
      </Card>

      {/* Progress Section */}
      <Card>
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
      </Card>

      {/* Session Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Exchanges:</span>
                <span className="font-medium">{progressData.totalExchanges}</span>
              </div>
              <div className="flex justify-between">
                <span>Scenarios Done:</span>
                <span className="font-medium">{progressData.scenariosCompleted}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Points:</span>
                <span className="font-medium">{progressData.totalPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Session Time:</span>
                <span className="font-medium">{progressData.sessionDuration}s</span>
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
                    Start Certification
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
                  {isConnected ? 'Connected to ElevenLabs' : 
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

      {/* Live Transcript */}
      {conversation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Live Transcript
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
                      {msg.role === 'agent' ? '🤖 ElevenLabs' : '👤 You'}
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
              <Award className="h-4 w-4" />
              How it works:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• ElevenLabs handles all scoring and metrics</li>
              <li>• Progress bar updates based on transcript analysis</li>
              <li>• Scenarios and points extracted from agent responses</li>
              <li>• Real-time progress tracking without duplicate scoring</li>
              <li>• Simple, efficient transcript monitoring</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 