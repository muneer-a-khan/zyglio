'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  SkipForward,
  Award,
  Clock,
  Volume2,
  AlertTriangle,
  CheckCircle,
  Trophy,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface AdaptiveVoiceCertificationProps {
  moduleId: string;
  userId: string;
  onComplete: (result: { passed: boolean; score: number; certificationId: string }) => void;
}

interface VoiceQuestion {
  id: string;
  type: string;
  difficulty: string;
  question: string;
  expectedKeywords: string[];
  competencyArea: string;
  points: number;
  scoringCriteria: {
    excellent: string;
    good: string;
    adequate: string;
    poor: string;
  };
}

interface CertificationData {
  id: string;
  status: string;
  adaptiveDifficulty: string;
  passingThreshold: number;
  estimatedDuration: number;
  totalQuestions: number;
  currentQuestion: VoiceQuestion;
}

export function AdaptiveVoiceCertification({ moduleId, userId, onComplete }: AdaptiveVoiceCertificationProps) {
  const [certification, setCertification] = useState<CertificationData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startCertification();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      
      // Clean up audio resources
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Add effect to check if we need to complete certification
  useEffect(() => {
    // Check if we have a certification and have processed all questions
    if (certification && 
        responses.length > 0 && 
        currentQuestionIndex >= certification.totalQuestions && 
        !showResults) {
      console.log("All questions completed, finishing certification");
      finishCertification(responses);
    }
  }, [currentQuestionIndex, certification, responses.length, showResults]);

  const getCurrentQuestion = () => {
    if (!certification) return null;
    
    // If currentQuestion is already set, use it
    if (certification.currentQuestion) {
      return certification.currentQuestion;
    }
    
    // Try to get from voiceInterviewData
    const voiceInterviewData = certification.voiceInterviewData as any;
    if (voiceInterviewData?.questions && Array.isArray(voiceInterviewData.questions)) {
      const currentIndex = voiceInterviewData.currentQuestionIndex || 0;
      return voiceInterviewData.questions[currentIndex];
    }
    
    return null;
  };

  useEffect(() => {
    // Start timer when certification begins
    if (certification && !showResults) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [certification, showResults]);

  const startCertification = async () => {
    setLoading(true);
    try {
      // Check if we already have a certification in progress
      if (certification) {
        console.log("Certification already in progress, skipping API call");
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/certification/voice-interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, moduleId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Certification started successfully:", data);
        setCertification(data.certification);
        
        // Read the first question aloud
        if (data.certification.currentQuestion) {
          console.log("Speaking first question:", data.certification.currentQuestion.question);
          await speakText(data.certification.currentQuestion.question);
        } else {
          console.error("No current question found in certification data");
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start voice certification');
      }
    } catch (error) {
      console.error('Error starting certification:', error);
      toast.error('Failed to start voice certification');
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      console.log("Synthesizing speech for:", text);
      
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        console.log("Creating new audio element");
        audioRef.current = new Audio();
        document.body.appendChild(audioRef.current);
        
        // Add event listeners
        audioRef.current.addEventListener('play', () => {
          console.log("Audio play event triggered");
          setIsPlaying(true);
        });
        
        audioRef.current.addEventListener('ended', () => {
          console.log("Audio ended event triggered");
          setIsPlaying(false);
        });
        
        audioRef.current.addEventListener('error', (e) => {
          console.error("Audio error event:", e);
          setIsPlaying(false);
        });
      }
      
      // Make the request to the speech synthesis API
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      console.log("Speech synthesis response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        // Check if the response is JSON (error) or audio blob (success)
        const contentType = response.headers.get('content-type');
        console.log("Response content type:", contentType);
        
        if (contentType && contentType.includes('application/json')) {
          // This is an error response
          const data = await response.json();
          console.error("Speech synthesis error:", data);
          
          // Use browser's speech synthesis as fallback
          if ('speechSynthesis' in window) {
            console.log("Using browser speech synthesis as fallback");
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
            
            utterance.onend = () => {
              setIsPlaying(false);
            };
          } else {
            throw new Error("Browser doesn't support speech synthesis");
          }
        } else {
          // This is an audio blob response
          const voiceUsed = response.headers.get('x-voice-used') || 'unknown';
          console.log(`Received audio from ElevenLabs (voice: ${voiceUsed})`);
          
          const audioBlob = await response.blob();
          console.log("Audio blob size:", audioBlob.size, "bytes");
          
          if (audioBlob.size === 0) {
            throw new Error("Received empty audio blob");
          }
          
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log("Created audio URL:", audioUrl);
          
          if (audioRef.current) {
            // Set audio properties
            audioRef.current.src = audioUrl;
            audioRef.current.volume = 1.0; // Ensure volume is at maximum
            audioRef.current.controls = true; // For debugging
            
            // Set up event listeners for debugging
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log("Audio playback started successfully");
                  setIsPlaying(true);
                })
                .catch(err => {
                  console.error("Audio playback error:", err);
                  
                  // Try to play again after a short delay
                  setTimeout(() => {
                    console.log("Retrying audio playback...");
                    audioRef.current?.play()
                      .then(() => console.log("Retry successful"))
                      .catch(retryErr => {
                        console.error("Retry failed:", retryErr);
                        toast.error("Failed to play audio. Check your speakers and volume.");
                        
                        // Use browser TTS as fallback
                        if ('speechSynthesis' in window) {
                          const utterance = new SpeechSynthesisUtterance(text);
                          window.speechSynthesis.speak(utterance);
                        }
                      });
                  }, 500);
                });
            }
            
            // Clean up when done
            audioRef.current.onended = () => {
              console.log("Audio playback ended");
              setIsPlaying(false);
              URL.revokeObjectURL(audioUrl);
            };
          } else {
            console.error("No audio element reference");
          }
        }
      } else {
        // Handle HTTP error
        let errorMessage = `HTTP error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If can't parse JSON, try text
          try {
            errorMessage = await response.text();
          } catch {
            // If all fails, use default message
          }
        }
        
        console.error("Speech synthesis API error:", errorMessage);
        toast.error("Failed to generate speech. Using text only.");
        
        // Try browser TTS as fallback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
          setIsPlaying(true);
          
          utterance.onend = () => {
            setIsPlaying(false);
          };
        }
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      toast.error("Speech synthesis failed. Please read the questions.");
      
      // Try browser TTS as final fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      
      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  };

  const submitResponse = async () => {
    if (!audioBlob || !certification) {
      toast.error('Please record your response first');
      return;
    }

    setLoading(true);
    try {
      // Transcribe the audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'response.wav');
      
      console.log("Submitting audio for transcription...");
      const transcribeResponse = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (transcribeResponse.ok) {
        const responseData = await transcribeResponse.json();
        console.log("Transcription response:", responseData);
        const transcript = responseData.transcript || responseData.text || "No transcription available";
        
        // Score the response using AI
        const currentQuestion = getCurrentQuestion();
        if (!currentQuestion) {
          toast.error("Current question not found");
          return;
        }
        console.log("Scoring response for question:", currentQuestion.id);
        try {
          const scoreResponse = await fetch('/api/certification/voice-interview/score', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              certificationId: certification.id,
              questionId: currentQuestion.id,
              transcript
              // Removed audioBlob to reduce payload size
            }),
          });

          let scoreData;
          if (scoreResponse.ok) {
            scoreData = await scoreResponse.json();
            console.log("Score response:", scoreData);
          } else {
            // Handle error response
            const errorText = await scoreResponse.text();
            console.error("Error scoring response:", errorText);
            
            // Use fallback scoring if API fails
            scoreData = {
              success: true,
              score: Math.ceil(5 * 0.7), // Default 70% score as fallback
              feedback: "Response processed with fallback scoring due to server error.",
              nextQuestion: null
            };
            
            // Try to get the next question manually
            if (currentQuestionIndex < certification.totalQuestions - 1) {
              // Attempt to get the next question from voiceInterviewData
              const nextQuestionIndex = currentQuestionIndex + 1;
              const questions = certification.voiceInterviewData?.questions;
              if (questions && questions[nextQuestionIndex]) {
                scoreData.nextQuestion = questions[nextQuestionIndex];
              }
            }
          }
          
          const newResponse = {
            questionId: currentQuestion?.id || `question-${currentQuestionIndex}`,
            transcript,
            score: scoreData.score || 3,
            feedback: scoreData.feedback || "Response recorded",
            competencyArea: currentQuestion?.competencyArea || "General Knowledge"
          };
          
          setResponses([...responses, newResponse]);
          
          // Move to next question or finish
          console.log(`Current question index: ${currentQuestionIndex}, Total questions: ${certification.totalQuestions}`);
          console.log(`Is last question? ${currentQuestionIndex >= certification.totalQuestions - 1}`);
          
          if (currentQuestionIndex < certification.totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setAudioBlob(null);
            
            // Get next question and speak it
            const nextQuestion = scoreData.nextQuestion;
            if (nextQuestion) {
              setCertification({
                ...certification,
                currentQuestion: nextQuestion
              });
              await speakText(nextQuestion.question);
            } else {
              // Fallback if nextQuestion is not provided
              toast.warning("Could not retrieve next question. Please refresh the page if issues persist.");
              
              // Try to advance manually
              if (certification.voiceInterviewData?.questions) {
                const nextQuestionIndex = currentQuestionIndex + 1;
                const nextQuestion = certification.voiceInterviewData.questions[nextQuestionIndex];
                if (nextQuestion) {
                  setCertification({
                    ...certification,
                    currentQuestion: nextQuestion
                  });
                  await speakText(nextQuestion.question);
                }
              }
            }
          } else {
            // Finish certification
            console.log("On last question, finishing certification");
            const updatedResponses = [...responses, newResponse];
            console.log(`Total responses: ${updatedResponses.length}`);
            finishCertification(updatedResponses);
          }
        } catch (scoreError) {
          console.error("Error in scoring process:", scoreError);
          toast.error("Error scoring your response. Moving to next question.");
          
          // Try to advance anyway
          if (currentQuestionIndex < certification.totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setAudioBlob(null);
            
            // Try to get next question manually
            if (certification.voiceInterviewData?.questions) {
              const nextQuestionIndex = currentQuestionIndex + 1;
              const nextQuestion = certification.voiceInterviewData.questions[nextQuestionIndex];
              if (nextQuestion) {
                setCertification({
                  ...certification,
                  currentQuestion: nextQuestion
                });
                await speakText(nextQuestion.question);
              }
            }
          }
        }
      } else {
        const errorText = await transcribeResponse.text();
        console.error("Error transcribing audio:", errorText);
        toast.error('Failed to transcribe audio. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to process your response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const finishCertification = async (allResponses: any[]) => {
    if (!certification) return;

    try {
      console.log("Finishing certification with responses:", allResponses.length);
      console.log("Last question index:", currentQuestionIndex, "Total questions:", certification.totalQuestions);
      
      const response = await fetch('/api/certification/voice-interview/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificationId: certification.id,
          responses: allResponses,
          timeElapsed
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Certification complete response:", data);
        setFinalScore(data.overallScore);
        setShowResults(true);
        
        onComplete({
          passed: data.passed,
          score: data.overallScore,
          certificationId: certification.id
        });
      } else {
        const errorText = await response.text();
        console.error("Error completing certification:", errorText);
        throw new Error('Failed to complete certification: ' + errorText);
      }
    } catch (error) {
      console.error('Error completing certification:', error);
      toast.error('Failed to complete certification');
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderResults = () => {
    const passed = finalScore >= (certification?.passingThreshold || 70);
    
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <Card className={`${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {passed ? (
                  <Trophy className="w-10 h-10 text-green-600" />
                ) : (
                  <X className="w-10 h-10 text-red-600" />
                )}
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-900' : 'text-red-900'}`}>
                {passed ? 'Certification Achieved!' : 'Certification Not Achieved'}
              </h2>
              <p className={`text-lg mb-4 ${passed ? 'text-green-800' : 'text-red-800'}`}>
                Final Score: {finalScore}% (Required: {certification?.passingThreshold}%)
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(timeElapsed)}
                </span>
                <span>Questions: {responses.length}/{certification?.totalQuestions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competency Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Competency Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                responses.reduce((acc: { [key: string]: { total: number; scored: number } }, response) => {
                  if (!acc[response.competencyArea]) {
                    acc[response.competencyArea] = { total: 0, scored: 0 };
                  }
                  acc[response.competencyArea].total += 5; // Assuming 5 is max points
                  acc[response.competencyArea].scored += response.score;
                  return acc;
                }, {})
              ).map(([area, scores]) => {
                const percentage = Math.round((scores.scored / scores.total) * 100);
                return (
                  <div key={area}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{area}</span>
                      <span className="text-sm text-gray-600">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {passed && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6 text-center">
              <Award className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Congratulations!
              </h3>
              <p className="text-yellow-800">
                You are now certified in this procedure. Your certification will be added to your dashboard.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading && !certification) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Starting your voice certification...</p>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    return (
      <Card>
        <CardContent className="pt-6">
          {renderResults()}
        </CardContent>
      </Card>
    );
  }

  if (!certification) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Start Certification</h3>
          <p className="text-gray-600">Please make sure you have completed all required quizzes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Voice Certification Interview
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Difficulty: {certification.adaptiveDifficulty} • 
                Passing Score: {certification.passingThreshold}%
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {formatTime(timeElapsed)}
              </div>
              <Badge variant="outline">
                Question {currentQuestionIndex + 1} of {certification.totalQuestions}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Interview Progress</span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentQuestionIndex + 1) / certification.totalQuestions) * 100)}% Complete
            </span>
          </div>
          <Progress 
            value={((currentQuestionIndex + 1) / certification.totalQuestions) * 100} 
            className="h-2" 
          />
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Current Question</CardTitle>
            <Badge variant="outline">{certification.currentQuestion.competencyArea}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Volume2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-900 font-medium mb-2">
                  {getCurrentQuestion()?.question || "Loading question..."}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const question = getCurrentQuestion();
                      if (question?.question) {
                        speakText(question.question);
                      } else {
                        toast.error("Question text not available");
                      }
                    }}
                    disabled={isPlaying}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'Playing...' : 'Repeat Question'}
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {getCurrentQuestion()?.difficulty || "normal"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Recording Controls */}
          <div className="space-y-4">
            <div className="text-center">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  size="lg"
                >
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              )}
            </div>

            {audioBlob && (
              <div className="text-center space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 text-sm">Response recorded successfully!</p>
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={playRecording} size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Play Recording
                  </Button>
                  <Button 
                    onClick={submitResponse} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Processing...' : 'Submit Response'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Question Actions */}
          <div className="flex justify-center items-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Tip: Speak clearly and provide detailed answers
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audio element for playback - visible for debugging */}
      <audio 
        ref={audioRef} 
        controls 
        style={{ 
          display: 'block', 
          width: '100%', 
          marginBottom: '10px' 
        }} 
      />
    </div>
  );
} 