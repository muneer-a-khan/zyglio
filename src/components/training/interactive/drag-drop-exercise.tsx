'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

interface DragDropItem {
  id: string;
  content: string;
  correctPosition: number;
}

interface DragDropExerciseProps {
  exercise: {
    title: string;
    description: string;
    items: DragDropItem[];
  };
  onComplete: (result: { success: boolean; score: number }) => void;
}

export function DragDropExercise({ exercise, onComplete }: DragDropExerciseProps) {
  const [items, setItems] = useState<DragDropItem[]>(
    // Shuffle the items initially
    [...exercise.items].sort(() => Math.random() - 0.5)
  );
  const [draggedItem, setDraggedItem] = useState<DragDropItem | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleDragStart = (item: DragDropItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newItems = [...items];
    const draggedIndex = newItems.findIndex(item => item.id === draggedItem.id);
    
    // Remove item from its position
    const [removed] = newItems.splice(draggedIndex, 1);
    
    // Add it at the new position
    newItems.splice(targetIndex, 0, removed);
    
    setItems(newItems);
    setDraggedItem(null);
  };

  const handleSubmit = () => {
    // Calculate score based on correct positions
    let correctCount = 0;
    items.forEach((item, index) => {
      if (item.correctPosition === index) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / items.length) * 100);
    setScore(calculatedScore);
    setIsSubmitted(true);
    onComplete({ success: calculatedScore >= 70, score: calculatedScore });
  };

  const handleReset = () => {
    setItems([...exercise.items].sort(() => Math.random() - 0.5));
    setIsSubmitted(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">{exercise.title}</h3>
        <p className="text-gray-600">{exercise.description}</p>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable={!isSubmitted}
            onDragStart={() => handleDragStart(item)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`p-3 border rounded-md cursor-grab ${
              isSubmitted
                ? item.correctPosition === index
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <span>{item.content}</span>
              </div>
              {isSubmitted && item.correctPosition === index && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        {!isSubmitted ? (
          <Button onClick={handleSubmit}>Check Order</Button>
        ) : (
          <div className="w-full">
            <div className="mb-4 p-4 rounded-md bg-blue-50 border border-blue-200">
              <p className="font-medium">Your score: {score}%</p>
              <p className="text-sm text-gray-600 mt-1">
                {score >= 70 
                  ? 'Great job! You have a good understanding of the correct order.'
                  : 'Keep practicing to improve your understanding of the correct sequence.'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Try Again
              </Button>
              <Button onClick={() => onComplete({ success: score >= 70, score })}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 