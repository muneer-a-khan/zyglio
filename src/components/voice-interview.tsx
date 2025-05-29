"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Volume2, AlertCircle, CheckCircle, Play, Pause, StopCircle, Sparkles, Brain, HelpCircle, MessageSquare, Activity, Wifi, WifiOff } from "lucide-react";
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

interface AgentResponse {
  agentType: string;
  content: string;
  isComplete: boolean;
  timestamp: Date;
}

interface StreamingState {
  agents: Record<string, AgentResponse>;
  transcriptBuffer: string;
  wordCount: number;
}

export default function VoiceInterview({
  procedureId,
  initialSessionId,
  taskDefinition,
  onInterviewComplete,
}: VoiceInterviewProps) {
  // Original states
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
  
  // New streaming states
  const [streamingState, setStreamingState] = useState<StreamingState>({
    agents: {},
    transcriptBuffer: '',
    wordCount: 0
  });
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [primaryResponse, setPrimaryResponse] = useState<{
    responseText: string;
    priority: 'validation' | 'clarification' | 'follow-up';
  } | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize the interview session
  useEffect(() => {
    initializeSession();
    initializeSpeechRecognition();
    
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
  
  // Initialize speech recognition for streaming
  const initializeSpeechRecognition = () => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
  
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
  
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
  
          // Update display
          setCurrentTranscript(finalTranscript + interimTranscript);
  
          // Process final transcripts immediately if streaming is enabled
          if (finalTranscript.trim() && streamingEnabled) {
            processTranscriptChunk(finalTranscript.trim());
          }
        };
  
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          isRecognitionActiveRef.current = false;
        };
  
        recognition.onend = () => {
          setIsRecording(false);
          isRecognitionActiveRef.current = false;
          
          // Process any remaining content when recording stops
          if (currentTranscript.trim() && streamingEnabled) {
            forceProcessBuffer();
          }
        };
  
        recognitionRef.current = recognition;
      }
    }
  };

  // Simple transcript buffering
  const processTranscriptChunk = async (chunk: string) => {
    const newBuffer = streamingState.transcriptBuffer + ' ' + chunk;
    const wordCount = newBuffer.split(/\s+/).filter(word => word.length > 0).length;
    
    setStreamingState(prev => ({
      ...prev,
      transcriptBuffer: newBuffer,
      wordCount
    }));

    // Trigger agents if we have enough words or complete sentences
    if (wordCount >= 20 || chunk.match(/[.!?]+\s*$/)) {
      await triggerStreamingAgents(newBuffer);
    }
  };

  // Force process current buffer
  const forceProcessBuffer = async () => {
    if (streamingState.transcriptBuffer.trim()) {
      await triggerStreamingAgents(streamingState.transcriptBuffer);
    }
  };

  // Simple streaming agents using OpenAI
  const triggerStreamingAgents = async (transcript: string) => {
    if (!sessionData) return;

    try {
      // Quick validation check
      const validationPrompt = `Briefly analyze this transcript for any obvious errors or safety concerns: "${transcript}"`;
      
      const validationResponse = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: validationPrompt }],
          model: 'gpt-4o',
          max_tokens: 150
        }),
      });

      if (validationResponse.ok) {
        const validationData = await validationResponse.json();
        setStreamingState(prev => ({
          ...prev,
          agents: {
            ...prev.agents,
            validation: {
              agentType: 'validation',
              content: validationData.content || 'No issues detected.',
              isComplete: true,
              timestamp: new Date()
            }
          }
        }));
      }

      // Quick follow-up question generation
      const followUpPrompt = `Based on this transcript about ${taskDefinition.title}, generate one concise follow-up question: "${transcript}"`;
      
      const followUpResponse = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: followUpPrompt }],
          model: 'gpt-4o',
          max_tokens: 100
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        setStreamingState(prev => ({
          ...prev,
          agents: {
            ...prev.agents,
            'follow-up': {
              agentType: 'follow-up',
              content: followUpData.content || 'Could you elaborate further?',
              isComplete: true,
              timestamp: new Date()
            }
          }
        }));

        // Set as primary response
        setPrimaryResponse({
          responseText: followUpData.content || 'Could you elaborate further?',
          priority: 'follow-up'
        });
      }

    } catch (error) {
      console.error('Error with streaming agents:', error);
    }
  };

  // Toggle streaming mode
  const toggleStreamingMode = () => {
    setStreamingEnabled(!streamingEnabled);
    if (!streamingEnabled) {
      // Clear existing agents when enabling streaming
      setStreamingState({
        agents: {},
        transcriptBuffer: '',
        wordCount: 0
      });
      setPrimaryResponse(null);
      toast.success('Streaming mode enabled - AI will analyze your speech in real-time');
    } else {
      toast.info('Streaming mode disabled - switched back to traditional recording');
    }
  };
  
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
      
      // Automatically speak the first question
      if (data.question) {
        setTimeout(() => {
          speakQuestion(data.question);
        }, 1000); // Small delay to ensure UI has rendered
      }
      
    } catch (error) {
      console.error('Error initializing interview session:', error);
      toast.error('Failed to initialize interview. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  // Modified start recording for both modes
  const startRecording = async () => {
    try {
      if (streamingEnabled && recognitionRef.current) {
        // Use speech recognition for streaming
        setCurrentTranscript('');
        recognitionRef.current.start();
        setIsRecording(true);
        isRecognitionActiveRef.current = true;
      } else {
        // Use traditional recording
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
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to access microphone. Please check permissions.');
    }
  };
  
  // Modified stop recording for both modes
  const stopRecording = () => {
    if (streamingEnabled && recognitionRef.current && isRecognitionActiveRef.current) {
      recognitionRef.current.stop();
    } else if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Submit the recording for processing (traditional mode)
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

      // Process the turn
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
      const newHistory = [
        ...conversationHistory,
        { role: 'ai' as const, content: currentAIQuestion || '', timestamp: new Date() },
        { role: 'user' as const, content: userResponse, timestamp: new Date() }
      ];
      
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
        
        // Automatically speak the new question
        if (nextQuestionData.question) {
          setTimeout(() => {
            speakQuestion(nextQuestionData.question);
          }, 1000); // Small delay to ensure UI has updated
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
    }
  };

  // Speak a question using text-to-speech
  const speakQuestion = async (text: string) => {
    try {
      // First try browser TTS as fallback
      useBrowserTTS(text);
      
      // Optional: Try server TTS for better quality
      try {
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
            const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg');
            playAudio(audioBlob);
          }
        }
      } catch (serverTTSError) {
        console.warn('Server TTS failed, using browser TTS:', serverTTSError);
      }
      
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      toast.error('Failed to play audio. You can still read the question above.');
    }
  };

  // Browser-based text-to-speech fallback
  const useBrowserTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setIsPlaying(true);
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Browser TTS error:', event);
        setIsPlaying(false);
      };
      
      // Try to use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
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

  // Get agent status icon
  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'validation': return <AlertCircle className="w-4 h-4" />;
      case 'clarification': return <HelpCircle className="w-4 h-4" />;
      case 'follow-up': return <MessageSquare className="w-4 h-4" />;
      case 'topic-analysis': return <Activity className="w-4 h-4" />;
      case 'topic-discovery': return <Brain className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Get agent color
  const getAgentColor = (agentType: string, isActive: boolean) => {
    if (isActive) return 'bg-blue-100 text-blue-800 border-blue-200';
    
    switch (agentType) {
      case 'validation': return 'bg-red-50 text-red-700 border-red-200';
      case 'clarification': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'follow-up': return 'bg-green-50 text-green-700 border-green-200';
      case 'topic-analysis': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'topic-discovery': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
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
        
        {/* Streaming Mode Toggle */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            onClick={toggleStreamingMode}
            variant={streamingEnabled ? "default" : "outline"}
            className={`flex items-center gap-2 ${streamingEnabled ? 'bg-blue-600 text-white' : ''}`}
          >
            {streamingEnabled ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {streamingEnabled ? 'Streaming Mode: ON' : 'Streaming Mode: OFF'}
          </Button>
          
          {streamingEnabled && streamingState.wordCount > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Brain className="w-3 h-3" />
              Buffer: {streamingState.wordCount} words
            </Badge>
          )}
        </div>
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

      {/* Streaming Agents Panel - Only show when streaming is enabled */}
      {streamingEnabled && Object.keys(streamingState.agents).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(streamingState.agents).map(([agentType, response]) => (
            <Card 
              key={agentType}
              className={`border-2 ${getAgentColor(agentType, !response.isComplete)}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {getAgentIcon(agentType)}
                  {agentType.charAt(0).toUpperCase() + agentType.slice(1).replace('-', ' ')}
                  {response.isComplete && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  {response.content && (
                    <div className="p-2 bg-white rounded border">
                      {response.content}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Primary Response - Show when available in streaming mode */}
      {streamingEnabled && primaryResponse && (
        <Card className="border-2 border-blue-200 bg-blue-50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <MessageSquare className="w-5 h-5" />
              AI Response ({primaryResponse.priority})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-lg border">
              <p className="text-gray-900">{primaryResponse.responseText}</p>
            </div>
          </CardContent>
        </Card>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Interview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Current Question */}
          {currentAIQuestion && !interviewCompleted && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Volume2 className="w-5 h-5" />
                  Current Question (#{questionsAsked})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg mb-4 text-blue-900">
                  {currentAIQuestion}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => speakQuestion(currentAIQuestion)}
                    variant="outline"
                    size="sm"
                    disabled={isPlaying}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Replay Question
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recording Controls */}
          {!interviewCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  {streamingEnabled ? 'Live Voice Response' : 'Voice Response'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "default"}
                    size="lg"
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-5 h-5" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  
                  {streamingEnabled && (
                    <Button
                      onClick={forceProcessBuffer}
                      variant="outline"
                      disabled={!streamingState.wordCount}
                    >
                      Process Buffer
                    </Button>
                  )}
                  
                  <Button
                    onClick={forceEndInterview}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    End Interview
                  </Button>
                </div>

                {isProcessing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing your response...</span>
                  </div>
                )}

                {/* Live transcript display for streaming mode */}
                {streamingEnabled && currentTranscript && (
                  <div className="p-3 bg-gray-50 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Live transcript:</p>
                    <p className="text-gray-900">{currentTranscript}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interview Completion */}
          {interviewCompleted && (
            <div className="space-y-5">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6 pb-6">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Interview Completed!
                    </h3>
                    <p className="text-green-800 mb-4">
                      You've successfully captured the key concepts and information. Here's a summary of what was covered:
                    </p>
                    {sessionData && (
                      <div className="text-sm text-green-700">
                        <p>Topics covered: {sessionData.topicStats?.thoroughlyCovered || 0} thoroughly, {sessionData.topicStats?.brieflyDiscussed || 0} briefly</p>
                        <p>Questions answered: {questionsAsked}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Conversation History */}
              <Card>
                <CardHeader>
                  <CardTitle>Interview Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversationChat 
                    conversationHistory={conversationHistory}
                    className="max-h-96 overflow-y-auto"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column - Topic Checklist */}
        <div className="space-y-6">
          {sessionData && (
            <TopicChecklist 
              topics={sessionData.topics}
              topicsByCategory={sessionData.topicsByCategory}
            />
          )}
        </div>
      </div>
    </div>
  );
} 