'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateTrainingButtonProps {
  procedureId: string;
}

export function GenerateTrainingButton({ procedureId }: GenerateTrainingButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTraining = async () => {
    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/training/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ procedureId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Training content generated successfully! SMEs can now review and approve it.');
        
        // Optionally redirect to SME review page or show more details
        if (data.moduleId) {
          toast.info('Training module created with ID: ' + data.moduleId);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate training content');
      }
    } catch (error) {
      console.error('Error generating training:', error);
      toast.error('Failed to generate training content');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
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
  );
} 