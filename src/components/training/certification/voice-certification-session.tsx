'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Award,
  Clock,
  AlertTriangle,
  Trophy,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import VoiceInterview from '@/components/voice-interview';

interface VoiceCertificationSessionProps {
  moduleId: string;
  userId: string;
  onComplete: (result: { passed: boolean; score: number; certificationId: string }) => void;
}

interface CertificationData {
  id: string;
  status: string;
  adaptiveDifficulty: string;
  passingThreshold: number;
  sessionId: string;
  scenarioText: string;
  module: {
    title: string;
    procedureId: string;
  };
}

interface ConversationEntry {
  role: "ai" | "user";
  content: string;
  timestamp?: Date;
}

export function VoiceCertificationSession({ moduleId, userId, onComplete }: VoiceCertificationSessionProps) {
  console.log("🎯 VoiceCertificationSession component loaded - this should be the NEW component");
  
  const [certification, setCertification] = useState<CertificationData | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);

  useEffect(() => {
    console.log("🚀 VoiceCertificationSession starting certification for:", { moduleId, userId });
    startCertification();
  }, [moduleId, userId]);

  useEffect(() => {
    // Start timer when certification begins
    if (certification && !showResults) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [certification, showResults]);

  const startCertification = async () => {
    console.log("🔄 VoiceCertificationSession.startCertification called");
    setLoading(true);
    try {
      const response = await fetch('/api/certification/voice-interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, moduleId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ VoiceCertificationSession: Certification started successfully:", data);
        setCertification(data.certification);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start voice certification');
      }
    } catch (error) {
      console.error('Error starting certification:', error);
      toast.error('Failed to start voice certification');
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewComplete = async (finalConversationHistory: ConversationEntry[]) => {
    console.log("Interview completed, starting certification scoring");
    setConversationHistory(finalConversationHistory);
    
    try {
      // Call the complete endpoint to score the certification
      const response = await fetch('/api/certification/voice-interview/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          certificationId: certification?.id,
          conversationHistory: finalConversationHistory
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setFinalScore(result.score);
        setShowResults(true);
        
        // Call parent completion handler
        onComplete({
          passed: result.passed,
          score: result.score,
          certificationId: certification?.id || ''
        });
        
        toast.success(result.passed ? 'Certification passed!' : 'Certification not passed. Please review and try again.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to complete certification');
      }
    } catch (error) {
      console.error('Error completing certification:', error);
      toast.error('Failed to complete certification');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderResults = () => {
    const passed = finalScore >= (certification?.passingThreshold || 70);
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {passed ? (
              <Trophy className="h-16 w-16 text-yellow-500" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {passed ? 'Certification Passed!' : 'Certification Not Passed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {finalScore}%
            </div>
            <div className="text-gray-600">
              Passing threshold: {certification?.passingThreshold || 70}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Time Elapsed:</strong> {formatTime(timeElapsed)}
            </div>
            <div>
              <strong>Difficulty:</strong> {certification?.adaptiveDifficulty}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Scenario:</h4>
            <p className="text-sm text-gray-700">
              {certification?.scenarioText}
            </p>
          </div>

          {!passed && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Next Steps:</h4>
              <p className="text-sm text-yellow-700">
                Review the training materials and practice the concepts before retaking the certification.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Initializing certification session...</span>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    return renderResults();
  }

  if (!certification) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
          <span>Failed to initialize certification session.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with certification info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Voice Certification: {certification.module.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {certification.scenarioText}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {formatTime(timeElapsed)}
              </div>
              <Badge variant="secondary" className="mt-1">
                {certification.adaptiveDifficulty} Difficulty
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Voice Interview Component */}
      <VoiceInterview
        procedureId={certification.module.procedureId}
        initialSessionId={certification.sessionId}
        taskDefinition={{
          title: `Certification: ${certification.module.title}`,
          description: certification.scenarioText,
          goal: "Demonstrate your knowledge and understanding of this procedure through conversation"
        }}
        onInterviewComplete={handleInterviewComplete}
      />
    </div>
  );
} 