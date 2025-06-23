'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  X, 
  RotateCcw, 
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface ScenarioStep {
  id: string;
  content: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }>;
}

interface ScenarioProps {
  scenario: {
    title: string;
    description: string;
    steps: ScenarioStep[];
  };
  onComplete: (result: { success: boolean; score: number }) => void;
}

export function ScenarioSimulation({ scenario, onComplete }: ScenarioProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  
  const currentStep = scenario.steps[currentStepIndex];
  
  const handleOptionSelect = (optionId: string) => {
    if (showFeedback) return;
    
    const newSelectedOptions = [...selectedOptions];
    newSelectedOptions[currentStepIndex] = optionId;
    setSelectedOptions(newSelectedOptions);
  };
  
  const handleSubmitOption = () => {
    setShowFeedback(true);
  };
  
  const handleNextStep = () => {
    setShowFeedback(false);
    
    if (currentStepIndex < scenario.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      scenario.steps.forEach((step, index) => {
        const selectedOptionId = selectedOptions[index];
        const selectedOption = step.options.find(option => option.id === selectedOptionId);
        if (selectedOption?.isCorrect) {
          correctCount++;
        }
      });
      
      const finalScore = Math.round((correctCount / scenario.steps.length) * 100);
      setScore(finalScore);
      setIsCompleted(true);
      onComplete({ success: finalScore >= 70, score: finalScore });
    }
  };
  
  const getSelectedOption = () => {
    const optionId = selectedOptions[currentStepIndex];
    return currentStep.options.find(option => option.id === optionId);
  };
  
  const isOptionSelected = selectedOptions[currentStepIndex] !== undefined;
  const selectedOption = getSelectedOption();
  
  if (isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenario Completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-4">
            <div className="mb-4">
              {score >= 70 ? (
                <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
              ) : (
                <AlertCircle className="w-12 h-12 mx-auto text-amber-600" />
              )}
            </div>
            <h3 className="text-xl font-bold mb-2">
              {score >= 70 ? 'Great job!' : 'Room for improvement'}
            </h3>
            <p className="text-gray-600 mb-4">
              You scored {score}% on this scenario simulation
            </p>
          </div>
          
          <Button onClick={() => onComplete({ success: score >= 70, score })}>
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{scenario.title}</CardTitle>
        <p className="text-gray-600 mt-1">{scenario.description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          Step {currentStepIndex + 1} of {scenario.steps.length}
        </div>
        
        <div className="p-4 bg-gray-50 border rounded-md">
          <p className="text-lg">{currentStep.content}</p>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium">What would you do?</h3>
          
          <RadioGroup 
            value={selectedOptions[currentStepIndex]} 
            onValueChange={handleOptionSelect}
          >
            {currentStep.options.map((option) => (
              <div 
                key={option.id} 
                className={`p-3 border rounded-md ${
                  showFeedback && option.isCorrect 
                    ? 'bg-green-50 border-green-300' 
                    : showFeedback && selectedOptions[currentStepIndex] === option.id && !option.isCorrect
                      ? 'bg-red-50 border-red-300'
                      : 'border-gray-200'
                }`}
              >
                <RadioGroupItem 
                  value={option.id} 
                  id={option.id} 
                  disabled={showFeedback}
                  className="mt-1"
                />
                <Label 
                  htmlFor={option.id} 
                  className="ml-2 flex-1 cursor-pointer"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        {showFeedback && selectedOption && (
          <div className={`p-4 rounded-md ${
            selectedOption.isCorrect 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="font-medium mb-1">
              {selectedOption.isCorrect ? 'Correct approach!' : 'Not the best choice.'}
            </p>
            <p>{selectedOption.feedback}</p>
          </div>
        )}
        
        <div className="flex justify-end">
          {!showFeedback ? (
            <Button 
              onClick={handleSubmitOption} 
              disabled={!isOptionSelected}
            >
              Submit
            </Button>
          ) : (
            <Button onClick={handleNextStep}>
              {currentStepIndex < scenario.steps.length - 1 ? 'Next Step' : 'Complete Scenario'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 