'use client';

import { ElevenLabsVoiceCertification } from './elevenlabs-voice-certification';

interface VoiceCertificationSessionProps {
  moduleId: string;
  userId: string;
  onComplete: (result: { passed: boolean; score: number; certificationId: string }) => void;
}

export function VoiceCertificationSession({ moduleId, userId, onComplete }: VoiceCertificationSessionProps) {
  console.log("🎯 VoiceCertificationSession using ElevenLabs implementation");
  
  return (
    <ElevenLabsVoiceCertification 
      moduleId={moduleId}
      userId={userId}
      onComplete={onComplete}
    />
  );
} 