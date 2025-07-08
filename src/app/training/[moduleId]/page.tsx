import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Import with error handling
import ModuleViewer from '@/components/training/module-viewer';

// Error boundary component
function ModuleErrorBoundary({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Module viewer error:', error);
    return <>{fallback}</>;
  }
}

export default async function TrainingModulePage({
  params
}: {
  params: Promise<{ moduleId: string }>
}) {
  const session = await getAuthSession();
  
  // Redirect to login if not authenticated
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/training');
  }
  
  // Await params to fix Next.js warning
  const { moduleId } = await params;
  const userId = session.user.id;
  const userEmail = session.user.email || '';
  const userName = session.user.name || '';

  // Validate moduleId
  if (!moduleId) {
    return (
      <div className="container py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <h1 className="text-2xl font-bold mb-4">Module Not Found</h1>
            <p className="text-gray-600 mb-6">
              The training module you are looking for could not be found.
            </p>
            <Button asChild>
              <Link href="/training">Back to Training</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fallbackUI = (
    <div className="container py-10 px-4">
      <Card>
        <CardContent className="py-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Training Module</h1>
          <p className="text-gray-600 mb-6">
            The training module viewer failed to load. Please try again.
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Module ID: {moduleId}
          </p>
          <Button asChild>
            <Link href="/training">Back to Training</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container py-10 px-4">
      <ModuleErrorBoundary fallback={fallbackUI}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading training module...</p>
            </div>
          </div>
        }>
          <ModuleViewer 
            moduleId={moduleId}
            userId={userId}
            initialUserEmail={userEmail}
            initialUserName={userName}
          />
        </Suspense>
      </ModuleErrorBoundary>
    </div>
  );
} 