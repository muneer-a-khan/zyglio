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
    };
  }, []);

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
      const response = await fetch('/api/certification/voice-interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, moduleId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCertification(data.certification);
        
        // Read the first question aloud
        if (data.certification.currentQuestion) {
          await speakText(data.certification.currentQuestion.question);
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
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setIsPlaying(true);
          
          audioRef.current.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
          };
        }
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      // Continue without TTS if it fails
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
      
      const transcribeResponse = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (transcribeResponse.ok) {
        const { transcript } = await transcribeResponse.json();
        
        // Score the response using AI
        const scoreResponse = await fetch('/api/certification/voice-interview/score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            certificationId: certification.id,
            questionId: certification.currentQuestion.id,
            transcript,
            audioBlob: audioBlob ? await blobToBase64(audioBlob) : null
          }),
        });

        if (scoreResponse.ok) {
          const scoreData = await scoreResponse.json();
          
          const newResponse = {
            questionId: certification.currentQuestion.id,
            transcript,
            score: scoreData.score,
            feedback: scoreData.feedback,
            competencyArea: certification.currentQuestion.competencyArea
          };
          
          setResponses([...responses, newResponse]);
          
          // Move to next question or finish
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
            }
          } else {
            // Finish certification
            finishCertification([...responses, newResponse]);
          }
        } else {
          throw new Error('Failed to score response');
        }
      } else {
        throw new Error('Failed to transcribe audio');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to process your response');
    } finally {
      setLoading(false);
    }
  };

  const finishCertification = async (allResponses: any[]) => {
    if (!certification) return;

    try {
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
        setFinalScore(data.overallScore);
        setShowResults(true);
        
        onComplete({
          passed: data.passed,
          score: data.overallScore,
          certificationId: certification.id
        });
      } else {
        throw new Error('Failed to complete certification');
      }
    } catch (error) {
      console.error('Error completing certification:', error);
      toast.error('Failed to complete certification');
    }
  };

  const skipQuestion = () => {
    if (currentQuestionIndex < (certification?.totalQuestions || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setAudioBlob(null);
      toast.info('Question skipped');
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
                  {certification.currentQuestion.question}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => speakText(certification.currentQuestion.question)}
                    disabled={isPlaying}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'Playing...' : 'Repeat Question'}
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {certification.currentQuestion.difficulty}
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
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={skipQuestion} size="sm">
              <SkipForward className="w-4 h-4 mr-2" />
              Skip Question
            </Button>
            <p className="text-xs text-gray-500">
              Tip: Speak clearly and provide detailed answers
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
} 