'use client';

import { useParams } from 'next/navigation';
import { TrainingModuleViewer } from '@/components/training/training-module-viewer';

export default function TrainingModulePage() {
  const params = useParams();
  const moduleId = params?.moduleId as string;

  if (!moduleId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Module Not Found</h2>
          <p className="text-gray-600">The training module you are looking for could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <TrainingModuleViewer moduleId={moduleId} />
    </div>
  );
} 