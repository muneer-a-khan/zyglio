'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mic, MicOff, CheckCircle, AlertCircle, Volume2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function MicrophoneTest() {
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [browserSupport, setBrowserSupport] = useState<boolean>(true);
  
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Check browser compatibility and permission on mount
  useEffect(() => {
    // Check for MediaDevices API and getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setBrowserSupport(false);
      setPermissionError('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox or Edge.');
      return;
    }

    // Try to check permission status
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(status => {
          setMicPermission(status.state as 'granted' | 'denied' | 'prompt');
          
          // Listen for changes to permission state
          status.onchange = () => {
            setMicPermission(status.state as 'granted' | 'denied' | 'prompt');
            
            if (status.state === 'granted') {
              setPermissionError(null);
            } else if (status.state === 'denied') {
              setPermissionError('Microphone access is blocked. Please update your browser settings to allow microphone access for this site.');
            }
          };
        })
        .catch(() => {
          console.log("Can't check microphone permission - will request when testing");
        });
    }

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (analyserRef.current) {
        analyserRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const testMicrophone = async () => {
    try {
      setIsTestingMic(true);
      setPermissionError(null);

      // Check if microphone is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }

      // Request microphone access with optimized settings for voice
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
      
      if (error.name === 'NotAllowedError') {
        setMicPermission('denied');
        setPermissionError('Microphone permission denied. You need to allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        setPermissionError('Microphone is being used by another application. Please close other apps and try again.');
      } else if (error.name === 'AbortError') {
        setPermissionError('Microphone access request was aborted. Please try again.');
      } else {
        setPermissionError(`Unable to access microphone: ${error.message || 'Unknown error'}`);
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

  // Open browser settings for permission
  const openPermissionSettings = () => {
    toast.info("Opening browser settings...", {
      description: "Look for microphone permissions in your browser settings and ensure this site is allowed."
    });
    
    // For Chrome/Edge, try to open settings directly
    if (navigator.userAgent.includes("Chrome") || navigator.userAgent.includes("Edg")) {
      window.open('chrome://settings/content/microphone', '_blank');
    } 
    // For Firefox
    else if (navigator.userAgent.includes("Firefox")) {
      window.open('about:preferences#privacy', '_blank');
    } 
    // General fallback
    else {
      window.open(window.location.href, '_blank');
    }
  };

  const getMicIcon = () => {
    if (micPermission === 'granted') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (micPermission === 'denied') return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <Mic className="w-5 h-5" />;
  };

  const getMicStatusText = () => {
    if (micPermission === 'granted') return 'Microphone access granted';
    if (micPermission === 'denied') return 'Microphone access denied';
    if (micPermission === 'prompt') return 'Microphone access: Will ask when needed';
    return 'Click to test microphone';
  };

  const getMicStatusColor = () => {
    if (micPermission === 'granted') return 'text-green-600';
    if (micPermission === 'denied') return 'text-red-600';
    if (micPermission === 'prompt') return 'text-amber-600';
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
        {permissionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Microphone Error</AlertTitle>
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        )}
      
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
              disabled={isTestingMic || !browserSupport}
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
      </CardContent>
      
      {micPermission === 'denied' && (
        <CardFooter className="flex-col items-start">
          <div className="text-xs text-gray-700 space-y-2">
            <p className="font-semibold">To enable microphone:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Click the microphone icon in your browser's address bar</li>
              <li>Select "Allow" for microphone access</li>
              <li>Refresh this page and try again</li>
            </ol>
            
            <Button 
              variant="secondary" 
              size="sm"
              className="mt-2 w-full"
              onClick={openPermissionSettings}
            >
              <Settings className="w-4 h-4 mr-2" />
              Open Browser Settings
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
} 