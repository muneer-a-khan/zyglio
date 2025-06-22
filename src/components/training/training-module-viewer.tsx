'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Award,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { ContentRenderer } from './content-renderer';
import { QuizInterface } from './quiz/quiz-interface';

interface TrainingModuleViewerProps {
  moduleId: string;
  userId: string;
}

interface TrainingModule {
  id: string;
  title: string;
  subtopics: Array<{
    title: string;
    description: string;
    estimatedTime: number;
  }>;
  content: Array<{
    id: string;
    subtopic: string;
    contentType: string;
    title: string;
    content: any;
    estimatedTime: number;
  }>;
  quizBanks: Array<{
    id: string;
    subtopic: string;
    questions: any[];
    passingScore: number;
  }>;
}

interface TrainingProgress {
  id: string;
  currentSubtopic: string | null;
  completedSubtopics: string[];
  timeSpent: number;
  progressPercentage: number;
}

export function TrainingModuleViewer({ moduleId, userId }: TrainingModuleViewerProps) {
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [currentSubtopic, setCurrentSubtopic] = useState<string>('');
  const [currentView, setCurrentView] = useState<'content' | 'quiz'>('content');
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    loadTrainingModule();
    loadProgress();
  }, [moduleId, userId]);

  useEffect(() => {
    // Start time tracking when component mounts
    setStartTime(new Date());
    
    // Update time spent every minute
    const interval = setInterval(updateTimeSpent, 60000);
    
    return () => {
      clearInterval(interval);
      if (startTime) {
        updateTimeSpent();
      }
    };
  }, [startTime]);

  const loadTrainingModule = async () => {
    try {
      const response = await fetch(`/api/training/modules/${moduleId}`);
      if (response.ok) {
        const data = await response.json();
        setModule(data.module);
        
        // Set initial subtopic if none selected
        if (!currentSubtopic && data.module.subtopics.length > 0) {
          setCurrentSubtopic(data.module.subtopics[0].title);
        }
      }
    } catch (error) {
      console.error('Error loading training module:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await fetch(`/api/training/progress/${userId}?moduleId=${moduleId}`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
        
        // Set current subtopic from progress if available
        if (data.progress?.currentSubtopic) {
          setCurrentSubtopic(data.progress.currentSubtopic);
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeSpent = async () => {
    if (!startTime) return;
    
    const currentTime = new Date();
    const additionalTime = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    
    try {
      await fetch('/api/training/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          moduleId,
          timeSpent: additionalTime,
          currentSubtopic
        })
      });
    } catch (error) {
      console.error('Error updating time spent:', error);
    }
  };

  const markSubtopicComplete = async (subtopic: string) => {
    try {
      const updatedCompleted = [...(progress?.completedSubtopics || [])];
      if (!updatedCompleted.includes(subtopic)) {
        updatedCompleted.push(subtopic);
      }

      const response = await fetch('/api/training/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          moduleId,
          completedSubtopics: updatedCompleted,
          currentSubtopic: subtopic
        })
      });

      if (response.ok) {
        loadProgress(); // Reload progress
      }
    } catch (error) {
      console.error('Error marking subtopic complete:', error);
    }
  };

  const navigateToSubtopic = (subtopic: string) => {
    setCurrentSubtopic(subtopic);
    setCurrentView('content');
    updateTimeSpent();
    setStartTime(new Date());
  };

  const startQuiz = () => {
    setCurrentView('quiz');
  };

  const onQuizComplete = (passed: boolean, score: number) => {
    if (passed) {
      markSubtopicComplete(currentSubtopic);
    }
    setCurrentView('content');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading training module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-8">
        <p>Training module not found.</p>
      </div>
    );
  }

  const currentSubtopicIndex = module.subtopics.findIndex(s => s.title === currentSubtopic);
  const currentContent = module.content.find(c => c.subtopic === currentSubtopic);
  const currentQuizBank = module.quizBanks.find(q => q.subtopic === currentSubtopic);
  const isSubtopicCompleted = progress?.completedSubtopics.includes(currentSubtopic) || false;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{module.title}</h1>
          <p className="text-gray-600 mt-2">
            Interactive training with quizzes and voice certification
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Award className="w-4 h-4" />
          Certification Available
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Training Progress</h3>
            <span className="text-sm text-gray-600">
              {progress?.completedSubtopics.length || 0} of {module.subtopics.length} topics completed
            </span>
          </div>
          <Progress 
            value={progress?.progressPercentage || 0} 
            className="h-2 mb-4" 
          />
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Time spent: {Math.floor((progress?.timeSpent || 0) / 60)} minutes
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              Current: {currentSubtopic}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Subtopic Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Topics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {module.subtopics.map((subtopic, index) => {
                const isCompleted = progress?.completedSubtopics.includes(subtopic.title);
                const isCurrent = currentSubtopic === subtopic.title;
                
                return (
                  <Button
                    key={subtopic.title}
                    variant={isCurrent ? "default" : "ghost"}
                    className={`w-full justify-start text-left h-auto p-3 ${
                      isCompleted ? 'bg-green-50 border-green-200' : ''
                    }`}
                    onClick={() => navigateToSubtopic(subtopic.title)}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <div className="flex-shrink-0 mt-1">
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{subtopic.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {subtopic.estimatedTime} min
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'content' | 'quiz')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Learn
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Quiz
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{currentContent?.title || currentSubtopic}</CardTitle>
                    {isSubtopicCompleted && (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {currentContent ? (
                    <ContentRenderer content={currentContent} />
                  ) : (
                    <p>No content available for this subtopic.</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-8 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const prevIndex = Math.max(0, currentSubtopicIndex - 1);
                        navigateToSubtopic(module.subtopics[prevIndex].title);
                      }}
                      disabled={currentSubtopicIndex === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    
                    <Button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700">
                      Take Quiz
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        const nextIndex = Math.min(module.subtopics.length - 1, currentSubtopicIndex + 1);
                        navigateToSubtopic(module.subtopics[nextIndex].title);
                      }}
                      disabled={currentSubtopicIndex === module.subtopics.length - 1}
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz" className="mt-6">
              {currentQuizBank ? (
                <QuizInterface
                  quizBank={currentQuizBank}
                  userId={userId}
                  subtopic={currentSubtopic}
                  onComplete={onQuizComplete}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No quiz available for this subtopic.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 