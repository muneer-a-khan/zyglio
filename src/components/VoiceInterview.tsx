"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface ConversationEntry {
  role: "ai" | "user";
  content: string;
}

interface VoiceInterviewProps {
  procedureId: string;
  initialSessionId?: string;
  taskDefinition: {
    title: string;
    description?: string;
    goal?: string;
  };
  onInterviewComplete?: (conversationHistory: ConversationEntry[]) => void;
}

export default function VoiceInterview({
  procedureId,
  initialSessionId,
  taskDefinition,
  onInterviewComplete,
}: VoiceInterviewProps) {
  // States
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [currentAIQuestion, setCurrentAIQuestion] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize the interview session
  useEffect(() => {
    if (!sessionId) {
      initializeSession();
    } else {
      setIsInitializing(false);
      // If we have a session ID but no conversation history, we need to ask for a first question
      if (conversationHistory.length === 0) {
        startInterviewWithoutUserInput();
      }
    }
    // Initialize audio context
    if (!audioContext) {
      setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
    }
  }, [sessionId]);
  
  // Initialize audio player
  useEffect(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  }, []);
  
  // Initialize the session with RAG context
  const initializeSession = async () => {
    try {
      setIsInitializing(true);
      
      const response = await fetch('/api/rag/generate-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId,
          taskDefinition,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize interview session');
      }
      
      const data = await response.json();
      setSessionId(data.sessionId);
      
      // Start the interview by generating the first AI question
      startInterviewWithoutUserInput();
    } catch (error) {
      console.error('Error initializing interview session:', error);
      toast.error('Failed to initialize interview. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };
  
  // Start interview without user input (used for first question)
  const startInterviewWithoutUserInput = async () => {
    if (!sessionId) return;
    
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/deepseek/interview-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          isFirstQuestion: true,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate first question');
      }
      
      const data = await response.json();
      
      // Add AI question to conversation history
      const newHistory = [...conversationHistory];
      newHistory.push({
        role: 'ai',
        content: data.aiQuestionText,
      });
      setConversationHistory(newHistory);
      setCurrentAIQuestion(data.aiQuestionText);
      
      // Play audio if available
      if (data.aiQuestionAudio) {
        const audioBlob = base64ToBlob(data.aiQuestionAudio, 'audio/mp3');
        playAudio(audioBlob);
      }
    } catch (error) {
      console.error('Error generating first question:', error);
      toast.error('Failed to start interview. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Start recording user's answer
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = submitRecording;
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Submit the recording to the API
  const submitRecording = async () => {
    if (audioChunksRef.current.length === 0 || !sessionId) return;
    
    try {
      setIsProcessing(true);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audioBlob', audioBlob);
      
      const response = await fetch('/api/rag/interview-turn', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process interview turn');
      }
      
      const data = await response.json();
      
      // Update conversation history
      setConversationHistory(data.conversationHistory);
      setCurrentAIQuestion(data.aiQuestionText);
      
      // Play audio response
      if (data.aiQuestionAudio) {
        const audioBlob = base64ToBlob(data.aiQuestionAudio, 'audio/mp3');
        playAudio(audioBlob);
      }
    } catch (error) {
      console.error('Error processing interview turn:', error);
      toast.error('Failed to process your response. Please try again.');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };
  
  // Play audio response
  const playAudio = (audioBlob: Blob) => {
    if (!audioPlayerRef.current) return;
    
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayerRef.current.src = audioUrl;
    audioPlayerRef.current.play().catch(err => {
      console.error('Error playing audio:', err);
    });
    
    setIsPlaying(true);
  };
  
  // Replay the last AI question
  const replayLastQuestion = () => {
    if (!audioPlayerRef.current) return;
    
    audioPlayerRef.current.currentTime = 0;
    audioPlayerRef.current.play().catch(err => {
      console.error('Error replaying audio:', err);
    });
    
    setIsPlaying(true);
  };
  
  // Convert base64 to Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  };
  
  // Complete the interview
  const completeInterview = () => {
    if (onInterviewComplete && conversationHistory.length > 0) {
      onInterviewComplete(conversationHistory);
    }
  };
  
  // Render
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Voice Interview</CardTitle>
      </CardHeader>
      <CardContent>
        {isInitializing ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Initializing interview...</span>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-medium">Conversation</h3>
              <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-3">
                {conversationHistory.length === 0 ? (
                  <p className="text-muted-foreground italic">
                    Interview will begin once initialized...
                  </p>
                ) : (
                  conversationHistory.map((entry, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        entry.role === 'ai' 
                          ? 'bg-secondary text-secondary-foreground ml-10' 
                          : 'bg-muted mr-10'
                      }`}
                    >
                      <p className="font-semibold mb-1">
                        {entry.role === 'ai' ? 'AI' : 'You'}:
                      </p>
                      <p>{entry.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center space-y-4">
              {currentAIQuestion && (
                <div className="w-full text-center p-4 bg-primary/10 rounded-md">
                  <p className="font-semibold mb-2">Current question:</p>
                  <p>{currentAIQuestion}</p>
                  <Button 
                    onClick={replayLastQuestion}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={isPlaying || isRecording || isProcessing}
                  >
                    <Volume2 className="h-4 w-4 mr-1" /> Replay Audio
                  </Button>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || isPlaying || !sessionId}
                  className="rounded-full h-16 w-16 p-0"
                >
                  {isRecording ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {isRecording
                  ? "Recording... Click the button to stop"
                  : isProcessing
                  ? "Processing your response..."
                  : "Click the microphone to start recording your answer"}
              </p>
              
              <Button
                variant="outline"
                onClick={completeInterview}
                disabled={isRecording || isProcessing || conversationHistory.length < 2}
                className="mt-4"
              >
                Complete Interview
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 