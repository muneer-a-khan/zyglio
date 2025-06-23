'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Save,
  ArrowLeft,
  CheckCircle,
  Edit,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TrainingModule {
  id: string;
  title: string;
  procedureId: string;
  procedureTitle: string;
  subtopics: Array<{
    title: string;
    description: string;
    estimatedTime: number;
  }>;
  isApproved: boolean;
  approvedAt: string | null;
  approvedBy: {
    name: string;
    email: string;
  } | null;
  createdAt: string;
  version: number;
  content: Array<{
    id: string;
    subtopic: string;
    contentType: string;
    title: string;
    content: any;
    orderIndex: number;
    estimatedTime: number;
  }>;
  quizBanks: Array<{
    id: string;
    subtopic: string;
    questions: any[];
    passingScore: number;
  }>;
}

export default function EditTrainingModulePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSubtopic, setCurrentSubtopic] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const moduleId = params?.moduleId as string;

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrainingModule();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, moduleId]);

  const fetchTrainingModule = async () => {
    try {
      const response = await fetch(`/api/training/modules/${moduleId}?includeContent=true`);
      if (response.ok) {
        const data = await response.json();
        setModule(data.module);
        
        // Set initial subtopic
        if (data.module.subtopics.length > 0) {
          setCurrentSubtopic(data.module.subtopics[0].title);
        }
      } else {
        // Handle unauthorized or not found
        if (response.status === 403 || response.status === 404) {
          router.push('/training');
        }
      }
    } catch (error) {
      console.error('Error fetching training module:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveModuleContent = async (contentId: string, updatedContent: any) => {
    if (!module) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await fetch(`/api/training/content/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: updatedContent
        }),
      });
      
      if (response.ok) {
        // Update local state
        const updatedModule = { ...module };
        const contentIndex = updatedModule.content.findIndex(c => c.id === contentId);
        
        if (contentIndex !== -1) {
          updatedModule.content[contentIndex].content = updatedContent;
          setModule(updatedModule);
        }
        
        setSaveMessage({
          type: 'success',
          message: 'Content saved successfully'
        });
      } else {
        setSaveMessage({
          type: 'error',
          message: 'Failed to save content'
        });
      }
    } catch (error) {
      console.error('Error saving content:', error);
      setSaveMessage({
        type: 'error',
        message: 'An error occurred while saving'
      });
    } finally {
      setIsSaving(false);
      
      // Clear message after a delay
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
  };

  const saveQuizContent = async (quizBankId: string, updatedQuestions: any[]) => {
    if (!module) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await fetch(`/api/training/quiz/${quizBankId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: updatedQuestions
        }),
      });
      
      if (response.ok) {
        // Update local state
        const updatedModule = { ...module };
        const quizIndex = updatedModule.quizBanks.findIndex(q => q.id === quizBankId);
        
        if (quizIndex !== -1) {
          updatedModule.quizBanks[quizIndex].questions = updatedQuestions;
          setModule(updatedModule);
        }
        
        setSaveMessage({
          type: 'success',
          message: 'Quiz saved successfully'
        });
      } else {
        setSaveMessage({
          type: 'error',
          message: 'Failed to save quiz'
        });
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      setSaveMessage({
        type: 'error',
        message: 'An error occurred while saving'
      });
    } finally {
      setIsSaving(false);
      
      // Clear message after a delay
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
  };

  const handleArticleContentChange = (contentId: string, field: string, value: any) => {
    if (!module) return;
    
    const updatedModule = { ...module };
    const contentIndex = updatedModule.content.findIndex(c => c.id === contentId);
    
    if (contentIndex === -1) return;
    
    const content = { ...updatedModule.content[contentIndex].content };
    
    if (field === 'keyPoints' || field === 'safetyNotes') {
      content[field] = value.split('\n').filter((item: string) => item.trim() !== '');
    } else {
      content[field] = value;
    }
    
    updatedModule.content[contentIndex].content = content;
    setModule(updatedModule);
  };

  const handleQuizQuestionChange = (quizBankId: string, questionIndex: number, field: string, value: any) => {
    if (!module) return;
    
    const updatedModule = { ...module };
    const quizBankIndex = updatedModule.quizBanks.findIndex(q => q.id === quizBankId);
    
    if (quizBankIndex === -1) return;
    
    const questions = [...updatedModule.quizBanks[quizBankIndex].questions];
    const question = { ...questions[questionIndex] };
    
    if (field === 'options') {
      question[field] = value.split('\n').filter((item: string) => item.trim() !== '');
    } else {
      question[field] = value;
    }
    
    questions[questionIndex] = question;
    updatedModule.quizBanks[quizBankIndex].questions = questions;
    setModule(updatedModule);
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-10 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <p>Loading training module...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container max-w-7xl mx-auto py-10 px-4">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Module Not Found</h1>
          <p className="text-gray-600 mb-6">The training module you are trying to edit could not be found.</p>
          <Button asChild>
            <a href="/training">Return to Training</a>
          </Button>
        </div>
      </div>
    );
  }

  // Get content for current subtopic
  const subtopicContent = module.content.filter(c => c.subtopic === currentSubtopic);
  const subtopicQuiz = module.quizBanks.find(q => q.subtopic === currentSubtopic);
  
  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/training')}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Badge variant={module.isApproved ? "success" : "secondary"}>
              {module.isApproved ? 'Approved' : 'Draft'}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{module.title}</h1>
          <p className="text-gray-600 mt-2">
            {module.procedureTitle}
          </p>
        </div>
        
        {saveMessage && (
          <Alert variant={saveMessage.type === 'success' ? "default" : "destructive"} className="w-auto">
            <AlertTitle>
              {saveMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 inline-block mr-2" />
              ) : (
                <AlertCircle className="w-4 h-4 inline-block mr-2" />
              )}
              {saveMessage.type === 'success' ? 'Success' : 'Error'}
            </AlertTitle>
            <AlertDescription>{saveMessage.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Subtopic Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Topics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {module.subtopics.map((subtopic, index) => (
                <Button
                  key={subtopic.title}
                  variant={currentSubtopic === subtopic.title ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => setCurrentSubtopic(subtopic.title)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{subtopic.title}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">
                <BookOpen className="w-4 h-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="quiz">
                <CheckCircle className="w-4 h-4 mr-2" />
                Quiz
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-6">
              {subtopicContent.map(content => {
                if (content.contentType === 'ARTICLE') {
                  const articleContent = content.content;
                  return (
                    <Card key={content.id} className="overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{content.title}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveModuleContent(content.id, articleContent)}
                            disabled={isSaving}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                        </CardTitle>
                        <CardDescription>Article Content</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Title</label>
                          <Input
                            value={content.title}
                            onChange={e => {
                              const updatedModule = { ...module };
                              const idx = updatedModule.content.findIndex(c => c.id === content.id);
                              if (idx !== -1) {
                                updatedModule.content[idx].title = e.target.value;
                                setModule(updatedModule);
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Key Points (one per line)</label>
                          <Textarea
                            value={(articleContent.keyPoints || []).join('\n')}
                            onChange={e => handleArticleContentChange(content.id, 'keyPoints', e.target.value)}
                            className="min-h-[100px]"
                            placeholder="Enter key points, one per line"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Safety Notes (one per line)</label>
                          <Textarea
                            value={(articleContent.safetyNotes || []).join('\n')}
                            onChange={e => handleArticleContentChange(content.id, 'safetyNotes', e.target.value)}
                            className="min-h-[100px]"
                            placeholder="Enter safety notes, one per line"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Main Content (Markdown)</label>
                          <Textarea
                            value={articleContent.content || ''}
                            onChange={e => handleArticleContentChange(content.id, 'content', e.target.value)}
                            className="min-h-[300px] font-mono"
                            placeholder="Enter article content in Markdown format"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })}
            </TabsContent>
            
            <TabsContent value="quiz" className="space-y-6">
              {subtopicQuiz ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Quiz Questions</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveQuizContent(subtopicQuiz.id, subtopicQuiz.questions)}
                        disabled={isSaving}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Passing Score: {subtopicQuiz.passingScore}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {subtopicQuiz.questions.map((question, questionIndex) => (
                      <Card key={questionIndex}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Question {questionIndex + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Question</label>
                            <Textarea
                              value={question.question}
                              onChange={e => handleQuizQuestionChange(subtopicQuiz.id, questionIndex, 'question', e.target.value)}
                              className="w-full"
                              placeholder="Enter question"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                            <Textarea
                              value={(question.options || []).join('\n')}
                              onChange={e => handleQuizQuestionChange(subtopicQuiz.id, questionIndex, 'options', e.target.value)}
                              className="min-h-[100px]"
                              placeholder="Enter options, one per line"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Correct Answer</label>
                            <Input
                              value={question.correctAnswer}
                              onChange={e => handleQuizQuestionChange(subtopicQuiz.id, questionIndex, 'correctAnswer', e.target.value)}
                              className="w-full"
                              placeholder="Enter the correct option"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Explanation</label>
                            <Textarea
                              value={question.explanation || ''}
                              onChange={e => handleQuizQuestionChange(subtopicQuiz.id, questionIndex, 'explanation', e.target.value)}
                              className="w-full"
                              placeholder="Enter explanation for the correct answer"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        const updatedModule = { ...module };
                        const quizBankIndex = updatedModule.quizBanks.findIndex(q => q.id === subtopicQuiz.id);
                        
                        if (quizBankIndex !== -1) {
                          updatedModule.quizBanks[quizBankIndex].questions.push({
                            question: '',
                            options: [],
                            correctAnswer: '',
                            explanation: ''
                          });
                          setModule(updatedModule);
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No quiz found for this subtopic.</p>
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Quiz
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 