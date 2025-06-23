'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, CheckCircle, MessageCircle } from 'lucide-react';

interface ReflectionPromptProps {
  title: string;
  prompt: string;
  type?: 'knowledge_check' | 'practical_tip' | 'reflection';
  hints?: string[];
  onComplete?: (reflection: string) => void;
}

export function ReflectionPrompt({ 
  title, 
  prompt, 
  type = 'reflection',
  hints = [],
  onComplete 
}: ReflectionPromptProps) {
  const [userReflection, setUserReflection] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const handleComplete = () => {
    if (userReflection.trim()) {
      setIsCompleted(true);
      onComplete?.(userReflection);
    }
  };

  const getColorScheme = () => {
    switch (type) {
      case 'knowledge_check':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900',
          icon: 'text-blue-600'
        };
      case 'practical_tip':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-900',
          icon: 'text-yellow-600'
        };
      default:
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-900',
          icon: 'text-purple-600'
        };
    }
  };

  const colors = getColorScheme();

  const getIcon = () => {
    switch (type) {
      case 'knowledge_check':
        return <Lightbulb className={`w-5 h-5 ${colors.icon}`} />;
      case 'practical_tip':
        return <CheckCircle className={`w-5 h-5 ${colors.icon}`} />;
      default:
        return <MessageCircle className={`w-5 h-5 ${colors.icon}`} />;
    }
  };

  return (
    <Card className={`${colors.bg} ${colors.border}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg flex items-center gap-2 ${colors.text}`}>
          {getIcon()}
          {title}
          {isCompleted && (
            <Badge variant="outline" className="ml-auto">
              Completed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={colors.text}>
          <p className="leading-relaxed">{prompt}</p>
        </div>

        {!isCompleted ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Type your thoughts here..."
              value={userReflection}
              onChange={(e) => setUserReflection(e.target.value)}
              className="min-h-[100px] bg-white"
            />
            
            {hints.length > 0 && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHints(!showHints)}
                  className={`${colors.text} hover:bg-white/50`}
                >
                  {showHints ? 'Hide' : 'Show'} Hints ({hints.length})
                </Button>
                
                {showHints && (
                  <div className="space-y-1">
                    {hints.map((hint, index) => (
                      <div key={index} className="text-sm opacity-80 pl-4 border-l-2 border-gray-300">
                        💡 {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                onClick={handleComplete}
                disabled={!userReflection.trim()}
                size="sm"
                className="bg-white text-gray-900 hover:bg-gray-100"
              >
                Complete Reflection
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-white rounded border">
              <p className="text-sm text-gray-600 mb-1">Your reflection:</p>
              <p className="text-gray-900">{userReflection}</p>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-green-700 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Reflection Complete
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCompleted(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                Edit Response
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 