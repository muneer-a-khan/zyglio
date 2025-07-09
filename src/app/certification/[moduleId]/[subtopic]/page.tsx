'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SubtopicVoiceCertification } from '@/components/training/certification/subtopic-voice-certification';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function SubtopicCertificationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [certificationComplete, setCertificationComplete] = useState(false);
  
  const moduleId = params.moduleId as string;
  const subtopic = decodeURIComponent(params.subtopic as string);

  const handleCertificationComplete = async (results: any) => {
    console.log('🏆 Subtopic certification results:', results);
    
    try {
      // Save certification results to database
      const response = await fetch('/api/subtopic-certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id,
          moduleId: moduleId,
          subtopic: subtopic,
          score: results.score,
          passed: results.passed,
          questionsAnswered: results.questionsAnswered,
          sessionDuration: results.sessionDuration,
          conversation: results.conversation,
          agentUsed: results.agentUsed,
          certificationLevel: results.certificationLevel,
          certificationDate: results.certificationDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save certification results');
      }

      const savedResult = await response.json();
      console.log('✅ Certification saved:', savedResult);
      
      setCertificationComplete(true);
      
      if (results.passed) {
        toast.success(`🎉 "${subtopic}" Certification Complete!`, {
          description: `Score: ${results.score}% - You can now proceed to the next chapter.`,
          duration: 6000
        });
      } else {
        toast.error(`📚 "${subtopic}" Certification Incomplete`, {
          description: `Score: ${results.score}% - You can retry when ready.`,
          duration: 6000
        });
      }
      
    } catch (error) {
      console.error('Error saving certification:', error);
      toast.error('Error saving certification results');
    }
  };

  const goBackToModule = () => {
    router.push(`/training/${moduleId}`);
  };

  const goToModuleDashboard = () => {
    router.push('/dashboard');
  };

  // Handle authentication states
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent(`/certification/${moduleId}/${encodeURIComponent(subtopic)}`));
    return null;
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to access voice certification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={goBackToModule}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Module
            </Button>
            
            <div className="text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Module: {moduleId} → Chapter: {subtopic}
              </span>
            </div>
          </div>

          <Button 
            variant="ghost" 
            onClick={goToModuleDashboard}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </div>

        {/* Certification Component */}
        <SubtopicVoiceCertification
          moduleId={moduleId}
          subtopic={subtopic}
          onCertificationComplete={handleCertificationComplete}
        />

        {/* Post-Certification Actions */}
        {certificationComplete && (
          <div className="mt-8 p-6 bg-white rounded-lg border-2 border-green-200 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              What's Next?
            </h3>
            <div className="flex gap-4">
              <Button 
                onClick={goBackToModule}
                className="bg-green-600 hover:bg-green-700"
              >
                Continue to Next Chapter
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry Certification
              </Button>
              <Button 
                variant="ghost"
                onClick={goToModuleDashboard}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Instructions Footer */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-3">
            Chapter-Specific Voice Certification 🎯
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Each chapter has its own specialized assessment</li>
                <li>AI agent asks questions specific to this chapter</li>
                <li>Real-time conversation with voice feedback</li>
                <li>Instant scoring and certification results</li>
              </ul>
            </div>
            <div>
              <p><strong>Tips for success:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Review the chapter content before starting</li>
                <li>Speak clearly and provide detailed answers</li>
                <li>Use technical terms when appropriate</li>
                <li>Take your time to think before responding</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-600">
            <strong>Note:</strong> This certification is specific to the "{subtopic}" chapter. 
            You'll need to complete separate certifications for each chapter in the module.
          </div>
        </div>
      </div>
    </div>
  );
} 