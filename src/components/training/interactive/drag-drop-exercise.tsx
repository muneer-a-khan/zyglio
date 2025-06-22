'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, RotateCcw, GripVertical } from 'lucide-react';

interface DragDropExerciseProps {
  exercise: {
    title: string;
    description: string;
    type: 'sequence' | 'categorize' | 'match';
    items: Array<{
      id: string;
      content: string;
      category?: string;
      correctPosition?: number;
    }>;
    targets?: Array<{
      id: string;
      label: string;
      acceptsCategory?: string;
    }>;
    correctSequence?: string[];
  };
  onComplete: (result: { score: number; correct: boolean }) => void;
}

export function DragDropExercise({ exercise, onComplete }: DragDropExerciseProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [droppedItems, setDroppedItems] = useState<{ [key: string]: string[] }>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newDroppedItems = { ...droppedItems };
    
    // Remove item from previous target
    Object.keys(newDroppedItems).forEach(key => {
      newDroppedItems[key] = newDroppedItems[key].filter(id => id !== draggedItem);
    });

    // Add item to new target
    if (!newDroppedItems[targetId]) {
      newDroppedItems[targetId] = [];
    }
    newDroppedItems[targetId].push(draggedItem);

    setDroppedItems(newDroppedItems);
    setDraggedItem(null);
  };

  const checkAnswers = () => {
    let correct = 0;
    let total = 0;

    if (exercise.type === 'sequence') {
      // Check if items are in correct sequence
      const sequence = Object.values(droppedItems).flat();
      total = exercise.correctSequence?.length || 0;
      
      exercise.correctSequence?.forEach((itemId, index) => {
        if (sequence[index] === itemId) {
          correct++;
        }
      });
    } else if (exercise.type === 'categorize') {
      // Check if items are in correct categories
      total = exercise.items.length;
      
      Object.entries(droppedItems).forEach(([targetId, itemIds]) => {
        const target = exercise.targets?.find(t => t.id === targetId);
        itemIds.forEach(itemId => {
          const item = exercise.items.find(i => i.id === itemId);
          if (item && target && item.category === target.acceptsCategory) {
            correct++;
          }
        });
      });
    }

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    setScore(percentage);
    setShowResults(true);
    onComplete({ score: percentage, correct: percentage >= 70 });
  };

  const resetExercise = () => {
    setDroppedItems({});
    setShowResults(false);
    setScore(0);
    setDraggedItem(null);
  };

  const getAvailableItems = () => {
    const droppedItemIds = Object.values(droppedItems).flat();
    return exercise.items.filter(item => !droppedItemIds.includes(item.id));
  };

  const renderSequenceExercise = () => {
    const availableItems = getAvailableItems();
    const sequenceSlots = exercise.correctSequence?.length || 4;

    return (
      <div className="space-y-6">
        {/* Available Items */}
        <div>
          <h4 className="font-medium mb-3">Available Items</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-lg">
            {availableItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                className="p-3 bg-blue-100 border border-blue-300 rounded-lg cursor-move hover:bg-blue-200 transition-colors flex items-center gap-2"
              >
                <GripVertical className="w-4 h-4 text-blue-600" />
                <span className="text-sm">{item.content}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sequence Slots */}
        <div>
          <h4 className="font-medium mb-3">Arrange in Correct Order</h4>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: sequenceSlots }, (_, index) => {
              const targetId = `slot-${index}`;
              const itemsInSlot = droppedItems[targetId] || [];
              
              return (
                <div
                  key={targetId}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, targetId)}
                  className="flex-1 min-w-[150px] min-h-[80px] p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center"
                >
                  <div className="text-xs text-gray-500 mb-2">Step {index + 1}</div>
                  {itemsInSlot.map(itemId => {
                    const item = exercise.items.find(i => i.id === itemId);
                    return item ? (
                      <div
                        key={item.id}
                        className="p-2 bg-blue-100 border border-blue-300 rounded text-sm text-center"
                      >
                        {item.content}
                      </div>
                    ) : null;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderCategorizeExercise = () => {
    const availableItems = getAvailableItems();

    return (
      <div className="space-y-6">
        {/* Available Items */}
        <div>
          <h4 className="font-medium mb-3">Items to Categorize</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-lg">
            {availableItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg cursor-move hover:bg-yellow-200 transition-colors flex items-center gap-2"
              >
                <GripVertical className="w-4 h-4 text-yellow-600" />
                <span className="text-sm">{item.content}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Targets */}
        <div>
          <h4 className="font-medium mb-3">Categories</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercise.targets?.map(target => {
              const itemsInTarget = droppedItems[target.id] || [];
              
              return (
                <div
                  key={target.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, target.id)}
                  className="min-h-[120px] p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
                >
                  <h5 className="font-medium text-center mb-3">{target.label}</h5>
                  <div className="space-y-2">
                    {itemsInTarget.map(itemId => {
                      const item = exercise.items.find(i => i.id === itemId);
                      return item ? (
                        <div
                          key={item.id}
                          className="p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-center"
                        >
                          {item.content}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className="text-center space-y-4">
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
          {score >= 70 ? 'Excellent Work!' : 'Keep Practicing!'}
        </h3>
        <p className="text-gray-600 mb-4">
          You scored {score}%
        </p>
        <Button variant="outline" onClick={resetExercise} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  };

  if (showResults) {
    return (
      <Card>
        <CardContent className="pt-6">
          {renderResults()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{exercise.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{exercise.description}</p>
          </div>
          <Badge variant="outline">
            {exercise.type === 'sequence' ? 'Sequence' : 'Categorize'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {exercise.type === 'sequence' ? renderSequenceExercise() : renderCategorizeExercise()}
        
        <div className="flex justify-center pt-4">
          <Button
            onClick={checkAnswers}
            disabled={Object.keys(droppedItems).length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Check Answers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 