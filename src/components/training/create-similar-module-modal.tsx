'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CreateSimilarModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceModule: {
    id: string;
    title: string;
    procedureTitle: string;
  };
}

export function CreateSimilarModuleModal({ isOpen, onClose, sourceModule }: CreateSimilarModuleModalProps) {
  const [context, setContext] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!context.trim()) {
      toast.error('Please provide context for the similar module');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/training/generate-similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceModuleId: sourceModule.id,
          context: context.trim(),
          newTitle: newTitle.trim() || undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Similar training module generated successfully!', {
          description: 'The module is now available for review and approval.',
          duration: 5000
        });
        
        // Close modal and reset form
        onClose();
        setContext('');
        setNewTitle('');
        
        // Optionally navigate to the new module
        if (data.module?.id) {
          router.push(`/sme/training/edit/${data.module.id}`);
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to generate similar module';
        toast.error('Generation failed', {
          description: errorMessage,
          duration: 8000
        });
      }
    } catch (error) {
      console.error('Error generating similar module:', error);
      toast.error('Generation error', {
        description: 'Network error - please check your connection',
        duration: 8000
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
      setContext('');
      setNewTitle('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Create Similar Training Module
          </DialogTitle>
          <DialogDescription>
            Create a new training module based on "{sourceModule.title}" with your specific context and requirements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="source-module">Source Module</Label>
              <Input
                id="source-module"
                value={`${sourceModule.title} (${sourceModule.procedureTitle})`}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="new-title">New Module Title (Optional)</Label>
              <Input
                id="new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Neurosurgery for Nurses, Advanced Cardiac Procedures"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank to auto-generate a title based on your context
              </p>
            </div>

            <div>
              <Label htmlFor="context">
                Context & Requirements <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Describe what you want the new module to focus on. For example:&#10;&#10;• Target audience (e.g., nurses, residents, specialists)&#10;• Specific procedures or techniques to emphasize&#10;• Additional topics to include&#10;• Different difficulty level or approach&#10;• Specific scenarios or case studies to cover&#10;&#10;Example: 'Create a version focused on what nurses need to know during neurosurgery procedures, including their specific responsibilities, monitoring requirements, and emergency protocols.'"
                className="mt-1 min-h-[200px] resize-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Be specific about what should be different or additional in the new module
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isGenerating || !context.trim()}
              className="min-w-[120px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Create Module
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 