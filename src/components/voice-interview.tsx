"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Volume2, AlertCircle, CheckCircle, Play, Pause, StopCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import TopicChecklist from "@/components/topic-checklist";
import ConversationChat from "@/components/conversation-chat";

interface ConversationEntry {
  role: "ai" | "user";
  content: string;
  timestamp?: Date;
}

interface TopicItem {
  id: string;
  name: string;
  category: string;
  status: 'not-discussed' | 'briefly-discussed' | 'thoroughly-covered';
  isRequired: boolean;
  keywords: string[];
  description?: string;
  coverageScore: number;
}

interface SessionData {
  topics: TopicItem[];
  topicStats: any;
  topicsByCategory: Record<string, TopicItem[]>;
  interviewCompleted: boolean;
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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [currentAIQuestion, setCurrentAIQuestion] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize the interview session
  useEffect(() => {
    initializeSession();
    
    // Initialize audio context
    if (!audioContext) {
      setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
    }
  }, []);
  
  // Initialize audio player
  useEffect(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  }, []);
  
  // Initialize the session
  const initializeSession = async () => {
    try {
      setIsInitializing(true);
      
      // Start with the first question
      const response = await fetch('/api/interview/interview-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId,
          initialContext: taskDefinition.description || '',
          procedureTitle: taskDefinition.title
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize interview session');
      }
      
      const data = await response.json();
      
      setCurrentAIQuestion(data.question);
      setQuestionsAsked(data.questionNumber);
      setSessionData(data.sessionData);
      
      toast.success('Interview session initialized successfully!');
      
    } catch (error) {
      console.error('Error initializing interview session:', error);
      toast.error('Failed to initialize interview. Please try again.');
    } finally {
      setIsInitializing(false);
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
      toast.error('Unable to access microphone. Please check permissions.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Submit the recording for processing
  const submitRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('No audio recorded');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('procedureId', procedureId);
      
      // Transcribe the audio
      const transcribeResponse = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const transcribeData = await transcribeResponse.json();
      const userResponse = transcribeData.text;
      
      if (!userResponse?.trim()) {
        toast.error('No speech detected. Please try again.');
        return;
      }
      
      // Process the turn (analyze topics, generate next question, etc.)
      const turnResponse = await fetch('/api/interview/interview-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId,
          smeResponse: userResponse,
          currentQuestion: currentAIQuestion
        }),
      });
      
      if (!turnResponse.ok) {
        throw new Error('Failed to process interview turn');
      }
      
      const turnData = await turnResponse.json();
      
      // Update conversation history
      const newHistory = [...conversationHistory];
      if (currentAIQuestion) {
        newHistory.push({ role: 'ai', content: currentAIQuestion, timestamp: new Date() });
      }
      newHistory.push({ role: 'user', content: turnData.processedResponse || userResponse, timestamp: new Date() });
      setConversationHistory(newHistory);
      
      // Update session data
      setSessionData(turnData.sessionData);
      
      // Check if interview is completed
      if (turnData.interviewCompleted) {
        setInterviewCompleted(true);
        setCurrentAIQuestion(null);
        toast.success(turnData.message || 'Interview completed successfully!');
        if (onInterviewComplete) {
          onInterviewComplete(newHistory);
        }
        return;
      }
      
      // Set flag for generating questions
      setIsGeneratingQuestions(true);
      
      // Get next question
      const nextQuestionResponse = await fetch('/api/interview/interview-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId,
          initialContext: taskDefinition.description || '',
          procedureTitle: taskDefinition.title
        }),
      });
      
      if (nextQuestionResponse.ok) {
        const nextQuestionData = await nextQuestionResponse.json();
        setCurrentAIQuestion(nextQuestionData.question);
        setQuestionsAsked(nextQuestionData.questionNumber);
        
        // Update session data if provided
        if (nextQuestionData.sessionData) {
          setSessionData(nextQuestionData.sessionData);
        }
      }

      // Turn off generating questions flag
      setIsGeneratingQuestions(false);
      
    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to process your response. Please try again.');
      setIsGeneratingQuestions(false);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };
  
  // Text to speech for AI questions
  const speakQuestion = async (text: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.audioBase64) {
          const audioBlob = base64ToBlob(data.audioBase64, 'audio/mp3');
          playAudio(audioBlob);
        }
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Play audio blob
  const playAudio = (audioBlob: Blob) => {
    if (audioPlayerRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };
  
  // Convert base64 to blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };
  
  // Force end interview
  const forceEndInterview = () => {
    setInterviewCompleted(true);
    setCurrentAIQuestion(null);
    if (onInterviewComplete) {
      onInterviewComplete(conversationHistory);
    }
    toast.success('Interview ended manually.');
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Initializing Interview Session</h3>
          <p className="text-gray-600">Generating initial topics and preparing questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Interview Session: {taskDefinition.title}
        </h1>
        <p className="text-gray-600 mb-4">
          {taskDefinition.description}
        </p>
      </div>
      
      {/* Progress Bar */}
      {sessionData?.topicStats && (
        <div className="w-full mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Interview Progress</span>
            <span className="text-sm font-medium">
              {Math.round((sessionData.topicStats.thoroughlyCovered / sessionData.topicStats.total) * 100)}% Complete
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ 
                width: `${(sessionData.topicStats.thoroughlyCovered / sessionData.topicStats.total) * 100}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>Not Discussed: {sessionData.topicStats.total - sessionData.topicStats.brieflyDiscussed - sessionData.topicStats.thoroughlyCovered}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>Briefly Discussed: {sessionData.topicStats.brieflyDiscussed}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Thoroughly Covered: {sessionData.topicStats.thoroughlyCovered}</span>
            </div>
          </div>
        </div>
      )}

      {/* Interview Status Badges */}
      {sessionData && (
        <div className="flex justify-center gap-4 text-sm mb-6">
          <Badge variant="outline">
            Questions Asked: {questionsAsked}
          </Badge>
          <Badge variant="outline">
            Required Topics: {sessionData.topicStats?.requiredCovered || 0} / {sessionData.topicStats?.required || 0}
          </Badge>
          {isGeneratingQuestions ? (
            <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700">
              <Sparkles className="w-3 h-3 animate-pulse" />
              Generating Questions...
            </Badge>
          ) : (
            <Badge 
              variant={interviewCompleted ? "default" : "secondary"}
              className={interviewCompleted ? "bg-green-600" : ""}
            >
              {interviewCompleted ? "Completed" : "In Progress"}
            </Badge>
          )}
        </div>
      )}

      {/* Main Interview Interface - 2 column layout with sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Sidebar - Topic Checklist */}
        {sessionData?.topics && (
          <div className="lg:col-span-4 xl:col-span-3 h-full">
            <TopicChecklist 
              topics={sessionData.topics}
              topicsByCategory={sessionData.topicsByCategory}
              className="sticky top-6 max-h-[calc(100vh-200px)] overflow-y-auto"
            />
          </div>
        )}

        {/* Right Side - Conversation and Controls */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Conversation Chat */}
          <ConversationChat 
            conversationHistory={conversationHistory}
            currentQuestion={currentAIQuestion}
            className="min-h-[400px]"
          />
          
          {/* Recording Controls */}
          {!interviewCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Voice Recording</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentAIQuestion && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-2">Current Question:</p>
                    <p className="text-sm text-blue-800">{currentAIQuestion}</p>
                    
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => speakQuestion(currentAIQuestion!)}
                        disabled={isProcessing}
                      >
                        <Volume2 className="w-4 h-4 mr-1" />
                        Listen
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center gap-4">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      disabled={isProcessing || isGeneratingQuestions || interviewCompleted}
                      className="bg-red-600 hover:bg-red-700"
                      size="lg"
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      size="lg"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  
                  <Button
                    onClick={forceEndInterview}
                    variant="destructive"
                    size="lg"
                    disabled={isProcessing || isGeneratingQuestions}
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    End Interview
                  </Button>
                </div>
                
                {(isProcessing || isGeneratingQuestions) && (
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {isProcessing ? "Processing your response..." : 
                       isGeneratingQuestions ? "Generating follow-up questions..." : ""}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Interview Complete Card */}
          {interviewCompleted && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Interview Completed!
                  </h3>
                  <p className="text-green-800 mb-4">
                    You've successfully covered all required topics. Your knowledge has been captured for the training module.
                  </p>
                  {sessionData && (
                    <div className="text-sm text-green-700">
                      <p>Topics covered: {sessionData.topicStats?.thoroughlyCovered || 0}</p>
                      <p>Questions answered: {questionsAsked}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 