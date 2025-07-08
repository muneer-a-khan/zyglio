'use client';

import { ElevenLabsVoiceCertification } from './elevenlabs-voice-certification';

interface VoiceCertificationSessionProps {
  moduleId: string;
  userId: string;
  onComplete: (result: { passed: boolean; score: number; certificationId: string }) => void;
}

export function VoiceCertificationSession({ moduleId, userId, onComplete }: VoiceCertificationSessionProps) {
  console.log("🎯 VoiceCertificationSession using ElevenLabs implementation with auto-generated scenarios");
  
  const handleCertificationComplete = (results: any) => {
    // Convert ElevenLabs results format to legacy format
    const legacyResult = {
      passed: results.passed || false,
      score: results.overallScore || 0,
      certificationId: results.certificationId || results.id || ''
    };
    
    onComplete(legacyResult);
  };

  return (
    <ElevenLabsVoiceCertification 
      moduleId={moduleId}
      userId={userId}
      onCertificationComplete={handleCertificationComplete}
      />
  );
} 