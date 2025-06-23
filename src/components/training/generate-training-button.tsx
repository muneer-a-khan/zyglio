'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface GenerateTrainingButtonProps {
  procedureId: string;
  onSuccess?: (moduleId: string) => void;
}

export function GenerateTrainingButton({ procedureId, onSuccess }: GenerateTrainingButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerateTraining = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Show initial toast to indicate process has started
      const loadingToast = toast.loading('Generating training content. This may take a minute or two...');
      
      const response = await fetch('/api/training/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ procedureId }),
      });

      // Clear the loading toast
      toast.dismiss(loadingToast);

      if (response.ok) {
        const data = await response.json();
        toast.success('Training content generated successfully!', {
          description: 'SMEs can now review and approve the training module.',
          duration: 5000
        });
        
        // Handle navigation or callback on success
        if (data.module?.id) {
          if (onSuccess) {
            onSuccess(data.module.id);
          } else {
            // Optionally navigate to the new module
            router.push(`/training/${data.module.id}`);
          }
        }
      } else {
        const errorData = await response.json();
        
        // Handle specific error cases
        if (response.status === 409 && errorData.moduleId) {
          toast.info('Training module already exists', {
            description: 'Redirecting to the existing module',
            duration: 5000
          });
          
          // Navigate to the existing module
          router.push(`/training/${errorData.moduleId}`);
          return;
        }
        
        // General error handling
        const errorMessage = errorData.error || 'Failed to generate training content';
        setError(errorMessage);
        toast.error('Generation failed', {
          description: errorMessage,
          duration: 8000
        });
      }
    } catch (error) {
      console.error('Error generating training:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error - please check your connection';
      setError(errorMessage);
      toast.error('Generation error', {
        description: errorMessage,
        duration: 8000
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <Button 
        variant="outline"
        onClick={handleGenerateTraining}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Training...
          </>
        ) : (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Generate Training
          </>
        )}
      </Button>
      
      {error && (
        <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 rounded-md flex items-start">
          <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {isGenerating && (
        <p className="mt-2 text-xs text-gray-500">
          This process typically takes 1-2 minutes as we generate comprehensive training content.
          Please don't refresh the page.
        </p>
      )}
    </div>
  );
} 