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

const VoiceRecorder = ({ onTranscriptUpdate, className }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up SpeechRecognition
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.error("Speech recognition not supported in this browser");
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
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
      setError(`Speech recognition error: ${event.error}`);
    };
    
    recognition.onend = () => {
      if (isRecording && !isPaused) {
        // If recording was not explicitly paused, but recognition ended, try to restart it
        recognition.start();
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
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Start recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      setIsRecording(true);
      setIsPaused(false);
      
      // Start timer
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Error accessing microphone. Please ensure your microphone is connected and you have granted permission to use it.');
    }
  };
  
  const pauseRecording = () => {
    if (isPaused) {
      // Resume recording
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      setIsPaused(false);
    } else {
      // Pause recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsRecording(false);
    setIsPaused(false);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="relative rounded-full bg-gray-100 h-40 w-40 flex items-center justify-center mb-3">
          {isRecording && (
            <div className={cn(
              "absolute inset-0 rounded-full border-4 border-blue-500",
              !isPaused && "animate-pulse-recording"
            )} />
          )}
          
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="bg-blue-600 hover:bg-blue-700 text-white h-20 w-20 rounded-full"
              disabled={!isSupported}
            >
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={pauseRecording}
                variant="outline"
                className="h-12 w-12 rounded-full"
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
              <Button
                onClick={stopRecording}
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
            <div className="text-xl font-bold">{formatTime(recordingDuration)}</div>
            <div className="text-sm text-gray-500 mt-1">
              {isPaused ? "Recording Paused" : "Recording..."}
            </div>
          </div>
        )}
        
        {!isRecording && (
          <div className="text-center mt-2">
            <p className="text-sm text-gray-500">Tap the microphone to start recording</p>
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
