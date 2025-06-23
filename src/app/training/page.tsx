import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

// Import with error boundary
import TrainingDashboard from '@/components/training/training-dashboard';

// Error boundary component
function TrainingErrorBoundary({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Training component error:', error);
    return <>{fallback}</>;
  }
}

export default async function TrainingModulesPage() {
  const session = await getAuthSession();
  
  // Redirect to login if not authenticated
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/training');
  }

  try {
    // Fetch initial data on the server
    const userId = session.user.id;
    const isSME = session.user.role === 'sme';
    
    // Fetch all approved modules
    const modules = await prisma.trainingModule.findMany({
      where: {
        isApproved: true
      },
      include: {
        procedure: {
          select: {
            title: true,
            id: true,
            LearningTask: {
              select: {
                userId: true
              }
            }
          }
        },
        approver: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Fetch user's progress
    const progress = await prisma.trainingProgress.findMany({
      where: {
        userId
      },
      include: {
        module: {
          select: {
            title: true,
            subtopics: true,
            procedure: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });
    
    // Format the data for the client with extra safety checks
    const formattedModules = modules.map(module => ({
      id: module.id,
      title: module.title || 'Untitled Module',
      procedureId: module.procedureId,
      procedureTitle: module.procedure?.title || 'Unknown Procedure',
      subtopics: Array.isArray(module.subtopics) ? module.subtopics : [],
      isApproved: module.isApproved,
      approvedAt: module.approvedAt?.toISOString() || null,
      approvedBy: module.approver || null,
      createdAt: module.createdAt.toISOString(),
      version: module.version || 1,
      isOwned: isSME && module.procedure?.LearningTask?.userId === userId
    }));
    
    const formattedProgress = progress.map(p => ({
      id: p.id,
      moduleId: p.moduleId,
      moduleTitle: p.module?.title || 'Unknown Module',
      procedureTitle: p.module?.procedure?.title || 'Unknown Procedure',
      currentSubtopic: p.currentSubtopic,
      completedSubtopics: Array.isArray(p.completedSubtopics) ? p.completedSubtopics : [],
      timeSpent: p.timeSpent || 0,
      progressPercentage: p.progressPercentage || 0,
      lastAccessedAt: p.lastAccessedAt.toISOString(),
      totalSubtopics: Array.isArray(p.module?.subtopics) ? p.module.subtopics.length : 0
    }));

    const fallbackUI = (
      <div className="container max-w-7xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <h1 className="text-2xl font-bold mb-4">Training Modules</h1>
            <p className="text-gray-600 mb-6">
              The training dashboard component failed to load. Showing basic info:
            </p>
            <p className="mb-4">
              Found {formattedModules.length} modules and {formattedProgress.length} progress records for user {userId}
            </p>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );

    return (
      <TrainingErrorBoundary fallback={fallbackUI}>
        <Suspense fallback={
          <div className="container max-w-7xl mx-auto py-10 px-4">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading training modules...</p>
              </div>
            </div>
          </div>
        }>
          <TrainingDashboard 
            initialModules={formattedModules}
            initialProgress={formattedProgress}
            userId={userId}
            userRole={session.user.role}
            userName={session.user.name || ''}
            userEmail={session.user.email || ''}
          />
        </Suspense>
      </TrainingErrorBoundary>
    );
  } catch (error) {
    console.error("Error loading training page:", error);
    
    // Fallback UI in case of error
    return (
      <div className="container max-w-7xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <h1 className="text-2xl font-bold mb-4">Training Modules</h1>
            <p className="text-gray-600 mb-6">
              There was an error loading the training modules. Please try again later.
            </p>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
} 