'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, CheckCircle, AlertCircle, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

export function MicrophoneTest() {
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [audioLevel, setAudioLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const testMicrophone = async () => {
    try {
      setIsTestingMic(true);

      // Check if microphone is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      setMicPermission('granted');
      toast.success('Microphone access granted! Speak to test audio levels.');

      // Set up audio analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Monitor audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          animationRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();

    } catch (error: any) {
      console.error('Microphone test error:', error);
      setMicPermission('denied');
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Microphone is being used by another application. Please close other apps and try again.');
      } else {
        toast.error('Unable to access microphone. Please check your browser settings.');
      }
    } finally {
      setIsTestingMic(false);
    }
  };

  const stopTest = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setAudioLevel(0);
    setMicPermission('unknown');
    analyserRef.current = null;
  };

  const getMicIcon = () => {
    if (micPermission === 'granted') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (micPermission === 'denied') return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <Mic className="w-5 h-5" />;
  };

  const getMicStatusText = () => {
    if (micPermission === 'granted') return 'Microphone access granted';
    if (micPermission === 'denied') return 'Microphone access denied';
    return 'Click to test microphone';
  };

  const getMicStatusColor = () => {
    if (micPermission === 'granted') return 'text-green-600';
    if (micPermission === 'denied') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Microphone Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`flex items-center justify-center gap-2 mb-2 ${getMicStatusColor()}`}>
            {getMicIcon()}
            <span className="text-sm font-medium">{getMicStatusText()}</span>
          </div>
          
          {micPermission === 'granted' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500">Audio Level</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {audioLevel > 10 ? 'Good audio detected!' : 'Speak to test audio levels'}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {micPermission !== 'granted' ? (
            <Button 
              onClick={testMicrophone}
              disabled={isTestingMic}
              className="flex-1"
            >
              {isTestingMic ? (
                <>
                  <MicOff className="w-4 h-4 mr-2 animate-pulse" />
                  Testing...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Test Microphone
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={stopTest}
              variant="outline"
              className="flex-1"
            >
              <MicOff className="w-4 h-4 mr-2" />
              Stop Test
            </Button>
          )}
        </div>

        {micPermission === 'denied' && (
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>To enable microphone:</strong></p>
            <p>• Click the microphone icon in your browser's address bar</p>
            <p>• Allow microphone access for this site</p>
            <p>• Refresh the page and try again</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 