'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, ArrowRight, Award } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizBank {
  id: string;
  subtopic: string;
  questions: QuizQuestion[];
  passingScore: number;
}

interface QuizInterfaceProps {
  quizBank: QuizBank;
  onComplete: (passed: boolean, score: number) => void;
}

export function QuizInterface({ quizBank, onComplete }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const questions = quizBank?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  
  // Handle edge cases
  if (!quizBank || !questions.length) {
    return (
      <Card className="w-full">
        <CardContent className="text-center py-8">
          <p className="text-gray-600">No quiz questions available for this topic.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!currentQuestion) {
    return (
      <Card className="w-full">
        <CardContent className="text-center py-8">
          <p className="text-gray-600">Unable to load quiz question.</p>
        </CardContent>
      </Card>
    );
  }
  
  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Move to the next question but don't auto-select any answer
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      
      // If the user hasn't selected an answer for the next question yet,
      // ensure it remains unselected
      if (selectedAnswers[currentQuestionIndex + 1] === undefined) {
        // No need to do anything, as the RadioGroup will use empty string as value
      }
    } else {
      setIsSubmitted(true);
      setShowResults(true);
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const calculateScore = () => {
    let correctCount = 0;
    questions.forEach((question, index) => {
      if (question && selectedAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });
    return {
      correct: correctCount,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
    };
  };
  
  const handleFinish = () => {
    const score = calculateScore();
    const passed = score.percentage >= quizBank.passingScore;
    onComplete(passed, score.percentage);
  };
  
  if (showResults) {
    const score = calculateScore();
    const passed = score.percentage >= quizBank.passingScore;
    
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-6">
            {passed ? (
              <div className="text-center">
                <div className="bg-green-100 text-green-800 rounded-full p-4 inline-block mb-4">
                  <Award className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">Congratulations!</h3>
                <p className="text-gray-600">You passed the quiz</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-red-100 text-red-800 rounded-full p-4 inline-block mb-4">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2">Not Quite There</h3>
                <p className="text-gray-600">You didn't reach the passing score</p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <div className="text-3xl font-bold mb-2">{score.percentage}%</div>
              <p className="text-gray-600">
                {score.correct} correct out of {score.total} questions
              </p>
              <p className="text-gray-600 mt-1">
                Passing score: {quizBank.passingScore}%
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Question Review</h3>
            {questions.map((question, index) => {
              if (!question) return null;
              const isCorrect = selectedAnswers[index] === question.correctAnswer;
              
              return (
                <div 
                  key={question.id} 
                  className={`p-4 rounded-lg border ${
                    isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{question.question}</p>
                      <div className="mt-2 text-sm">
                        <p className="font-medium">Your answer: {
                          selectedAnswers[index] !== undefined && question.options?.[selectedAnswers[index]]
                            ? question.options[selectedAnswers[index]]
                            : 'No answer selected'
                        }</p>
                        {!isCorrect && (
                          <p className="font-medium text-green-700 mt-1">
                            Correct answer: {question.options?.[question.correctAnswer] || 'Unknown'}
                          </p>
                        )}
                      </div>
                      {question.explanation && (
                        <p className="mt-2 text-sm text-gray-600">{question.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleFinish} className="w-full">
            {passed ? 'Complete Topic' : 'Try Again'}
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          Question {currentQuestionIndex + 1} of {questions.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-lg font-medium">{currentQuestion.question || 'Question not available'}</div>
        
        <RadioGroup 
          value={selectedAnswers[currentQuestionIndex]?.toString() || ""} 
          onValueChange={(value) => handleAnswerSelect(parseInt(value))}
        >
          {(currentQuestion.options || []).map((option, index) => (
            <div key={index} className="flex items-center space-x-2 py-2">
              <RadioGroupItem value={index.toString()} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="flex-1">{option}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        <Button 
          onClick={handleNext}
          disabled={selectedAnswers[currentQuestionIndex] === undefined}
          className="flex items-center gap-2"
        >
          {currentQuestionIndex < questions.length - 1 ? (
            <>Next <ArrowRight className="w-4 h-4" /></>
          ) : (
            'Submit'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 