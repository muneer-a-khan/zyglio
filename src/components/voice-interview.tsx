"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Volume2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [currentAIQuestion, setCurrentAIQuestion] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [clarificationsMade, setClarificationsMade] = useState(false);
  const [followUpChosen, setFollowUpChosen] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [assessment, setAssessment] = useState<any>(null);
  
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
        startInterviewWithFirstQuestion();
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
      setIsBatchGenerating(true);
      startInterviewWithFirstQuestion();
    } catch (error) {
      console.error('Error initializing interview session:', error);
      toast.error('Failed to initialize interview. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };
  
  // Start interview with first question
  const startInterviewWithFirstQuestion = async () => {
    if (!sessionId) return;
    
    try {
      setIsProcessing(true);
      setIsBatchGenerating(true);
      
      // Use the new deepseek interview-question endpoint that generates batched questions
      const response = await fetch('/api/deepseek/interview-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          isFirstQuestion: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from interview-question API:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to generate first question');
      }
      
      const data = await response.json();
      
      // Add the AI question to the conversation history
      const updatedHistory = [...conversationHistory];
      updatedHistory.push({
        role: 'ai',
        content: data.aiQuestionText
      });
      
      // Update conversation history
      setConversationHistory(updatedHistory);
      setCurrentAIQuestion(data.aiQuestionText);
      setQuestionsAsked(1);
      
      // Play audio if available
      if (data.aiQuestionAudio) {
        const audioBlob = base64ToBlob(data.aiQuestionAudio, 'audio/mp3');
        playAudio(audioBlob);
      }
      
      // The generateInitialBatchOfQuestions function now generates questions directly
      // Just wait for a short time to make sure everything is initialized properly
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set batch generation to false to allow recording
      setIsBatchGenerating(false);
      
    } catch (error) {
      console.error('Error generating first question:', error);
      toast.error(`Failed to start interview: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsBatchGenerating(false);
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
      
      // Reset agent feedback states
      setValidationIssues([]);
      setClarificationsMade(false);
      setFollowUpChosen(false);
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
  
  // Submit the recording to the interview-turn API
  const submitRecording = async () => {
    if (audioChunksRef.current.length === 0 || !sessionId) return;
    
    try {
      setIsProcessing(true);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audioBlob', audioBlob);
      
      // Use the new interview-turn API that uses batched questions
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
      setQuestionsAsked(data.questionsAsked || (questionsAsked + 1));
      
      // Check if the interview is completed
      if (data.interviewCompleted) {
        setInterviewCompleted(true);
        setAssessment(data.assessment);
        
        if (onInterviewComplete) {
          onInterviewComplete(data.conversationHistory);
        }
      }
      
      // Play audio response if not completed
      if (data.aiQuestionAudio && !data.interviewCompleted) {
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
  
  // Force end the interview
  const forceEndInterview = async () => {
    if (!sessionId) return;
    
    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audioBlob', new Blob([''], { type: 'audio/webm' })); // Empty blob
      formData.append('forceEndInterview', 'true');
      
      const response = await fetch('/api/rag/interview-turn', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end interview');
      }
      
      const data = await response.json();
      
      // Update state
      setConversationHistory(data.conversationHistory);
      setInterviewCompleted(true);
      
      if (onInterviewComplete) {
        onInterviewComplete(data.conversationHistory);
      }
      
    } catch (error) {
      console.error('Error ending interview:', error);
      toast.error('Failed to end interview. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Render
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          Voice Interview
          <div className="flex gap-2">
            {!interviewCompleted && questionsAsked > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                {questionsAsked} Questions Asked
              </Badge>
            )}
            {interviewCompleted && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Interview Complete
              </Badge>
            )}
          </div>
        </CardTitle>
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
            
            {interviewCompleted ? (
              <div className="mb-4 p-4 border border-green-200 bg-green-50 rounded-md">
                <h4 className="font-medium text-green-800 flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5" /> Interview Complete
                </h4>
                {assessment && (
                  <div className="space-y-2 text-sm">
                    <p><strong>Analysis:</strong> {assessment.reasoning}</p>
                    {assessment.coveredAreas && assessment.coveredAreas.length > 0 && (
                      <div>
                        <p><strong>Covered Areas:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          {assessment.coveredAreas.map((area: string, i: number) => (
                            <li key={i}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {isBatchGenerating && (
                  <div className="mb-4 p-3 border border-blue-200 bg-blue-50 rounded-md flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                    <p className="text-blue-700 text-sm">Generating batch of questions...</p>
                  </div>
                )}
                
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
                
                <div className="flex flex-col items-center justify-center space-y-4 mt-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      size="lg"
                      variant={isRecording ? "destructive" : "default"}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing || isPlaying || !sessionId || isBatchGenerating}
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
                      : isBatchGenerating
                      ? "Preparing interview questions..."
                      : "Click the microphone to start recording your answer"}
                  </p>
                  
                  <Button
                    variant="outline"
                    onClick={forceEndInterview}
                    disabled={isRecording || isProcessing || isBatchGenerating || conversationHistory.length < 2}
                    className="mt-4"
                  >
                    End Interview
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 