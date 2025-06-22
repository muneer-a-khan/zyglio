'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, X, RotateCcw } from 'lucide-react';

interface EmbeddedQuizProps {
  questions: Array<{
    type: string;
    question: string;
    options?: string[];
    correct: any;
    explanation?: string;
  }>;
  onComplete: (score: number) => void;
}

export function EmbeddedQuiz({ questions, onComplete }: EmbeddedQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any[]>(new Array(questions.length).fill(null));
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswer = (answer: any) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);

    // Auto-advance to next question
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 500);
    } else {
      // Calculate score and show results
      setTimeout(() => {
        calculateScore(newAnswers);
      }, 500);
    }
  };

  const calculateScore = (finalAnswers: any[]) => {
    let correct = 0;
    finalAnswers.forEach((answer, index) => {
      const question = questions[index];
      if (question.type === 'multiple_choice' && answer === question.correct) {
        correct++;
      } else if (question.type === 'true_false' && answer === question.correct) {
        correct++;
      }
    });

    const percentage = Math.round((correct / questions.length) * 100);
    setScore(percentage);
    setShowResults(true);
    onComplete(percentage);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers(new Array(questions.length).fill(null));
    setShowResults(false);
    setScore(0);
  };

  const renderQuestion = () => {
    const question = questions[currentQuestion];
    const userAnswer = answers[currentQuestion];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline">
            Question {currentQuestion + 1} of {questions.length}
          </Badge>
          <div className="flex gap-1">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index < currentQuestion 
                    ? 'bg-green-500' 
                    : index === currentQuestion 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <h3 className="text-lg font-medium mb-4">{question.question}</h3>

        {question.type === 'multiple_choice' && (
          <RadioGroup
            value={userAnswer?.toString()}
            onValueChange={(value) => handleAnswer(parseInt(value))}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={index.toString()} id={`embedded-${index}`} />
                <Label htmlFor={`embedded-${index}`} className="cursor-pointer">
                  {String.fromCharCode(65 + index)}. {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === 'true_false' && (
          <RadioGroup
            value={userAnswer?.toString()}
            onValueChange={(value) => handleAnswer(value === 'true')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="embedded-true" />
              <Label htmlFor="embedded-true" className="cursor-pointer">True</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="embedded-false" />
              <Label htmlFor="embedded-false" className="cursor-pointer">False</Label>
            </div>
          </RadioGroup>
        )}
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            score >= 70 ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {score >= 70 ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <X className="w-8 h-8 text-red-600" />
            )}
          </div>
          <h3 className="text-xl font-bold mb-2">
            {score >= 70 ? 'Great Job!' : 'Keep Learning!'}
          </h3>
          <p className="text-gray-600 mb-4">
            You scored {score}% ({answers.filter((answer, index) => {
              const question = questions[index];
              return (question.type === 'multiple_choice' && answer === question.correct) ||
                     (question.type === 'true_false' && answer === question.correct);
            }).length} out of {questions.length} correct)
          </p>
        </div>

        <div className="space-y-3">
          {questions.map((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = (question.type === 'multiple_choice' && userAnswer === question.correct) ||
                             (question.type === 'true_false' && userAnswer === question.correct);

            return (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">{question.question}</p>
                    {question.explanation && (
                      <p className="text-xs text-gray-600">{question.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Button variant="outline" onClick={resetQuiz} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No quiz questions available
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        {showResults ? renderResults() : renderQuestion()}
      </CardContent>
    </Card>
  );
} 