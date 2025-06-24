'use client';

import { useState, useEffect, useRef } from 'react';
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
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { ContentRenderer } from '@/components/training/content-renderer';
import { QuizInterface } from '@/components/training/quiz/quiz-interface';

interface ModuleViewerProps {
  moduleId: string;
  userId: string;
  initialUserEmail?: string;
  initialUserName?: string;
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

export default function ModuleViewer({ 
  moduleId, 
  userId,
  initialUserEmail,
  initialUserName
}: ModuleViewerProps) {
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [currentSubtopic, setCurrentSubtopic] = useState<string>('');
  const [currentView, setCurrentView] = useState<'content' | 'quiz'>('content');
  const [isLoading, setIsLoading] = useState(true);
  
  // Use refs for time tracking to avoid re-renders
  const startTimeRef = useRef<Date>(new Date());
  const lastUpdateRef = useRef<Date>(new Date());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  // Validate we have required data
  const hasRequiredData = !!moduleId && !!userId;

  useEffect(() => {
    if (!hasRequiredData) return;
    
    loadTrainingModule();
    loadProgress();
    
    // Set up interval for time tracking - only update every 2 minutes
    updateIntervalRef.current = setInterval(() => {
      if (!isUpdatingRef.current) {
        updateTimeSpent();
      }
    }, 120000); // 2 minutes
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      // Final update when component unmounts
      updateTimeSpent();
    };
  }, [moduleId, userId]);

  const loadTrainingModule = async () => {
    if (!hasRequiredData) return;
    
    try {
      const response = await fetch(`/api/training/modules/${moduleId}`);
      if (response.ok) {
        const data = await response.json();
        setModule(data.module);
        
        // Set initial subtopic if none selected
        if (!currentSubtopic && data.module.subtopics.length > 0) {
          setCurrentSubtopic(data.module.subtopics[0].title);
        }
      } else {
        console.error('Failed to load training module:', response.status);
      }
    } catch (error) {
      console.error('Error loading training module:', error);
    }
  };

  const loadProgress = async () => {
    if (!hasRequiredData) return;
    
    try {
      const response = await fetch(`/api/training/progress/${userId}?moduleId=${moduleId}`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
        
        // Set current subtopic from progress if available
        if (data.progress?.currentSubtopic) {
          setCurrentSubtopic(data.progress.currentSubtopic);
        }
      } else {
        console.error('Failed to load progress:', response.status);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeSpent = async () => {
    if (!hasRequiredData || !currentSubtopic || isUpdatingRef.current) return;
    
    const now = new Date();
    const timeSinceLastUpdate = Math.floor((now.getTime() - lastUpdateRef.current.getTime()) / 1000);
    
    // Only update if at least 30 seconds have passed
    if (timeSinceLastUpdate < 30) return;
    
    isUpdatingRef.current = true;
    
    try {
      const response = await fetch('/api/training/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          moduleId,
          timeSpent: timeSinceLastUpdate,
          currentSubtopic
        })
      });
      
      if (response.ok) {
        lastUpdateRef.current = now;
      } else {
        console.error('Failed to update time spent:', response.status);
      }
    } catch (error) {
      console.error('Error updating time spent:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const markSubtopicComplete = async (subtopic: string) => {
    if (!hasRequiredData || isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    
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
      } else {
        console.error('Failed to mark subtopic complete:', response.status);
      }
    } catch (error) {
      console.error('Error marking subtopic complete:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const navigateToSubtopic = (subtopic: string) => {
    // Don't do anything if already on this subtopic
    if (currentSubtopic === subtopic) return;
    
    // Update time spent on current subtopic before changing
    updateTimeSpent();
    
    setCurrentSubtopic(subtopic);
    setCurrentView('content');
    lastUpdateRef.current = new Date();
  };
  
  const moveToNextSubtopic = () => {
    if (!module) return;
    
    const currentIndex = module.subtopics.findIndex(s => s.title === currentSubtopic);
    if (currentIndex < module.subtopics.length - 1) {
      // Move to the next subtopic
      const nextSubtopic = module.subtopics[currentIndex + 1].title;
      navigateToSubtopic(nextSubtopic);
    }
  };

  const startQuiz = () => {
    setCurrentView('quiz');
  };

  const onQuizComplete = async (passed: boolean, score: number) => {
    if (passed) {
      await markSubtopicComplete(currentSubtopic);
      
      // If this was the last subtopic, show completion message and certification button
      const updatedProgress = [...(progress?.completedSubtopics || [])];
      if (!updatedProgress.includes(currentSubtopic)) {
        updatedProgress.push(currentSubtopic);
      }
      
      // Check if all subtopics are completed
      const allCompleted = module?.subtopics.every(subtopic => 
        updatedProgress.includes(subtopic.title)
      );
      
      if (allCompleted) {
        // Move to the next subtopic if available
        moveToNextSubtopic();
      }
    }
    setCurrentView('content');
  };

  if (!hasRequiredData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p>Missing required data to load training module.</p>
        </div>
      </div>
    );
  }

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
    <div className="max-w-7xl mx-auto space-y-6">
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
          <div className="flex items-center justify-between">
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
            
            {/* Certification Button - Show when all topics are completed */}
            {progress && module && progress.completedSubtopics.length === module.subtopics.length && (
              <Button asChild className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                <Link href={`/certification/${moduleId}`}>
                  <Award className="w-4 h-4" />
                  Start Voice Certification
                </Link>
              </Button>
            )}
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
              <TabsTrigger 
                value="quiz" 
                className="flex items-center gap-2"
                disabled={!currentQuizBank}
              >
                <CheckCircle className="w-4 h-4" />
                Quiz
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              {currentContent ? (
                <ContentRenderer content={currentContent} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p>No content available for this topic.</p>
                  </CardContent>
                </Card>
              )}
              
              {currentQuizBank && (
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={startQuiz}
                    className="flex items-center gap-2"
                  >
                    Take Quiz <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quiz" className="mt-6">
              {currentQuizBank ? (
                <QuizInterface 
                  quizBank={currentQuizBank}
                  onComplete={onQuizComplete}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p>No quiz available for this topic.</p>
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