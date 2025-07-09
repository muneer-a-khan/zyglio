'use client';

import { SimpleTranscriptTracker } from './simple-transcript-tracker';

interface VoiceCertificationSessionProps {
  moduleId: string;
  userId: string;
  onComplete: (result: { passed: boolean; score: number; certificationId: string }) => void;
}

export function VoiceCertificationSession({ moduleId, userId, onComplete }: VoiceCertificationSessionProps) {
  console.log("🎯 VoiceCertificationSession using Simple Transcript Tracker - Reading ElevenLabs Data");
  
  const handleCertificationComplete = (results: any) => {
    // Convert results format to legacy format
    const legacyResult = {
      passed: results.passed || false,
      score: results.score || 0,
      certificationId: results.sessionId || results.id || ''
    };
    
    onComplete(legacyResult);
  };

  return (
    <SimpleTranscriptTracker 
      moduleId={moduleId}
      userId={userId}
      onCertificationComplete={handleCertificationComplete}
      />
  );
} 