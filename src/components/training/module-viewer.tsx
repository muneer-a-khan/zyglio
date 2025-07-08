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
import { toast } from 'sonner';
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
  
  // Add local state to track recently completed subtopics for immediate UI feedback
  const [locallyCompletedSubtopics, setLocallyCompletedSubtopics] = useState<string[]>([]);
  
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
    
    console.log(`🎯 Marking subtopic complete: ${subtopic}`);
    
    // Immediately add to local completed state for instant UI feedback
    setLocallyCompletedSubtopics(prev => {
      if (!prev.includes(subtopic)) {
        const newLocal = [...prev, subtopic];
        console.log(`⚡ Immediately added to local completed:`, newLocal);
        return newLocal;
      }
      return prev;
    });
    
    isUpdatingRef.current = true;
    
    try {
      const updatedCompleted = [...(progress?.completedSubtopics || [])];
      if (!updatedCompleted.includes(subtopic)) {
        updatedCompleted.push(subtopic);
      }
      
      console.log(`📝 Updated completed subtopics for server:`, updatedCompleted);

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
        // Update the server progress state
        console.log(`✅ Server response OK - updating server state`);
        setProgress(prev => {
          const newProgress = prev ? {
            ...prev,
            completedSubtopics: updatedCompleted
          } : null;
          console.log(`🔄 New server progress state:`, newProgress);
          return newProgress;
        });
        
        // Remove from local state since it's now in server state
        setTimeout(() => {
          setLocallyCompletedSubtopics(prev => prev.filter(s => s !== subtopic));
          console.log(`🧹 Cleaned up local state for: ${subtopic}`);
        }, 1000);
        
      } else {
        console.error('Failed to mark subtopic complete:', response.status);
        // Remove from local state if server update failed
        setLocallyCompletedSubtopics(prev => prev.filter(s => s !== subtopic));
      }
    } catch (error) {
      console.error('Error marking subtopic complete:', error);
      // Remove from local state if there was an error
      setLocallyCompletedSubtopics(prev => prev.filter(s => s !== subtopic));
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
    console.log(`🎉 Quiz completed! Passed: ${passed}, Score: ${score}, Subtopic: ${currentSubtopic}`);
    
    if (passed) {
      // Show success toast first
      toast.success(`🎉 Chapter "${currentSubtopic}" completed!`, {
        description: "Great job! Voice certification is now available.",
        duration: 4000
      });
      
      // Mark subtopic as complete and update progress
      await markSubtopicComplete(currentSubtopic);
      
      // Switch to content view to show the certification prompt
      setCurrentView('content');
      
      // Small delay to ensure state updates have propagated
      setTimeout(() => {
        console.log(`✅ Quiz completed for: ${currentSubtopic} - Certification prompt should now be visible`);
        console.log(`🔍 Current progress:`, progress);
        console.log(`🔍 Is subtopic completed?`, progress?.completedSubtopics.includes(currentSubtopic));
      }, 200);
      
    } else {
      // Show failure toast
      toast.error(`Quiz not passed for "${currentSubtopic}"`, {
        description: `Score: ${score}%. You can retry the quiz or review the content.`,
        duration: 4000
      });
      
      // If failed, just switch back to content view
      setCurrentView('content');
    }
  };

  // Helper function to check if a subtopic has been certified
  const isSubtopicCertified = (subtopicTitle: string) => {
    // This would normally check the database for certification status
    // For now, we'll assume it's not certified unless we implement the check
    return false;
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
  
  // Check completion from both server state and local state for immediate feedback
  const serverCompleted = progress?.completedSubtopics.includes(currentSubtopic) || false;
  const localCompleted = locallyCompletedSubtopics.includes(currentSubtopic);
  const isSubtopicCompleted = serverCompleted || localCompleted;

  console.log(`🔍 Debug - Current subtopic: ${currentSubtopic}`);
  console.log(`📊 Server completed: ${serverCompleted}, Local completed: ${localCompleted}, Final: ${isSubtopicCompleted}`);
  console.log(`📋 Server completed subtopics:`, progress?.completedSubtopics);
  console.log(`⚡ Local completed subtopics:`, locallyCompletedSubtopics);
  console.log(`👀 Current view: ${currentView}`);
  console.log(`🎯 Should show certification prompt:`, isSubtopicCompleted && currentView === 'content');

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
                const serverCompleted = progress?.completedSubtopics.includes(subtopic.title) || false;
                const localCompleted = locallyCompletedSubtopics.includes(subtopic.title);
                const isCompleted = serverCompleted || localCompleted;
                const isCurrent = currentSubtopic === subtopic.title;
                const isCertified = isSubtopicCertified(subtopic.title);
                
                console.log(`📝 Sidebar - ${subtopic.title}: server=${serverCompleted}, local=${localCompleted}, final=${isCompleted}`);
                
                return (
                  <div key={subtopic.title} className="space-y-2">
                    <Button
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
                    
                    {/* Per-Subtopic Certification Button */}
                    {isCompleted && (
                      <Button
                        asChild
                        size="sm"
                        className={`w-full text-xs ${
                          isCertified 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Link href={`/certification/${moduleId}/${encodeURIComponent(subtopic.title)}`}>
                          <Award className="w-3 h-3 mr-1" />
                          {isCertified ? 'View Certificate' : 'Start Certification'}
                        </Link>
                      </Button>
                    )}
                  </div>
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
              {/* Certification Prompt for Completed Subtopic - Show at top for immediate visibility */}
              {isSubtopicCompleted && (
                <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <h3 className="text-xl font-bold text-green-800">
                          🎉 Chapter "{currentSubtopic}" Completed!
                        </h3>
                      </div>
                      <p className="text-blue-700 mb-4 font-medium">
                        Excellent work! Now demonstrate your mastery with our AI voice certification.
                      </p>
                      <div className="flex gap-4 justify-center mb-4">
                        <Button
                          asChild
                          size="lg"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          <Link href={`/certification/${moduleId}/${encodeURIComponent(currentSubtopic)}`}>
                            <Award className="w-5 h-5 mr-2" />
                            Start Voice Certification
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            // Move to next subtopic
                            const currentIndex = module?.subtopics.findIndex(s => s.title === currentSubtopic) || 0;
                            const nextSubtopic = module?.subtopics[currentIndex + 1];
                            if (nextSubtopic) {
                              navigateToSubtopic(nextSubtopic.title);
                            }
                          }}
                        >
                          Next Chapter
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                      <p className="text-sm text-blue-600 bg-blue-100 rounded p-2">
                        💡 <strong>Pro tip:</strong> Voice certification tests your ability to explain concepts aloud - 
                        take a moment to review the key points before starting!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentContent ? (
                <ContentRenderer content={currentContent} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p>No content available for this topic.</p>
                  </CardContent>
                </Card>
              )}
              
              {currentQuizBank && !isSubtopicCompleted && (
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