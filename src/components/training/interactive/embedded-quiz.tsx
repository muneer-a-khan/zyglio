'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface EmbeddedQuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export function EmbeddedQuiz({ questions, onComplete }: EmbeddedQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const currentQuestion = questions[currentQuestionIndex];
  
  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return; // Don't allow changing answer after feedback is shown
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };
  
  const checkAnswer = () => {
    setShowFeedback(true);
  };
  
  const nextQuestion = () => {
    setShowFeedback(false);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      questions.forEach((question, index) => {
        if (selectedAnswers[index] === question.correctAnswer) {
          correctCount++;
        }
      });
      
      const score = Math.round((correctCount / questions.length) * 100);
      setIsCompleted(true);
      onComplete(score);
    }
  };
  
  if (isCompleted) {
    // Calculate final score
    let correctCount = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / questions.length) * 100);
    
    return (
      <div className="text-center py-4">
        <div className="mb-4">
          <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
        </div>
        <h3 className="text-xl font-bold mb-2">Quiz Completed</h3>
        <p className="text-gray-600 mb-4">You scored {score}% ({correctCount} out of {questions.length})</p>
      </div>
    );
  }
  
  const isAnswerSelected = selectedAnswers[currentQuestionIndex] !== undefined;
  const isAnswerCorrect = selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer;
  
  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600">
        Question {currentQuestionIndex + 1} of {questions.length}
      </div>
      
      <div className="text-lg font-medium mb-4">{currentQuestion.question}</div>
      
      <RadioGroup 
        value={selectedAnswers[currentQuestionIndex]?.toString()} 
        onValueChange={(value) => handleAnswerSelect(parseInt(value))}
      >
        {currentQuestion.options.map((option, index) => (
          <div 
            key={index} 
            className={`flex items-center space-x-2 p-3 rounded-md border ${
              showFeedback && index === currentQuestion.correctAnswer 
                ? 'bg-green-50 border-green-300' 
                : showFeedback && index === selectedAnswers[currentQuestionIndex] && !isAnswerCorrect
                  ? 'bg-red-50 border-red-300'
                  : 'border-gray-200'
            }`}
          >
            <RadioGroupItem 
              value={index.toString()} 
              id={`option-${index}`} 
              disabled={showFeedback}
            />
            <Label 
              htmlFor={`option-${index}`} 
              className="flex-1 cursor-pointer"
            >
              {option}
            </Label>
            {showFeedback && index === currentQuestion.correctAnswer && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {showFeedback && index === selectedAnswers[currentQuestionIndex] && !isAnswerCorrect && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        ))}
      </RadioGroup>
      
      {showFeedback && currentQuestion.explanation && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
          <p className="font-medium mb-1">Explanation:</p>
          <p>{currentQuestion.explanation}</p>
        </div>
      )}
      
      <div className="flex justify-end">
        {!showFeedback ? (
          <Button 
            onClick={checkAnswer} 
            disabled={!isAnswerSelected}
          >
            Check Answer
          </Button>
        ) : (
          <Button onClick={nextQuestion}>
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Button>
        )}
      </div>
    </div>
  );
} 