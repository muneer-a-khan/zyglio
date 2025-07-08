'use client';

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
  CheckCircle, 
  AlertCircle,
  Award,
  PhoneCall,
  MessageCircle,
  Volume2,
  BookOpen,
  Clock
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

export function SubtopicVoiceCertification({ 
  moduleId, 
  subtopic,
  onCertificationComplete,
  className = '' 
}: SubtopicVoiceCertificationProps) {
  
  console.log(`🎯 SUBTOPIC VOICE CERTIFICATION: ${subtopic} in module ${moduleId}`);
  
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(5);
  const [agentStatus, setAgentStatus] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

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
      console.log(`✅ Connected to ${subtopic} certification expert!`);
      toast.success(`Connected to ${agentConfig?.agentName || 'Training Expert'}!`);
      setAgentStatus('speaking');
      setSessionStartTime(new Date());
    },
    onDisconnect: () => {
      console.log(`🔌 Disconnected from ${subtopic} certification`);
      setAgentStatus('listening');
    },
    onMessage: (message: any) => {
      console.log('🤖 Agent message:', message);
      
      // Handle different message types based on the actual SDK structure
      if (message.type === 'agent_response' || (message.source === 'ai' && message.message)) {
        const newMessage: ConversationMessage = {
          role: 'agent',
          content: message.message || message.text || '',
          timestamp: new Date()
        };
        setConversation(prev => [...prev, newMessage]);
        setAgentStatus('listening');
        
        // Track questions - look for question indicators
        const messageText = message.message || message.text || '';
        if (messageText.toLowerCase().includes('question') || 
            messageText.toLowerCase().includes('tell me') ||
            messageText.toLowerCase().includes('explain') ||
            messageText.toLowerCase().includes('describe') ||
            messageText.toLowerCase().includes('how would you') ||
            messageText.includes('?')) {
          setQuestionCount(prev => prev + 1);
        }
      } else if (message.type === 'user_transcript' || (message.source === 'user' && message.message)) {
        const newMessage: ConversationMessage = {
          role: 'user',
          content: message.message || message.text || '',
          timestamp: new Date()
        };
        setConversation(prev => [...prev, newMessage]);
        
        // Enhanced scoring algorithm
        const messageText = message.message || message.text || '';
        const words = messageText.split(' ').length;
        const subtopicLower = subtopic.toLowerCase();
        const messageLower = messageText.toLowerCase();
        
        // Base score from response length
        const lengthScore = Math.min(words * 1.5, 15);
        
        // Relevance bonus if user mentions subtopic or related terms
        const relevanceBonus = messageLower.includes(subtopicLower) || 
                             messageLower.includes(subtopicLower.split(' ')[0]) ? 10 : 0;
        
        // Technical depth bonus for detailed responses
        const technicalTerms = ['process', 'procedure', 'method', 'technique', 'approach', 'strategy'];
        const depthBonus = technicalTerms.some(term => messageLower.includes(term)) ? 5 : 0;
        
        const points = Math.min(lengthScore + relevanceBonus + depthBonus, 25);
        setCurrentScore(prev => Math.min(prev + points, 100));
        
        setAgentStatus('thinking');
      }
    },
    onError: (error: any) => {
      console.error(`❌ ${subtopic} certification error:`, error);
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Connection error';
      toast.error(`Connection error: ${errorMessage}`);
    },
    onModeChange: (mode: any) => {
      console.log('🔄 Mode changed:', mode);
      const modeString = typeof mode === 'string' ? mode : mode?.mode || mode?.status || 'listening';
      setAgentStatus(modeString === 'speaking' ? 'speaking' : 'listening');
    }
  });

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
      
      // Calculate session duration
      const sessionDuration = sessionStartTime ? 
        Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000) : 0;
      
      // Calculate final results
      const finalScore = Math.min(currentScore, 100);
      const passingScore = agentConfig?.passingScore || 70;
      const passed = finalScore >= passingScore;
      
      const results = {
        score: finalScore,
        passed,
        questionsAnswered: questionCount,
        sessionDuration,
        conversation: conversation,
        subtopic: subtopic,
        moduleId: moduleId,
        agentUsed: agentConfig?.agentId,
        certificationLevel: passed ? `${subtopic} Certified` : 'Needs Improvement',
        certificationDate: new Date().toISOString()
      };
      
      if (passed) {
        toast.success(`🎉 Congratulations! You passed "${subtopic}" with ${finalScore}%`, {
          description: `You are now certified in this chapter!`,
          duration: 5000
        });
      } else {
        toast.error(`📚 Score: ${finalScore}%. You need ${passingScore}% to pass "${subtopic}".`, {
          description: 'You can retry the certification when ready.',
          duration: 5000
        });
      }
      
      onCertificationComplete(results);
      
    } catch (error) {
      console.error('Error ending certification:', error);
      toast.error('Error ending certification');
    }
  }, [conversationSdk, currentScore, questionCount, conversation, subtopic, moduleId, agentConfig, sessionStartTime, onCertificationComplete]);

  const getStatusIcon = () => {
    switch (agentStatus) {
      case 'speaking': return <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'thinking': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default: return <Mic className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    const agentName = agentConfig?.agentName || 'Training Expert';
    switch (agentStatus) {
      case 'speaking': return `${agentName} is speaking...`;
      case 'thinking': return `${agentName} is thinking...`;
      default: return 'Listening for your response...';
    }
  };

  const isConnected = conversationSdk.status === 'connected';
  const isConnecting = conversationSdk.status === 'connecting';
  const progressPercentage = Math.min((questionCount / maxQuestions) * 100, 100);

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
            <BookOpen className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-blue-800">
              {subtopic} Voice Certification
            </CardTitle>
          </div>
          <p className="text-blue-600">
            Demonstrate your knowledge of this chapter with {agentConfig.agentName}
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
                  {getStatusIcon()}
                  <span className="font-medium">{getStatusText()}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    Question {questionCount} of {maxQuestions}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Award className="h-4 w-4" />
                    Score: {Math.min(currentScore, 100)}%
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    {sessionStartTime && Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 60000)} min
                  </div>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="mt-3 h-2"
                />
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