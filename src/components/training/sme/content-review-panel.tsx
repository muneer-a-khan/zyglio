'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  X, 
  Clock,
  BookOpen,
  HelpCircle,
  Users,
  AlertTriangle,
  Eye,
  Edit,
  MessageSquare,
  Play,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { ContentRenderer } from '../content-renderer';

interface ContentReviewPanelProps {
  smeId: string;
}

interface PendingModule {
  id: string;
  title: string;
  procedureTitle: string;
  taskTitle: string;
  subtopics: any[];
  createdAt: string;
  version: number;
  contentCount: number;
  quizCount: number;
  totalQuestions: number;
  estimatedTime: number;
  waitingCertifications: number;
  status: string;
  contentTypes: string[];
}

interface ModuleDetail {
  id: string;
  title: string;
  procedureTitle: string;
  subtopics: any[];
  content: any[];
  quizBanks: any[];
  isApproved: boolean;
  createdAt: string;
  version: number;
}

export function ContentReviewPanel({ smeId }: ContentReviewPanelProps) {
  const [pendingModules, setPendingModules] = useState<PendingModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [currentContentIndex, setCurrentContentIndex] = useState(0);

  useEffect(() => {
    loadPendingModules();
  }, [smeId]);

  const loadPendingModules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sme/training/pending?smeId=${smeId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingModules(data.pendingModules);
      } else {
        toast.error('Failed to load pending modules');
      }
    } catch (error) {
      console.error('Error loading pending modules:', error);
      toast.error('Failed to load pending modules');
    } finally {
      setLoading(false);
    }
  };

  const loadModuleDetails = async (moduleId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/training/modules/${moduleId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedModule(data.module);
        setCurrentContentIndex(0);
      } else {
        toast.error('Failed to load module details');
      }
    } catch (error) {
      console.error('Error loading module details:', error);
      toast.error('Failed to load module details');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (moduleId: string, action: 'approve' | 'reject' | 'request_changes') => {
    setLoading(true);
    try {
      const response = await fetch('/api/sme/training/pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleId,
          smeId,
          action,
          feedback: feedback.trim() || undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        // Refresh the pending modules list
        loadPendingModules();
        
        // Clear selection and feedback
        setSelectedModule(null);
        setFeedback('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  const renderModulesList = () => {
    if (loading && pendingModules.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading pending modules...</p>
        </div>
      );
    }

    if (pendingModules.length === 0) {
      return (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No training modules pending your approval.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {pendingModules.map((module) => (
          <Card 
            key={module.id} 
            className={`cursor-pointer transition-colors ${
              selectedModule?.id === module.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => loadModuleDetails(module.id)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{module.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Procedure: {module.procedureTitle}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {module.contentCount} contents
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-4 h-4" />
                      {module.totalQuestions} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {module.estimatedTime} min
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{module.version}</Badge>
                    {module.waitingCertifications > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {module.waitingCertifications} waiting
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      {module.contentTypes.map((type, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-2">
                    Pending Review
                  </Badge>
                  <p className="text-xs text-gray-500">
                    Created {new Date(module.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderContentPreview = () => {
    if (!selectedModule || selectedModule.content.length === 0) {
      return (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No content available for preview</p>
        </div>
      );
    }

    const currentContent = selectedModule.content[currentContentIndex];

    return (
      <div className="space-y-4">
        {/* Content Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentContentIndex(Math.max(0, currentContentIndex - 1))}
              disabled={currentContentIndex === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              {currentContentIndex + 1} of {selectedModule.content.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentContentIndex(Math.min(selectedModule.content.length - 1, currentContentIndex + 1))}
              disabled={currentContentIndex === selectedModule.content.length - 1}
            >
              Next
            </Button>
          </div>
          <Badge variant="outline">{currentContent.contentType}</Badge>
        </div>

        {/* Content Display */}
        <Card>
          <CardContent className="pt-6">
            <ContentRenderer content={currentContent} />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderQuizPreview = () => {
    if (!selectedModule || selectedModule.quizBanks.length === 0) {
      return (
        <div className="text-center py-8">
          <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No quizzes available for preview</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {selectedModule.quizBanks.map((quiz, index) => {
          const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
          
          return (
            <Card key={quiz.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Quiz {index + 1}: {quiz.subtopic}
                  </CardTitle>
                  <Badge variant="outline">
                    Passing: {quiz.passingScore}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Questions:</span> {questions.length}
                  </div>
                  <div>
                    <span className="font-medium">Passing Score:</span> {quiz.passingScore}%
                  </div>
                </div>
                
                {/* Sample Questions */}
                <div>
                  <h4 className="font-medium mb-2">Sample Questions:</h4>
                  <div className="space-y-2">
                    {questions.slice(0, 3).map((question: any, qIndex: number) => (
                      <div key={qIndex} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm mb-1">
                          Q{qIndex + 1}: {question.question}
                        </p>
                        <div className="text-xs text-gray-600">
                          Type: {question.type} • Difficulty: {question.difficulty || 'medium'}
                        </div>
                      </div>
                    ))}
                    {questions.length > 3 && (
                      <p className="text-sm text-gray-500">
                        ...and {questions.length - 3} more questions
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderModuleOverview = () => {
    if (!selectedModule) return null;

    return (
      <div className="space-y-6">
        {/* Module Info */}
        <Card>
          <CardHeader>
            <CardTitle>Module Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Title</label>
                <p className="mt-1">{selectedModule.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Procedure</label>
                <p className="mt-1">{selectedModule.procedureTitle}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Version</label>
                <p className="mt-1">v{selectedModule.version}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="mt-1">{new Date(selectedModule.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subtopics */}
        <Card>
          <CardHeader>
            <CardTitle>Subtopics Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {selectedModule.subtopics.map((subtopic: any, index: number) => (
                <Badge key={index} variant="outline">
                  {subtopic.title || subtopic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Content Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{selectedModule.content.length}</p>
                <p className="text-sm text-blue-700">Content Items</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <HelpCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{selectedModule.quizBanks.length}</p>
                <p className="text-sm text-green-700">Quizzes</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-900">
                  {selectedModule.content.reduce((sum, content) => sum + content.estimatedTime, 0)}
                </p>
                <p className="text-sm text-purple-700">Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Review Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">
                Feedback (Optional)
              </label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback for the content creators..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => handleApproval(selectedModule.id, 'approve')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
              <Button
                onClick={() => handleApproval(selectedModule.id, 'request_changes')}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Request Changes
              </Button>
              <Button
                onClick={() => handleApproval(selectedModule.id, 'reject')}
                disabled={loading}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-screen max-h-screen">
      {/* Left Panel - Pending Modules */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Pending Approval ({pendingModules.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-6">
                {renderModulesList()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Module Details */}
      <div className="lg:col-span-2">
        {selectedModule ? (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Review: {selectedModule.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <div className="px-6 pt-2">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                    <TabsTrigger value="approve">Approve</TabsTrigger>
                  </TabsList>
                </div>
                
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="p-6">
                    <TabsContent value="overview" className="mt-0">
                      {renderModuleOverview()}
                    </TabsContent>
                    <TabsContent value="content" className="mt-0">
                      {renderContentPreview()}
                    </TabsContent>
                    <TabsContent value="quizzes" className="mt-0">
                      {renderQuizPreview()}
                    </TabsContent>
                    <TabsContent value="approve" className="mt-0">
                      {renderModuleOverview()}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Module to Review</h3>
              <p className="text-gray-600">
                Choose a pending training module from the left panel to begin your review.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 