"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Square, AlertCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

// Define the SpeechRecognition type since TypeScript doesn't recognize it natively
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item: (index: number) => SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Define the global SpeechRecognition constructor
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface VoiceRecorderProps {
  onTranscriptUpdate: (transcript: string) => void;
  className?: string;
}

const VoiceRecorder = ({
  onTranscriptUpdate,
  className,
}: VoiceRecorderProps) => {
  // Core recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Permission and setup states
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showPermissionSettings, setShowPermissionSettings] = useState(false);
  const [browserSupport, setBrowserSupport] = useState<{
    mediaDevices: boolean;
    speechRecognition: boolean; 
  }>({ mediaDevices: false, speechRecognition: false });

  // Refs for managing recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const persistentTranscriptRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser compatibility on component mount
  useEffect(() => {
    // Check for required browser features
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    
    setBrowserSupport({
      mediaDevices: hasMediaDevices,
      speechRecognition: hasSpeechRecognition
    });
    
    // If we don't have the needed APIs, show appropriate errors
    if (!hasMediaDevices) {
      setPermissionError("Your browser doesn't support microphone access. Please use a modern browser like Chrome, Edge, or Firefox.");
    } else if (!hasSpeechRecognition) {
      setPermissionError("Your browser doesn't support speech recognition. Please use Chrome or Edge for the best experience.");
    }
    
    // Try to check permission status on mount
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(status => {
          setPermissionStatus(status.state as 'granted' | 'denied' | 'prompt');
        })
        .catch(() => {
          // If we can't check permission, we'll ask when the user tries to record
          console.log("Can't check microphone permission - will request when needed");
        });
    }
    
    // Clean up on unmount
    return () => {
      stopAllMediaTracks();
      clearTimers();
    };
  }, []);

  // Initialize speech recognition engine
  useEffect(() => {
    if (browserSupport.speechRecognition && !recognitionRef.current) {
      initializeSpeechRecognition();
    }
  }, [browserSupport.speechRecognition]);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
      
    if (!SpeechRecognitionAPI) {
      setBrowserSupport({
        mediaDevices: false,
        speechRecognition: false
      });
      return;
    }
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Previous transcript content
      let startingTranscript = persistentTranscriptRef.current;
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }
      
      // Only update if we have final or interim content
      if (finalTranscript || interimTranscript) {
        // Update persistent ref if we have final transcript
        if (finalTranscript) {
          persistentTranscriptRef.current = (startingTranscript + ' ' + finalTranscript).trim();
        }
        
        // Display current state (persistent + interim)
        const displayText = ((persistentTranscriptRef.current + ' ' + interimTranscript).trim());
        setTranscript(displayText);
        onTranscriptUpdate(displayText);
        
        // Clear any permission errors if we're successfully getting results
        if (permissionError) {
          setPermissionError(null);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      // Only handle errors that aren't related to abort or no-speech
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setPermissionStatus('denied');
          setPermissionError(
            "Microphone access denied. Please enable your microphone permissions and refresh the page."
          );
          setIsRecording(false);
        } else if (event.error === 'network') {
          // Don't change permission status for network issues
          setPermissionError(
            "Network issue with speech recognition. Your recording will continue, but transcription may be affected."
          );
        } else {
          setPermissionError(`Speech recognition error: ${event.error}. Please try again.`);
        }
      }
    };
    
    recognition.onend = () => {
      // Restart if recording but not paused
      if (isRecording && !isPaused) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition', e);
        }
      }
    };
    
    recognitionRef.current = recognition;
  };

  // Request microphone permission explicitly
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (!browserSupport.mediaDevices) {
      setPermissionError("Your browser doesn't support microphone access");
      return false;
    }

    try {
      setPermissionError(null);
      
      // Request stream with quality settings for speech
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Keep reference to the stream
      streamRef.current = stream;
      setPermissionStatus('granted');
      return true;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      
      // Handle different permission error types
      if (error.name === 'NotAllowedError') {
        setPermissionStatus('denied');
        setPermissionError(
          "Microphone access denied. To fix this: Click the camera/microphone icon in your browser's address bar and select 'Allow' for microphone access, then refresh the page."
        );
      } else if (error.name === 'NotFoundError') {
        setPermissionStatus('denied');
        setPermissionError("No microphone found. Please connect a microphone and try again.");
      } else if (error.name === 'NotReadableError') {
        setPermissionStatus('denied');
        setPermissionError("Your microphone is already being used by another application. Please close other apps and try again.");
      } else {
        setPermissionStatus('denied');
        setPermissionError(`Unable to access microphone: ${error.message || 'Unknown error'}`);
      }
      
      setShowPermissionSettings(true);
      return false;
    }
  };

  // Start recording flow
  const startRecording = async () => {
    // If already recording, do nothing
    if (isRecording) return;
    
    // Reset transcript
    setTranscript("");
    persistentTranscriptRef.current = "";
    
    // First, ensure we have microphone permission
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;
    
    try {
      // Get stream if we don't already have it
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }
      
      // Create media recorder
      let mimeType = 'audio/webm; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = ''; // Default
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(
        streamRef.current,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current.start();
      
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to start speech recognition', e);
        }
      } else if (browserSupport.speechRecognition) {
        // Try to initialize and start if not done earlier
        initializeSpeechRecognition();
        if (recognitionRef.current) {
          (recognitionRef.current as SpeechRecognition).start();
        }
      }
      
      // Start timer
      startTimer();
      
      // Update state
      setIsRecording(true);
      setIsPaused(false);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionError("Failed to start recording. Please try again.");
      stopAllMediaTracks();
      clearTimers();
    }
  };

  // Pause/resume recording
  const togglePause = () => {
    if (!isRecording) return;
    
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Handle pause/resume actions
    if (newPausedState) {
      // Pause recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {} // Handle silently
      }
      
      // Pause timer
      clearTimers();
    } else {
      // Resume recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to resume recognition', e);
        }
      }
      
      // Resume timer
      startTimer();
    }
  };

  // Stop recording
  const stopRecording = () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {} // Handle silently
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      } catch (e) {} // Handle silently
    }
    
    // Stop all media tracks
    stopAllMediaTracks();
    
    // Stop timer
    clearTimers();
    
    // Update state
    setIsRecording(false);
    setIsPaused(false);
  };

  // Helper to stop all media tracks
  const stopAllMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Start/resume the timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const startTime = Date.now() - (recordingDuration * 1000);
    timerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setRecordingDuration(elapsedSeconds);
    }, 1000);
  };

  // Clear all timers
  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle record button click
  const handleRecordClick = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  // Open browser settings for permission
  const openPermissionSettings = () => {
    toast.info("Redirecting you to browser settings...", {
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
    // General fallback - opens site settings in most browsers
    else {
      window.open(window.location.href, '_blank');
    }
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {permissionError && (
        <Alert variant="destructive" className="mb-4 w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Microphone Error</AlertTitle>
          <AlertDescription>
            {permissionError}
            {showPermissionSettings && (
              <Button 
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={openPermissionSettings}
              >
                <Settings className="w-4 h-4 mr-2" />
                Open Browser Settings
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center justify-center mb-6">
        {/* Recording circle */}
        <div className="relative rounded-full bg-gray-100 h-40 w-40 flex items-center justify-center mb-5">
          {/* Pulsing border effect */}
          {isRecording && (
            <div
              className={cn(
                "absolute inset-0 rounded-full border-4 border-blue-500",
                !isPaused && "animate-pulse-recording"
              )}
            />
          )}

          {/* Main mic button */}
          <div 
            className={cn(
              "h-20 w-20 rounded-full cursor-pointer flex items-center justify-center",
              isRecording 
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700",
              "text-white"
            )}
            onClick={handleRecordClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRecordClick();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <Square className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </div>

          {/* Status text in circle when recording */}
          {isRecording && (
            <div className="absolute bottom-5 text-center">
              <div className="text-lg font-bold text-blue-600">
                {formatTime(recordingDuration)}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium">
                {isPaused ? "Paused" : "Recording..."}
              </div>
            </div>
          )}
        </div>

        {/* Pause button - only visible when recording */}
        {isRecording && (
          <Button
            id="voice-pause-button"
            type="button"
            variant={isPaused ? "default" : "outline"}
            onClick={togglePause}
            className="flex items-center gap-2 mb-4"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Resume Recording
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pause Recording
              </>
            )}
          </Button>
        )}

        {!isRecording && permissionStatus !== "granted" && (
          <div className="text-center mt-2">
            <p className="text-sm text-gray-500">
              Tap the microphone to start recording (will request permission)
            </p>
          </div>
        )}
      </div>

      {transcript && (
        <div className="w-full mt-2 bg-gray-50 border rounded-md p-3">
          <h3 className="text-sm font-medium mb-1">Current Transcript</h3>
          <p className="text-sm text-gray-700">{transcript}</p>
        </div>
      )}
    </div>
  );
};

// Type declarations for SpeechRecognition since TypeScript doesn't have these built-in
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export default VoiceRecorder;
