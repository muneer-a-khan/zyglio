import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Square, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to monitor recording duration changes
  useEffect(() => {
    console.log("Recording duration updated:", recordingDuration);
  }, [recordingDuration]);

  // Set up SpeechRecognition
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.error("Speech recognition not supported in this browser");
      setIsSupported(false);
      setError(
        "Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari."
      );
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }

      setTranscript(currentTranscript);
      onTranscriptUpdate(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setError(`Speech recognition error: ${event.error}`);
      
      // Don't stop recording on network errors, just show the error
      if (event.error === 'network') {
        // Try to restart recognition after a short delay
        setTimeout(() => {
          if (isRecording && !isPaused && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (isRecording && !isPaused) {
        // If recording was not explicitly paused, but recognition ended, try to restart it
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart recognition on end:", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused, onTranscriptUpdate]);

  const startRecording = async () => {
    console.log("START RECORDING CALLED");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      // Start timer immediately - do this first to ensure timer is running
      setRecordingDuration(0);
      console.log("SETTING UP TIMER");
      
      // Clear any existing interval first
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Use a more reliable timer approach
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        console.log("TIMER TICK", elapsedSeconds);
        setRecordingDuration(elapsedSeconds);
      }, 1000);
      
      // Start recognition - we already set recording state in the button handler
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Error starting recognition:", e);
          // Still continue with recording even if recognition fails
        }
      }
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError(
        "Error accessing microphone. Please ensure your microphone is connected and you have granted permission to use it."
      );
      // Reset recording state since we failed
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    console.log("PAUSE RECORDING CALLED", isPaused);
    
    // Check current pause state - we already toggled it in the UI
    const currentlyPaused = !isPaused;
    
    if (currentlyPaused) {
      // We're now resuming (was paused, now is not)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Error resuming recognition:", e);
        }
      }

      // Resume timer with the current elapsed time
      console.log("RESUMING TIMER");
      
      // Clear any existing interval first
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Store current duration
      const currentDuration = recordingDuration;
      const resumeTime = Date.now() - (currentDuration * 1000);
      
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - resumeTime) / 1000);
        console.log("TIMER TICK (RESUME)", elapsedSeconds);
        setRecordingDuration(elapsedSeconds);
      }, 1000);
    } else {
      // We're now pausing (was not paused, now is)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error pausing recognition:", e);
        }
      }

      // Pause timer
      console.log("PAUSING TIMER");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    console.log("STOP RECORDING CALLED");
    
    // Stop media tracks
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      } catch (e) {
        console.error("Error stopping media tracks:", e);
      }
    }

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }

    // Stop timer
    console.log("STOPPING TIMER");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // We already set the states in the button handler
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {error && (
        <Alert variant={error.includes("network") ? "warning" : "destructive"} className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.includes("network") 
              ? "Network issue with speech recognition. Your recording will continue, but transcription may be affected."
              : error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center justify-center mb-6">
        <div className="relative rounded-full bg-gray-100 h-40 w-40 flex items-center justify-center mb-3">
          {isRecording && (
            <div
              className={cn(
                "absolute inset-0 rounded-full border-4 border-blue-500",
                !isPaused && "animate-pulse-recording"
              )}
            />
          )}

          {!isRecording ? (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Set state immediately before calling async function
                setIsRecording(true);
                setIsPaused(false);
                startRecording();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-20 w-20 rounded-full"
              disabled={!isSupported}
            >
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Toggle pause state immediately
                  setIsPaused(!isPaused);
                  pauseRecording();
                }}
                variant="outline"
                className="h-12 w-12 rounded-full"
              >
                {isPaused ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Set state immediately
                  setIsRecording(false);
                  setIsPaused(false);
                  stopRecording();
                }}
                variant="destructive"
                className="h-12 w-12 rounded-full"
              >
                <Square className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {isRecording && (
          <div className="text-center">
            <div className="text-xl font-bold">
              {formatTime(recordingDuration)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {isPaused ? "Recording Paused" : "Recording..."}
            </div>
          </div>
        )}

        {!isRecording && (
          <div className="text-center mt-2">
            <p className="text-sm text-gray-500">
              Tap the microphone to start recording
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

export default VoiceRecorder;
