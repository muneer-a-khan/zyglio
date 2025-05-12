
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the SpeechRecognition type since TypeScript doesn't recognize it natively
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
  resultIndex?: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
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

const VoiceRecorder = ({ onTranscriptUpdate, className }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Set up SpeechRecognition
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.error("Speech recognition not supported in this browser");
      setIsSupported(false);
      return;
    }
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentTranscript = '';
      
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      
      setTranscript(currentTranscript);
      onTranscriptUpdate(currentTranscript);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscriptUpdate]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Start recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };
  
  const pauseRecording = () => {
    if (isPaused) {
      // Resume recording
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      setIsPaused(false);
    } else {
      // Pause recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsPaused(true);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsRecording(false);
    setIsPaused(false);
  };
  
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {!isSupported && (
        <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-md text-sm">
          Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.
        </div>
      )}
      <div className="flex items-center space-x-2 mb-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            className="bg-medical-600 hover:bg-medical-700 text-white"
            size="lg"
            disabled={!isSupported}
          >
            <Mic className="mr-2 h-5 w-5" />
            Start Recording
          </Button>
        ) : (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              size="icon"
              className="h-10 w-10"
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="icon"
              className="h-10 w-10"
            >
              <Square className="h-5 w-5" />
            </Button>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm text-white bg-medical-600",
              isRecording && !isPaused && "animate-pulse-recording"
            )}>
              {isPaused ? "Paused" : "Recording"}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
