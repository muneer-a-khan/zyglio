"use client";

import { useState } from 'react';
import { EnhancedVoiceCertification } from './enhanced-voice-certification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedVoiceCertificationWrapperProps {
  moduleId: string;
  userId?: string;
  onCertificationComplete: (results: any) => void;
  className?: string;
}

export function EnhancedVoiceCertificationWrapper({ 
  moduleId, 
  userId, 
  onCertificationComplete,
  className = '' 
}: EnhancedVoiceCertificationWrapperProps) {
  const [showResults, setShowResults] = useState(false);
  const [certificationResults, setCertificationResults] = useState<any>(null);

  const handleCertificationComplete = (results: any) => {
    setCertificationResults(results);
    setShowResults(true);
    
    // Call the original completion handler
    onCertificationComplete(results);
  };

  const handleRetake = () => {
    setShowResults(false);
    setCertificationResults(null);
  };

  if (showResults && certificationResults) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Results Header */}
        <Card className={`${certificationResults.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              {certificationResults.passed ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-600" />
              )}
              <CardTitle className={`text-2xl font-bold ${certificationResults.passed ? 'text-green-800' : 'text-red-800'}`}>
                {certificationResults.passed ? '🎉 Certification Passed!' : '📊 Certification Results'}
              </CardTitle>
            </div>
            <p className={certificationResults.passed ? 'text-green-700' : 'text-red-700'}>
              {certificationResults.passed 
                ? `Congratulations! You achieved ${certificationResults.score}%` 
                : `You scored ${certificationResults.score}%. You need 70% to pass.`}
            </p>
          </CardHeader>
        </Card>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detailed Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall Score:</span>
                  <Badge variant={certificationResults.passed ? "default" : "secondary"} className="text-lg">
                    {certificationResults.score}%
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Questions Answered:</span>
                  <span className="font-medium">{certificationResults.questionsAnswered}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time Elapsed:</span>
                  <span className="font-medium">{certificationResults.timeElapsed}s</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Certification Level:</span>
                  <Badge variant="outline">{certificationResults.certificationLevel}</Badge>
                </div>
              </div>

              {certificationResults.progressMetrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Exchanges:</span>
                    <span className="font-medium">{certificationResults.progressMetrics.totalExchanges}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">User Responses:</span>
                    <span className="font-medium">{certificationResults.progressMetrics.userResponses}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Words:</span>
                    <span className="font-medium">{certificationResults.progressMetrics.totalUserWords}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Avg Response:</span>
                    <span className="font-medium">{certificationResults.progressMetrics.avgResponseLength} words</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleRetake}
                variant="outline"
                size="lg"
              >
                <Award className="mr-2 h-4 w-4" />
                Retake Certification
              </Button>
              
              <Button
                onClick={() => window.location.href = '/dashboard'}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conversation Summary */}
        {certificationResults.conversation && certificationResults.conversation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Conversation Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {certificationResults.conversation.slice(-5).map((msg: any, index: number) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-sm ${
                      msg.role === 'agent' ? 'bg-blue-50' : 'bg-green-50'
                    }`}
                  >
                    <span className="font-medium">
                      {msg.role === 'agent' ? '🤖 Agent:' : '👤 You:'}
                    </span>
                    <span className="ml-2">
                      {msg.content.length > 100 
                        ? `${msg.content.substring(0, 100)}...` 
                        : msg.content}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <EnhancedVoiceCertification
      moduleId={moduleId}
      userId={userId}
      onCertificationComplete={handleCertificationComplete}
      className={className}
    />
  );
} 