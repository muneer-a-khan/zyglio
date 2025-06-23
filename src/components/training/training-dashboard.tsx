'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Clock, 
  Award,
  ArrowRight,
  Edit,
  Plus,
  CheckCircle
} from 'lucide-react';

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
  isOwned?: boolean;
}

interface TrainingProgress {
  id: string;
  moduleId: string;
  moduleTitle: string;
  procedureTitle: string;
  currentSubtopic: string | null;
  completedSubtopics: string[];
  timeSpent: number;
  progressPercentage: number;
  lastAccessedAt: string;
  totalSubtopics: number;
}

interface TrainingDashboardProps {
  initialModules: TrainingModule[];
  initialProgress: TrainingProgress[];
  userId: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export default function TrainingDashboard({
  initialModules,
  initialProgress,
  userId,
  userRole,
  userName,
  userEmail
}: TrainingDashboardProps) {
  // Add debugging
  console.log('TrainingDashboard props:', {
    initialModules: initialModules?.length,
    initialProgress: initialProgress?.length,
    userId,
    userRole
  });

  // Add safety checks
  const safeModules = Array.isArray(initialModules) ? initialModules : [];
  const safeProgress = Array.isArray(initialProgress) ? initialProgress : [];

  const [modules] = useState<TrainingModule[]>(safeModules);
  const [progress] = useState<TrainingProgress[]>(safeProgress);
  const [activeTab, setActiveTab] = useState('in-progress');
  
  const isSME = userRole === 'sme';

  // Filter and sort modules for different tabs with safety checks
  const inProgressModules = safeProgress
    .filter(p => p && typeof p.progressPercentage === 'number' && p.progressPercentage > 0 && p.progressPercentage < 100)
    .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());

  const completedModules = safeProgress
    .filter(p => p && typeof p.progressPercentage === 'number' && p.progressPercentage === 100)
    .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());

  const availableModules = safeModules
    .filter(m => m && !safeProgress.some(p => p && p.moduleId === m.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const ownedModules = isSME ? safeModules
    .filter(m => m && m.isOwned)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  console.log('Filtered data:', {
    inProgressModules: inProgressModules.length,
    completedModules: completedModules.length,
    availableModules: availableModules.length,
    ownedModules: ownedModules.length
  });

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Training Modules</h1>
          <p className="text-gray-600 mt-2">
            Access interactive training content and certification
          </p>
        </div>
        {isSME && (
          <Button asChild>
            <Link href="/sme/training">
              <Plus className="w-4 h-4 mr-2" />
              Manage Training Content
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full mb-4 ${isSME ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="in-progress">In Progress ({inProgressModules.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedModules.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({availableModules.length})</TabsTrigger>
          {isSME && (
            <TabsTrigger value="owned">My Content ({ownedModules.length})</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="in-progress" className="space-y-4">
          {inProgressModules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">You have no training modules in progress.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressModules.map(p => (
                <Card key={p.moduleId} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle>{p.moduleTitle}</CardTitle>
                    <CardDescription>{p.procedureTitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span className="font-medium">{p.progressPercentage}%</span>
                        </div>
                        <Progress value={p.progressPercentage} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(p.timeSpent / 60)} min spent</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{p.completedSubtopics.length}/{p.totalSubtopics} topics</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button asChild className="w-full">
                      <Link href={`/training/${p.moduleId}`}>
                        Continue Training
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedModules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">You have not completed any training modules yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedModules.map(p => (
                <Card key={p.moduleId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>{p.moduleTitle}</CardTitle>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                    <CardDescription>{p.procedureTitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(p.timeSpent / 60)} min spent</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          <span>100% Complete</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/training/${p.moduleId}`}>
                        Review Training
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4">
          {availableModules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No additional training modules are available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableModules.map(module => (
                <Card key={module.id}>
                  <CardHeader>
                    <CardTitle>{module.title}</CardTitle>
                    <CardDescription>{module.procedureTitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <BookOpen className="w-4 h-4 mr-2" />
                        <span>{module.subtopics.length} topics</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>
                          {module.subtopics.reduce((sum, topic) => sum + (topic.estimatedTime || 0), 0)} min estimated
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button asChild className="w-full">
                      <Link href={`/training/${module.id}`}>
                        Start Training
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {isSME && (
          <TabsContent value="owned" className="space-y-4">
            {ownedModules.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">You have not created any training modules yet.</p>
                <Button className="mt-4" asChild>
                  <Link href="/procedures">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Training from Procedure
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedModules.map(module => (
                  <Card key={module.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{module.title}</CardTitle>
                        <Badge variant={module.isApproved ? "outline" : "secondary"} className={
                          module.isApproved ? "bg-green-100 text-green-800 border-green-200" : ""
                        }>
                          {module.isApproved ? 'Approved' : 'Draft'}
                        </Badge>
                      </div>
                      <CardDescription>{module.procedureTitle}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <BookOpen className="w-4 h-4 mr-2" />
                          <span>{module.subtopics.length} topics</span>
                        </div>
                        {module.approvedBy && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Award className="w-4 h-4 mr-2" />
                            <span>Approved by: {module.approvedBy.name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={`/training/${module.id}`}>
                          Preview
                        </Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link href={`/sme/training/edit/${module.id}`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 