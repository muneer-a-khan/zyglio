"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Volume2, AlertCircle, CheckCircle, Play, Pause, StopCircle, Sparkles, Brain, HelpCircle, MessageSquare, Activity } from "lucide-react";
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
  // Core states
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [currentAIQuestion, setCurrentAIQuestion] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  
  // Streaming states (always enabled)
  const [streamingState, setStreamingState] = useState<StreamingState>({
    agents: {},
    transcriptBuffer: '',
    wordCount: 0
  });
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedTranscriptRef = useRef<string>('');
  const accumulatedFinalTranscriptRef = useRef<string>('');
  
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
  
  // Initialize speech recognition for real-time streaming
  const initializeSpeechRecognition = () => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        
        // Optimize settings for better accuracy
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
        recognition.audioCapture = true;
        
        // Audio quality settings if available
        if ('audioTrack' in recognition) {
          recognition.audioTrack = true;
        }

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          // Process only new results from this event
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            
            // Use the highest confidence alternative
            let bestTranscript = result[0].transcript;
            let bestConfidence = result[0].confidence || 0;
            
            // Check other alternatives for better confidence
            for (let j = 1; j < result.length && j < 3; j++) {
              if (result[j].confidence > bestConfidence) {
                bestTranscript = result[j].transcript;
                bestConfidence = result[j].confidence;
              }
            }
            
            if (result.isFinal) {
              // Only add high-confidence final results to accumulated transcript
              if (bestConfidence > 0.7 || !result[0].confidence) { // Some browsers don't provide confidence
                accumulatedFinalTranscriptRef.current = (accumulatedFinalTranscriptRef.current + ' ' + bestTranscript).trim();
                
                // Update state
                setFinalTranscript(accumulatedFinalTranscriptRef.current);
                
                // Process for real-time analysis
                if (bestTranscript.trim() && bestTranscript !== lastProcessedTranscriptRef.current) {
                  lastProcessedTranscriptRef.current = bestTranscript;
                  processTranscriptChunk(bestTranscript.trim());
                }
              }
            } else {
              interimTranscript += bestTranscript;
            }
          }
  
          // Update display: accumulated final + current interim
          const displayTranscript = (accumulatedFinalTranscriptRef.current + ' ' + interimTranscript).trim();
          setAccumulatedTranscript(displayTranscript);
        };
  
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          
          // Handle different types of errors more gracefully
          if (event.error === 'network') {
            toast.error('Network error in speech recognition. Attempting to restart...');
            // Auto-restart after network error
            setTimeout(() => {
              if (isRecording && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                  isRecognitionActiveRef.current = true;
                } catch (e) {
                  console.error('Failed to restart recognition:', e);
                }
              }
            }, 1000);
          } else if (event.error === 'not-allowed') {
            toast.error('Microphone access denied. Please enable microphone permissions.');
            setIsRecording(false);
          } else if (event.error === 'no-speech') {
            // Don't show error for no-speech, it's normal
            console.log('No speech detected, continuing...');
          } else {
            toast.error(`Speech recognition error: ${event.error}`);
          }
        };
  
        recognition.onend = () => {
          isRecognitionActiveRef.current = false;
          if (isRecording) {
            // Auto-restart if we're still supposed to be recording
            setTimeout(() => {
              if (isRecording && recognitionRef.current) {
                recognitionRef.current.start();
                isRecognitionActiveRef.current = true;
              }
            }, 100);
          }
        };
  
        recognitionRef.current = recognition;
      }
    }
  };

  // Process transcript chunks for real-time analysis
  const processTranscriptChunk = async (chunk: string) => {
    if (!sessionData || !chunk.trim()) return;

    const newBuffer = streamingState.transcriptBuffer + ' ' + chunk;
    const wordCount = newBuffer.split(/\s+/).filter(word => word.length > 0).length;
    
    setStreamingState(prev => ({
      ...prev,
      transcriptBuffer: newBuffer,
      wordCount
    }));

    // Trigger real-time topic analysis more frequently
    await analyzeTopicCoverage(newBuffer);

    // Trigger agents for questions/validation with lower threshold for more responsiveness
    if (wordCount >= 8 || chunk.match(/[.!?]+\s*$/)) {
      await triggerStreamingAgents(newBuffer);
    }
  };

  // Real-time topic analysis and coverage update
  const analyzeTopicCoverage = async (transcript: string) => {
    if (!sessionData || !transcript.trim()) return;

    try {
      const topicAnalysisPrompt = `
Analyze this transcript segment for topic coverage in the context of "${taskDefinition.title}":
"${transcript}"

Current topics being tracked: ${sessionData.topics.map(t => t.name).join(', ')}

For each topic mentioned or related concepts discussed, respond with:
1. Topic name (if it matches existing topics)
2. Coverage level: not-discussed, briefly-discussed, or thoroughly-covered
3. Any new subtopics discovered
4. Keywords mentioned

Be specific and concise.`;

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: topicAnalysisPrompt }],
          model: 'gpt-4o',
          max_tokens: 200
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update session data with real-time topic analysis
        // This is a simplified update - in a real app you'd parse the AI response
        // and update specific topics based on the analysis
        setSessionData(prev => {
          if (!prev) return prev;
          
          // Create updated topics with improved coverage scores
          const updatedTopics = prev.topics.map(topic => {
            const isTopicMentioned = transcript.toLowerCase().includes(topic.name.toLowerCase()) ||
                                   topic.keywords.some(keyword => 
                                     transcript.toLowerCase().includes(keyword.toLowerCase())
                                   );
            
            if (isTopicMentioned) {
              const newCoverageScore = Math.min(topic.coverageScore + 0.2, 1.0);
              let newStatus = topic.status;
              
              if (newCoverageScore >= 0.8) {
                newStatus = 'thoroughly-covered';
              } else if (newCoverageScore >= 0.3) {
                newStatus = 'briefly-discussed';
              }
              
              return {
                ...topic,
                coverageScore: newCoverageScore,
                status: newStatus as 'not-discussed' | 'briefly-discussed' | 'thoroughly-covered'
              };
            }
            
            return topic;
          });

          // Recalculate topic stats
          const topicStats = {
            total: updatedTopics.length,
            required: updatedTopics.filter(t => t.isRequired).length,
            thoroughlyCovered: updatedTopics.filter(t => t.status === 'thoroughly-covered').length,
            brieflyDiscussed: updatedTopics.filter(t => t.status === 'briefly-discussed').length,
            requiredCovered: updatedTopics.filter(t => t.isRequired && t.status === 'thoroughly-covered').length
          };

          return {
            ...prev,
            topics: updatedTopics,
            topicStats
          };
        });

        // Store agent response
        setStreamingState(prev => ({
          ...prev,
          agents: {
            ...prev.agents,
            'topic-analysis': {
              agentType: 'topic-analysis',
              content: data.content || 'Topic analysis complete.',
              isComplete: true,
              timestamp: new Date()
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error analyzing topic coverage:', error);
    }
  };

  // Streaming agents for validation and follow-up
  const triggerStreamingAgents = async (transcript: string) => {
    if (!sessionData) return;

    try {
      // Run validation and follow-up agents in parallel for better performance
      const [validationResponse, followUpResponse] = await Promise.all([
        // Validation agent
        fetch('/api/openai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ 
              role: 'user', 
              content: `Validate this response about "${taskDefinition.title}": "${transcript}"
Check for accuracy, completeness, and relevance. Be brief.` 
            }],
            model: 'gpt-4o',
            max_tokens: 100
          }),
        }),
        
        // Follow-up agent
        fetch('/api/openai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ 
              role: 'user', 
              content: `Based on this response about "${taskDefinition.title}": "${transcript}"
Generate one specific follow-up question to get more detail. Be concise.` 
            }],
            model: 'gpt-4o',
            max_tokens: 80
          }),
        })
      ]);

      // Process validation response
      if (validationResponse.ok) {
        const validationData = await validationResponse.json();
        setStreamingState(prev => ({
          ...prev,
          agents: {
            ...prev.agents,
            validation: {
              agentType: 'validation',
              content: validationData.content || 'Response validated.',
              isComplete: true,
              timestamp: new Date()
            }
          }
        }));
      }

      // Process follow-up response
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
      }

    } catch (error) {
      console.error('Error with streaming agents:', error);
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
      
      // Automatically speak the first question immediately
      if (data.question) {
        // Start speaking right away - no delay
        speakQuestion(data.question);
      }
      
    } catch (error) {
      console.error('Error initializing interview session:', error);
      toast.error('Failed to initialize interview. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  // Start recording with both speech recognition and audio recording
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // Optimal for speech recognition
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Start audio recording for Whisper transcription
      let mimeType = 'audio/webm; codecs=opus';
      
      // Check for browser support and use fallback formats
      if (!MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = ''; // Use default
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;

      // Start speech recognition for real-time display
      if (recognitionRef.current && !isRecognitionActiveRef.current) {
        // Clear ALL previous transcript data for fresh start
        setCurrentTranscript('');
        setFinalTranscript('');
        setAccumulatedTranscript('');
        lastProcessedTranscriptRef.current = '';
        accumulatedFinalTranscriptRef.current = '';
        
        // Clear streaming state
        setStreamingState({
          agents: {},
          transcriptBuffer: '',
          wordCount: 0
        });
        
        recognitionRef.current.start();
        isRecognitionActiveRef.current = true;
      }

      setIsRecording(true);
      toast.success('Recording started - speak your answer');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to start recording. Please check microphone permissions.');
    }
  };
  
  // Stop recording and process with high-accuracy transcription
  const stopRecording = async () => {
    return new Promise<void>((resolve) => {
      // Stop audio recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.onstop = async () => {
          // Stop speech recognition
          if (recognitionRef.current && isRecognitionActiveRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
          }

          // Process the audio for accurate transcription
          await processAudioWithWhisper();
          resolve();
        };
        
        mediaRecorderRef.current.stop();
        
        // Stop all media tracks
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      } else {
        // Fallback: just stop speech recognition
        if (recognitionRef.current && isRecognitionActiveRef.current) {
          recognitionRef.current.stop();
          setIsRecording(false);
        }
        
        // Use the accumulated transcript from browser recognition
        setTimeout(async () => {
          await processCompleteResponse();
          resolve();
        }, 500);
      }
    });
  };

  // Process audio with Whisper for high accuracy
  const processAudioWithWhisper = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('No audio recorded. Please try again.');
      return;
    }

    try {
      setIsTranscribing(true);
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Prepare form data for Whisper API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('procedureId', procedureId);

      // Call Whisper transcription API
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      
      if (data.success && data.text) {
        // Use the high-accuracy Whisper transcript as the final transcript
        const whisperTranscript = data.text.trim();
        
        // Update our transcript states with the accurate transcript
        accumulatedFinalTranscriptRef.current = whisperTranscript;
        setFinalTranscript(whisperTranscript);
        setAccumulatedTranscript(whisperTranscript);
        
        toast.success('High-accuracy transcription complete!');
        
        // Process the complete response with the accurate transcript
        await processCompleteResponse();
      } else {
        throw new Error('No transcript received from Whisper');
      }
      
    } catch (error) {
      console.error('Error with Whisper transcription:', error);
      toast.error('High-accuracy transcription failed. Using browser transcription as fallback.');
      
      // Fallback to browser speech recognition transcript
      if (accumulatedFinalTranscriptRef.current.trim()) {
        await processCompleteResponse();
      } else {
        toast.error('No speech detected. Please try again.');
      }
    } finally {
      setIsTranscribing(false);
      
      // Clean up audio chunks
      audioChunksRef.current = [];
    }
  };

  // Process the complete response and move to next question
  const processCompleteResponse = async () => {
    const completeTranscript = accumulatedFinalTranscriptRef.current.trim();
    
    if (!completeTranscript) {
      toast.error('No speech detected. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setIsGeneratingQuestions(true);
      
      // First process the current turn
      const turnResponse = await fetch('/api/interview/interview-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId,
          smeResponse: completeTranscript,
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
        { role: 'user' as const, content: completeTranscript, timestamp: new Date() }
      ];
      
      setConversationHistory(newHistory);
      
      // Update session data
      setSessionData(turnData.sessionData);
      
      // Check if interview is completed
      if (turnData.interviewCompleted) {
        setInterviewCompleted(true);
        setCurrentAIQuestion(null);
        setIsGeneratingQuestions(false);
        toast.success(turnData.message || 'Interview completed successfully!');
        if (onInterviewComplete) {
          onInterviewComplete(newHistory);
        }
        return;
      }
      
      // Only after turn processing is complete, get the next question
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
      
      // Process next question response
      if (nextQuestionResponse.ok) {
        const nextQuestionData = await nextQuestionResponse.json();
        setCurrentAIQuestion(nextQuestionData.question);
        setQuestionsAsked(nextQuestionData.questionNumber);
        
        // Update session data if provided
        if (nextQuestionData.sessionData) {
          setSessionData(nextQuestionData.sessionData);
        }
        
        // Clear streaming agents for next question
        setStreamingState({
          agents: {},
          transcriptBuffer: '',
          wordCount: 0
        });
        
        // Automatically speak the new question using Eleven Labs
        if (nextQuestionData.question) {
          // Don't wait for TTS to complete - start it immediately
          speakQuestion(nextQuestionData.question);
        }
      }

      setIsGeneratingQuestions(false);
      
    } catch (error) {
      console.error('Error processing response:', error);
      toast.error('Failed to process your response. Please try again.');
      setIsGeneratingQuestions(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Speak a question using Eleven Labs TTS
  const speakQuestion = async (text: string) => {
    try {
      setIsPlaying(true);
      
      // Call our Eleven Labs TTS API
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model: 'eleven_flash_v2_5' // Fast model for low latency
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If Eleven Labs fails, fallback to browser TTS
        if (errorData.fallback) {
          console.warn('Falling back to browser TTS:', errorData.details);
          await fallbackToBrowserTTS(text);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to synthesize speech');
      }

      const data = await response.json();
      
      if (data.success && data.audioBase64) {
        // Convert base64 to blob and play
        const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = audioUrl;
          audioPlayerRef.current.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl); // Clean up
          };
          audioPlayerRef.current.onerror = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            toast.error('Failed to play audio');
          };
          
          await audioPlayerRef.current.play();
        }
      } else {
        throw new Error('Invalid response from TTS service');
      }
      
    } catch (error) {
      console.error('Error with Eleven Labs TTS:', error);
      setIsPlaying(false);
      
      // Fallback to browser TTS if Eleven Labs fails
      await fallbackToBrowserTTS(text);
    }
  };

  // Fallback to browser TTS if Eleven Labs fails
  const fallbackToBrowserTTS = async (text: string) => {
    try {
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
    } catch (error) {
      console.error('Error with browser TTS fallback:', error);
      setIsPlaying(false);
      toast.error('Failed to play audio. You can still read the question above.');
    }
  };

  // Helper function to convert base64 to blob
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
        
        {/* Live Analysis Status */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Badge variant="default" className="bg-blue-600 text-white flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Live AI Analysis Active
          </Badge>
          
          {streamingState.wordCount > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Processing: {streamingState.wordCount} words
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

      {/* Live AI Analysis Panel */}
      {Object.keys(streamingState.agents).length > 0 && (
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
              Generating Next Question...
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
                  Enhanced Voice Response
                </CardTitle>
                <p className="text-sm text-gray-600">
                  This system uses AI-powered transcription (OpenAI Whisper) for maximum accuracy, with real-time browser recognition for immediate feedback.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "default"}
                    size="lg"
                    disabled={isProcessing || isTranscribing}
                    className="flex items-center gap-2"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-5 h-5" />
                        Stop & Submit Answer
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        Start Recording Answer
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={forceEndInterview}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    disabled={isRecording || isProcessing || isTranscribing}
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    End Interview
                  </Button>
                </div>

                {isTranscribing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing with high-accuracy AI transcription (Whisper)...</span>
                  </div>
                )}

                {isProcessing && !isTranscribing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing your answer and generating next question...</span>
                  </div>
                )}

                {/* Live transcript display */}
                {accumulatedTranscript && (
                  <div className="p-3 bg-gray-50 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-gray-600">Live transcript:</p>
                      {isRecording && (
                        <Badge variant="outline" className="text-xs">
                          Browser Recognition (Real-time Preview)
                        </Badge>
                      )}
                      {!isRecording && !isTranscribing && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          Final Transcript (AI Enhanced)
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-900">{accumulatedTranscript}</p>
                  </div>
                )}

                {/* Recording status */}
                {isRecording && (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Recording audio for high-accuracy transcription + real-time AI analysis</span>
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