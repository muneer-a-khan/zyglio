'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Trophy,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface QuizInterfaceProps {
  quizBank: {
    id: string;
    subtopic: string;
    questions: any[];
    passingScore: number;
  };
  userId: string;
  subtopic: string;
  onComplete: (passed: boolean, score: number) => void;
}

interface QuizResult {
  score: number;
  passed: boolean;
  passingScore: number;
  attemptNumber: number;
  detailedResults: any[];
  feedback: string;
}

export function QuizInterface({ quizBank, userId, subtopic, onComplete }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const questions = quizBank.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    // Initialize answers array
    setAnswers(new Array(questions.length).fill(null));
  }, [questions.length]);

  useEffect(() => {
    // Update time spent every second
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleAnswerChange = (answer: any) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    // Check if all questions are answered
    const unansweredQuestions = answers.findIndex(answer => answer === null || answer === undefined);
    if (unansweredQuestions !== -1) {
      toast.error(`Please answer question ${unansweredQuestions + 1} before submitting.`);
      setCurrentQuestionIndex(unansweredQuestions);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/training/quiz/${quizBank.id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          answers,
          timeSpent
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuizResult(data.attempt);
        setShowResults(true);
        onComplete(data.attempt.passed, data.attempt.score);
        
        toast.success(data.attempt.passed 
          ? `Congratulations! You passed with ${data.attempt.score}%`
          : `You scored ${data.attempt.score}%. You need ${quizBank.passingScore}% to pass.`
        );
      } else {
        throw new Error('Failed to submit quiz');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const retakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers(new Array(questions.length).fill(null));
    setTimeSpent(0);
    setQuizResult(null);
    setShowResults(false);
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const currentAnswer = answers[currentQuestionIndex];

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
            <RadioGroup 
              value={currentAnswer?.toString()} 
              onValueChange={(value) => handleAnswerChange(parseInt(value))}
            >
              {currentQuestion.options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {String.fromCharCode(65 + index)}. {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
            <RadioGroup 
              value={currentAnswer?.toString()} 
              onValueChange={(value) => handleAnswerChange(value === 'true')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 'fill_blank':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
            <Input
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Enter your answer..."
              className="w-full"
            />
          </div>
        );

      case 'short_answer':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
            <Textarea
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Enter your answer..."
              className="w-full min-h-[100px]"
            />
          </div>
        );

      default:
        return <p>Unsupported question type</p>;
    }
  };

  const renderResults = () => {
    if (!quizResult) return null;

    return (
      <div className="space-y-6">
        {/* Results Header */}
        <Card className={`${quizResult.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="pt-6">
            <div className="text-center">
              {quizResult.passed ? (
                <Trophy className="w-12 h-12 text-green-600 mx-auto mb-4" />
              ) : (
                <X className="w-12 h-12 text-red-600 mx-auto mb-4" />
              )}
              <h2 className={`text-2xl font-bold mb-2 ${quizResult.passed ? 'text-green-900' : 'text-red-900'}`}>
                {quizResult.passed ? 'Quiz Passed!' : 'Quiz Failed'}
              </h2>
              <p className={`text-lg mb-4 ${quizResult.passed ? 'text-green-800' : 'text-red-800'}`}>
                You scored {quizResult.score}% (Required: {quizResult.passingScore}%)
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                </span>
                <span>Attempt #{quizResult.attemptNumber}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quizResult.detailedResults.map((result: any, index: number) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {result.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium mb-2">
                      Question {index + 1}: {result.question}
                    </p>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="font-medium">Your answer:</span> {result.userAnswer?.toString()}
                      </p>
                      <p>
                        <span className="font-medium">Correct answer:</span> {result.correctAnswer?.toString()}
                      </p>
                      {result.explanation && (
                        <p className="text-gray-600 mt-2">
                          <span className="font-medium">Explanation:</span> {result.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {!quizResult.passed && (
            <Button onClick={retakeQuiz} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Retake Quiz
            </Button>
          )}
          <Button variant="outline" onClick={() => onComplete(quizResult.passed, quizResult.score)}>
            Continue Training
          </Button>
        </div>
      </div>
    );
  };

  if (showResults) {
    return renderResults();
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
          <p className="text-gray-600">This quiz doesn't have any questions yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quiz: {subtopic}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </span>
              <Badge variant="outline">
                Passing Score: {quizBank.passingScore}%
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
            </span>
          </div>
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardContent className="pt-6">
          {renderQuestion()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={previousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {questions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "default" : "outline"}
              size="sm"
              className={`w-8 h-8 p-0 ${
                answers[index] !== null && answers[index] !== undefined 
                  ? 'bg-green-100 border-green-300' 
                  : ''
              }`}
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
            </Button>
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button
            onClick={submitQuiz}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button onClick={nextQuestion}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
} 