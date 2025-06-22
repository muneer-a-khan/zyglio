'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ContentReviewPanel } from '@/components/training/sme/content-review-panel';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function SMETrainingPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'sme' && session.user.role !== 'admin') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You need SME or Admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Training Content Review</h1>
        <p className="text-gray-600 mt-2">
          Review and approve AI-generated training content for your procedures.
        </p>
      </div>
      
      <ContentReviewPanel smeId={session.user.id} />
    </div>
  );
} 