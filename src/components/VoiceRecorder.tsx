import { useState, useRef, useEffect, useCallback } from "react";
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
  // Add a flag to track recognition state to avoid race conditions
  const isRecognitionActiveRef = useRef<boolean>(false);
  // Add a ref to track persistent transcript between recognition sessions
  const persistentTranscriptRef = useRef<string>("");

  // Define a function to restart speech recognition
  const startSpeechRecognition = useCallback(() => {
    // Only restart if we're recording and not paused
    if (!isRecording || isPaused) {
      return;
    }
    
    // Check if already active
    if (isRecognitionActiveRef.current) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {
        // Error handling if needed
      }
      // Wait a moment before starting a new instance
      setTimeout(() => {
        if (isRecording && !isPaused) {
          initiateNewRecognitionInstance();
        }
      }, 100);
      return;
    }
    
    initiateNewRecognitionInstance();
  }, [isRecording, isPaused]);

  // Extract the recognition instance creation logic into a separate function
  const initiateNewRecognitionInstance = useCallback(() => {
    // Don't start if we're not in recording state
    if (!isRecording || isPaused) {
      return;
    }
    
    isRecognitionActiveRef.current = false;
    
    // Set up a new recognition instance
    try {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
        
      if (!SpeechRecognitionAPI) {
        setIsSupported(false);
        return;
      }
      
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true; // Switch back to continuous for smoother recognition
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      // Get current transcript from persistent ref
      const startingTranscript = persistentTranscriptRef.current;
      
      // Track if we got a final result
      let finalResultReceived = false;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Process all the results
        let fullSessionTranscript = "";
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          // Only add final results to avoid duplication
          if (result.isFinal) {
            finalResultReceived = true;
            fullSessionTranscript += result[0].transcript;
          }
        }
        
        if (finalResultReceived && fullSessionTranscript) {
          // Build the new transcript
          let newFullTranscript = startingTranscript;
          
          // Add a space if needed
          if (startingTranscript && !startingTranscript.endsWith(" ") && 
              fullSessionTranscript && !fullSessionTranscript.startsWith(" ")) {
            newFullTranscript += " ";
          }
          
          // Add the new content
          newFullTranscript += fullSessionTranscript;
          
          // Update both the state and ref
          setTranscript(newFullTranscript);
          persistentTranscriptRef.current = newFullTranscript;
          onTranscriptUpdate(newFullTranscript);
        } else {
          // Show the latest interim result
          const latestResult = event.results[event.results.length - 1];
          if (!latestResult.isFinal) {
            const interimText = latestResult[0].transcript;
            
            // Create a temp transcript with the interim result
            let tempTranscript = startingTranscript;
            
            // Add a space if needed
            if (startingTranscript && !startingTranscript.endsWith(" ") && 
                interimText && !interimText.startsWith(" ")) {
              tempTranscript += " ";
            }
            
            tempTranscript += interimText;
            
            // Just update the UI state, not the persistent ref
            setTranscript(tempTranscript);
            onTranscriptUpdate(tempTranscript);
          }
        }
        
        // If we got a result, clear any network errors
        if (error && error.includes("network")) {
          setError(null);
        }
      };
      
      recognition.onerror = (event: any) => {
        // Only show errors that aren't related to abort operations
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          // Special handling for network errors - we can continue recording
          // but let the user know transcription might be affected
          if (event.error === 'network') {
            setError("Network issue with speech recognition. Your recording will continue, but transcription may be affected.");
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
        }
        
        // Mark as inactive on error
        isRecognitionActiveRef.current = false;
      };
      
      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        
        // If no final result was received, reset to the persistent transcript
        if (!finalResultReceived) {
          setTranscript(persistentTranscriptRef.current);
          onTranscriptUpdate(persistentTranscriptRef.current);
        }
      };
      
      // Store the reference
      recognitionRef.current = recognition;
      
      // Start it
      recognition.start();
      isRecognitionActiveRef.current = true;
    } catch (e) {
      isRecognitionActiveRef.current = false;
      // Show more helpful error message to the user
      setError("Failed to start speech recognition. Please try again or check your browser permissions.");
    }
  }, [isRecording, isPaused, onTranscriptUpdate, error]);
  
  // Set up speech recognition when recording state changes
  useEffect(() => {
    // If not recording, clean up
    if (!isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Handle errors silently
        }
        isRecognitionActiveRef.current = false;
      }
      return;
    }
    
    // If paused, also clean up
    if (isPaused) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Handle errors silently
        }
        isRecognitionActiveRef.current = false;
      }
      return;
    }
    
    // Otherwise, start recognition (only if not already active)
    if (!isRecognitionActiveRef.current) {
      startSpeechRecognition();
    }
    
    // Clean up when unmounting or when state changes
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Handle errors silently
        }
        isRecognitionActiveRef.current = false;
      }
    };
  }, [isRecording, isPaused, startSpeechRecognition]);

  const startRecording = async () => {
    setError(null);
    
    // Clear transcript and reset persistent ref when starting a new recording
    setTranscript("");
    persistentTranscriptRef.current = "";
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      // Start timer immediately - do this first to ensure timer is running
      setRecordingDuration(0);
      
      // Clear any existing interval first
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Use a more reliable timer approach
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsedSeconds);
      }, 1000);
      
      // Recognition will be started by the useEffect watching isRecording
    } catch (err) {
      setError(
        "Error accessing microphone. Please ensure your microphone is connected and you have granted permission to use it."
      );
      // Reset recording state since we failed
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = (pausing: boolean) => {
    if (!pausing) {
      // RESUMING
      // Resume timer
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
        setRecordingDuration(elapsedSeconds);
      }, 1000);
      
      // Start speech recognition by changing the state - the useEffect will handle it
    } else {
      // PAUSING
      // Stop speech recognition completely when pausing
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null; // Clear the reference to prevent automatic restarts
        } catch (e) {
          // Handle errors silently
        }
        isRecognitionActiveRef.current = false;
      }

      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    // Stop recognition first and clear the reference
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Handle errors silently
      }
      // Immediately mark as inactive and clear reference
      isRecognitionActiveRef.current = false;
      recognitionRef.current = null;
    }
    
    // Stop media tracks
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
        mediaRecorderRef.current = null;
      } catch (e) {
        // Handle errors silently
      }
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle start button click
  const handleStartClick = () => {
    // Set state immediately before calling async function
    setIsRecording(true);
    setIsPaused(false);
    
    // Start recording and request microphone permission
    startRecording();
    
    // The useEffect watching isRecording will start speech recognition once state is updated
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {error && (
        <Alert variant={error.includes("network") ? "default" : "destructive"} className="mb-4 w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.includes("network") 
              ? "Network issue with speech recognition. Your recording will continue, but transcription may be affected."
              : error}
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

          {/* Main mic button - only visible when not recording */}
          {!isRecording && (
            <div 
              className="bg-blue-600 hover:bg-blue-700 text-white h-20 w-20 rounded-full cursor-pointer flex items-center justify-center"
              onClick={handleStartClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStartClick();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Start recording"
            >
              <Mic className="h-8 w-8" />
            </div>
          )}
          
          {/* Status text in circle when recording */}
          {isRecording && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(recordingDuration)}
              </div>
              <div className="text-sm text-gray-500 mt-1 font-medium">
                {isPaused ? "Paused" : "Recording..."}
              </div>
            </div>
          )}
        </div>

        {/* Control buttons - only visible when recording */}
        {isRecording && (
          <div className="flex items-center justify-center gap-6 mt-4">
            {/* Pause/Resume button */}
            <button
              id="voice-pause-button"
              type="button"
              onClick={() => {
                const newPauseState = !isPaused;
                
                // Change state first
                setIsPaused(newPauseState);
                
                // Then perform the pause/resume action
                pauseRecording(newPauseState);
                
                // If resuming, ensure speech recognition starts again
                if (!newPauseState && isRecording && !isRecognitionActiveRef.current) {
                  setTimeout(() => {
                    startSpeechRecognition();
                  }, 100);
                }
              }}
              className={cn(
                "flex items-center justify-center h-16 w-16 rounded-full shadow-md transition-all outline-none focus:outline-none focus:ring-2 focus:ring-blue-500",
                isPaused 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : "bg-yellow-500 hover:bg-yellow-600 text-white"
              )}
            >
              {isPaused ? (
                <Play className="h-6 w-6" />
              ) : (
                <Pause className="h-6 w-6" />
              )}
            </button>
            
            {/* Stop button */}
            <button
              id="voice-stop-button"
              type="button"
              onClick={() => {
                // First change states
                setIsRecording(false);
                setIsPaused(false);
                
                // Then perform the stop action
                stopRecording();
              }}
              className="flex items-center justify-center h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition-all outline-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Square className="h-6 w-6" />
            </button>
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
