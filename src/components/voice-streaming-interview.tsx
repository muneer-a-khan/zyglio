import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface StreamingInterviewProps {
  procedureId: string;
  onComplete?: (result: any) => void;
}

export function VoiceStreamingInterview({ procedureId, onComplete }: StreamingInterviewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioChunksRef = useRef<string[]>([]);

  // Initialize streaming session
  useEffect(() => {
    initializeStreamingSession();
    return () => {
      cleanup();
    };
  }, []);

  const initializeStreamingSession = async () => {
    try {
      const response = await fetch('/api/interview/stream-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          sessionId,
          task: 'topicAnalysis'
        })
      });
      
      if (response.ok) {
        console.log('Streaming session initialized');
        // Get first question
        await getNextQuestion();
      }
    } catch (error) {
      console.error('Failed to initialize streaming session:', error);
    }
  };

  const getNextQuestion = async () => {
    try {
      const response = await fetch('/api/interview/interview-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureId,
          procedureTitle: 'Current Procedure'
        })
      });
      
      const data = await response.json();
      if (data.question) {
        setCurrentQuestion(data.question);
        await speakQuestion(data.question);
      }
    } catch (error) {
      console.error('Failed to get next question:', error);
    }
  };

  const speakQuestion = async (text: string) => {
    try {
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      if (data.success && data.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        await audio.play();
      }
    } catch (error) {
      console.error('Failed to speak question:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Reset streaming response
      setStreamingResponse('');
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Convert audio chunk to text and send for streaming analysis
          await processAudioChunk(event.data);
        }
      };
      
      mediaRecorder.start(1000); // Capture chunks every second
      setIsRecording(true);
      
      // Setup streaming response listener
      setupStreamingListener();
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Finalize the streaming session
      finalizeSession();
    }
  };

  const processAudioChunk = async (audioBlob: Blob) => {
    try {
      // Convert audio to text (using your existing transcription API)
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const transcribeResponse = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData
      });
      
      const transcribeData = await transcribeResponse.json();
      if (transcribeData.text) {
        audioChunksRef.current.push(transcribeData.text);
        
        // Send text chunk for streaming analysis
        await fetch('/api/interview/stream-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chunk',
            sessionId,
            chunk: transcribeData.text
          })
        });
      }
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
    }
  };

  const setupStreamingListener = () => {
    const eventSource = new EventSource(`/api/interview/stream-analyze?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'token') {
          setStreamingResponse(prev => prev + data.content);
        } else if (data.type === 'complete') {
          setIsProcessing(false);
          // Process complete response
          handleCompleteResponse(data.content);
        }
      } catch (error) {
        console.error('Error processing streaming data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };
  };

  const handleCompleteResponse = async (response: string) => {
    try {
      // Process the interview turn
      const turnResponse = await fetch('/api/interview/interview-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureId,
          smeResponse: audioChunksRef.current.join(' '),
          currentQuestion
        })
      });
      
      const turnData = await turnResponse.json();
      
      if (turnData.interviewCompleted) {
        onComplete?.(turnData);
      } else {
        // Get next question
        await getNextQuestion();
      }
    } catch (error) {
      console.error('Failed to process interview turn:', error);
    }
  };

  const finalizeSession = async () => {
    try {
      const response = await fetch('/api/interview/stream-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          sessionId
        })
      });
      
      const data = await response.json();
      console.log('Session finalized:', data.result);
    } catch (error) {
      console.error('Failed to finalize session:', error);
    }
  };

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Question */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Current Question</h3>
        <p className="text-gray-700">{currentQuestion || 'Loading...'}</p>
      </Card>

      {/* Recording Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-full ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            disabled={isProcessing}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
            </p>
            {isProcessing && (
              <p className="text-xs text-blue-600 mt-1">Processing response...</p>
            )}
          </div>
        </div>
      </Card>

      {/* Real-time Streaming Response */}
      {streamingResponse && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">AI Analysis (Real-time)</h3>
          <div className="bg-gray-50 p-4 rounded min-h-[100px]">
            <p className="text-gray-700 whitespace-pre-wrap">
              {streamingResponse}
              <span className="animate-pulse">|</span>
            </p>
          </div>
        </Card>
      )}

      {/* Session Status */}
      <Card className="p-4">
        <div className="text-sm text-gray-600">
          <p>Session ID: {sessionId}</p>
          <p>Status: {isRecording ? 'Recording' : isProcessing ? 'Processing' : 'Ready'}</p>
          <p>Audio chunks: {audioChunksRef.current.length}</p>
        </div>
      </Card>
    </div>
  );
} 