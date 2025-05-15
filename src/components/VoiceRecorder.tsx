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

  // Effect to monitor recording duration changes
  useEffect(() => {
    console.log("Recording duration updated:", recordingDuration);
  }, [recordingDuration]);

  // Effect to update the persistent transcript ref when transcript state changes
  useEffect(() => {
    persistentTranscriptRef.current = transcript;
    console.log("Updated persistent transcript ref:", persistentTranscriptRef.current);
  }, [transcript]);
  
  // Define a function to restart speech recognition
  const startSpeechRecognition = useCallback(() => {
    console.log("Manual restart of speech recognition requested");
    
    // Only restart if we're recording and not paused
    if (!isRecording || isPaused) {
      console.log("Not restarting recognition - not in recording state");
      return;
    }
    
    // Check if already active
    if (isRecognitionActiveRef.current) {
      console.log("Recognition is already active, stopping it first");
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {
        console.error("Error stopping recognition before restart:", e);
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
        console.error("Speech recognition not supported");
        setIsSupported(false);
        return;
      }
      
      console.log("Creating new speech recognition instance");
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      // Get current transcript from persistent ref to avoid stale state issues
      const currentTranscript = persistentTranscriptRef.current;
      console.log("Starting new recognition with existing transcript:", currentTranscript);
      
      // These results are specific to this recognition session
      let sessionResults = "";
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Process the results from this recognition session
        sessionResults = "";
        for (let i = 0; i < event.results.length; i++) {
          sessionResults += event.results[i][0].transcript;
        }
        
        // Combine with existing transcript, adding a space if needed
        const currentTranscript = persistentTranscriptRef.current;
        let updatedTranscript = currentTranscript;
        
        // Only append if there's actually new content
        if (sessionResults.trim()) {
          if (currentTranscript && !currentTranscript.endsWith(" ")) {
            updatedTranscript = currentTranscript + " " + sessionResults;
          } else {
            updatedTranscript = currentTranscript + sessionResults;
          }
        }
        
        console.log("Transcript update:", {
          current: currentTranscript,
          session: sessionResults,
          updated: updatedTranscript
        });
        
        // Update state and notify parent
        setTranscript(updatedTranscript);
        onTranscriptUpdate(updatedTranscript);
        
        // If we got a result, clear any network errors
        if (error && error.includes("network")) {
          setError(null);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        
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
        console.log("Speech recognition ended naturally");
        isRecognitionActiveRef.current = false;
        
        // Save the final transcript from this session before restarting
        if (sessionResults) {
          console.log("Final session results on recognition end:", sessionResults);
        }
        
        // Try to restart if still recording and not paused
        if (isRecording && !isPaused) {
          console.log("Will attempt to restart in 500ms");
          setTimeout(() => {
            if (isRecording && !isPaused && !isRecognitionActiveRef.current) {
              startSpeechRecognition();
            }
          }, 500); // Increased delay to reduce rapid restarts
        }
      };
      
      // Store the reference
      recognitionRef.current = recognition;
      
      // Start it
      recognition.start();
      isRecognitionActiveRef.current = true;
      console.log("Speech recognition started");
    } catch (e) {
      console.error("Failed to create/start recognition:", e);
      isRecognitionActiveRef.current = false;
      // Show more helpful error message to the user
      setError("Failed to start speech recognition. Please try again or check your browser permissions.");
    }
  }, [isRecording, isPaused, onTranscriptUpdate, error, transcript]);
  
  // Set up speech recognition when recording state changes
  useEffect(() => {
    console.log("Recording state changed", { isRecording, isPaused });
    
    // If not recording, clean up
    if (!isRecording) {
      console.log("Not recording, cleaning up recognition");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition on state change:", e);
        }
        isRecognitionActiveRef.current = false;
      }
      return;
    }
    
    // If paused, also clean up
    if (isPaused) {
      console.log("Recording is paused, cleaning up recognition");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition when paused:", e);
        }
        isRecognitionActiveRef.current = false;
      }
      return;
    }
    
    // Otherwise, start recognition (only if not already active)
    if (!isRecognitionActiveRef.current) {
      console.log("Starting/restarting speech recognition due to state change");
      startSpeechRecognition();
    }
    
    // Clean up when unmounting or when state changes
    return () => {
      console.log("Cleaning up recognition on effect cleanup");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition in cleanup:", e);
        }
        isRecognitionActiveRef.current = false;
      }
    };
  }, [isRecording, isPaused, startSpeechRecognition]);

  // Add a global click handler as a failsafe
  useEffect(() => {
    // Only add this when recording is active
    if (!isRecording) return;

    const handleGlobalClick = (e: MouseEvent) => {
      // Check if click was on pause/resume button or its children
      const pauseButton = document.getElementById('voice-pause-button');
      const stopButton = document.getElementById('voice-stop-button');
      
      if (!pauseButton || !stopButton) return;
      
      // Check if the click target is within the pause button
      if (pauseButton.contains(e.target as Node)) {
        console.log("GLOBAL CLICK: Pause button clicked");
        const newPauseState = !isPaused;
        setIsPaused(newPauseState);
        pauseRecording(newPauseState);
      }
      
      // Check if the click target is within the stop button
      if (stopButton.contains(e.target as Node)) {
        console.log("GLOBAL CLICK: Stop button clicked");
        setIsRecording(false);
        setIsPaused(false);
        stopRecording();
      }
    };
    
    // Add the global click listener
    document.addEventListener('click', handleGlobalClick);
    
    // Clean up
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    console.log("START RECORDING CALLED");
    setError(null);
    
    // Clear transcript and reset persistent ref when starting a new recording
    setTranscript("");
    persistentTranscriptRef.current = "";
    
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
      
      // Recognition will be started by the useEffect watching isRecording
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

  const pauseRecording = (pausing: boolean) => {
    // Simplified function with clear logging
    console.log("PAUSE/RESUME RECORDING CALLED", { 
      currentPauseState: isPaused, 
      newPauseState: pausing, 
      action: pausing ? "PAUSING" : "RESUMING" 
    });
    
    if (!pausing) {
      // RESUMING
      console.log("RESUMING RECORDING");
      
      // Resume timer
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
      
      // Log current transcript for debugging
      console.log("Current transcript on resume:", transcript);
      
      // Recognition will restart via useEffect when isPaused changes
    } else {
      // PAUSING
      console.log("PAUSING RECORDING");
      
      // Log current transcript for debugging
      console.log("Current transcript on pause:", transcript);
      
      // Stop recognition when pausing
      if (recognitionRef.current) {
        try {
          console.log("Stopping recognition for pause");
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error pausing recognition:", e);
        }
        isRecognitionActiveRef.current = false;
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
    // Simplified function with more logging
    console.log("STOP RECORDING CALLED");
    
    // Stop recognition first
    if (recognitionRef.current) {
      try {
        console.log("Stopping recognition");
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      // Immediately mark as inactive to prevent restarts
      isRecognitionActiveRef.current = false;
      recognitionRef.current = null;
    }
    
    // Stop media tracks
    if (mediaRecorderRef.current) {
      try {
        console.log("Stopping media tracks");
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      } catch (e) {
        console.error("Error stopping media tracks:", e);
      }
    }

    // Stop timer
    console.log("STOPPING TIMER");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    console.log("Recording stopped completely");
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
    console.log("START BUTTON CLICKED - HANDLER");
    // Set state immediately before calling async function
    setIsRecording(true);
    setIsPaused(false);
    startRecording();
  };

  // These handlers are no longer used - we're using inline ones
  // But keeping them just in case we need to revert
  const handlePauseResumeClick = () => {
    console.log("PAUSE/RESUME BUTTON CLICKED - HANDLER");
    // Toggle pause state immediately
    const newPauseState = !isPaused;
    setIsPaused(newPauseState);
    
    if (newPauseState) {
      // Pausing
      pauseRecording(true);
    } else {
      // Resuming
      pauseRecording(false);
    }
  };

  // Handle stop button click
  const handleStopClick = () => {
    console.log("STOP BUTTON CLICKED - HANDLER");
    // Set state immediately
    setIsRecording(false);
    setIsPaused(false);
    stopRecording();
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
                console.log("CLICKED PAUSE/RESUME");
                const newPauseState = !isPaused;
                setIsPaused(newPauseState);
                pauseRecording(newPauseState);
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
                console.log("CLICKED STOP");
                setIsRecording(false);
                setIsPaused(false);
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

      {/* Add debugging information */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="w-full mt-2 border border-gray-300 rounded-md p-3 bg-gray-50 text-xs">
          <h3 className="font-bold mb-1">Debug Info:</h3>
          <ul>
            <li>isRecording: {isRecording ? 'true' : 'false'}</li>
            <li>isPaused: {isPaused ? 'true' : 'false'}</li>
            <li>recordingDuration: {recordingDuration}</li>
            <li>timerRef: {timerRef.current ? 'Active' : 'Inactive'}</li>
            <li>recognitionRef: {recognitionRef.current ? 'Available' : 'Unavailable'}</li>
            <li>isSupported: {isSupported ? 'true' : 'false'}</li>
          </ul>
          <div className="mt-2">
            <button 
              type="button" 
              className="bg-gray-200 hover:bg-gray-300 text-xs p-1 rounded"
              onClick={() => console.log({
                isRecording,
                isPaused,
                recordingDuration,
                timerRef: timerRef.current,
                recognitionRef: recognitionRef.current,
                error
              })}
            >
              Log State to Console
            </button>
          </div>
        </div>
      )}

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
