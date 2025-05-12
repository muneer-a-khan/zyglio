
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash, ArrowUpDown, MessageSquarePlus, Zap, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface TranscriptEditorProps {
  transcript: string;
  onChange: (text: string) => void;
}

interface Step {
  id: string;
  content: string;
  comments: string[];
}

const TranscriptEditor = ({ transcript, onChange }: TranscriptEditorProps) => {
  const [editedTranscript, setEditedTranscript] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);

  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditedTranscript(newValue);
    onChange(newValue);
  };

  const createStep = () => {
    if (editedTranscript.trim()) {
      const newStep = {
        id: crypto.randomUUID(),
        content: editedTranscript.trim(),
        comments: []
      };
      setSteps([...steps, newStep]);
      setEditedTranscript("");
      onChange("");
    }
  };

  const generateStepsWithAI = async () => {
    if (!editedTranscript.trim()) {
      toast.error("Please record or enter a transcript first");
      return;
    }

    setIsGeneratingSteps(true);
    
    try {
      // For demo purposes, we'll simulate AI processing with a timeout
      // In a real implementation, this would be an API call to an AI service
      setTimeout(() => {
        const sentences = editedTranscript
          .split(/(?<=\.|\?|\!)\s+/)
          .filter(sentence => sentence.trim().length > 0);
        
        const generatedSteps = sentences.map(sentence => ({
          id: crypto.randomUUID(),
          content: sentence.trim(),
          comments: []
        }));
        
        setSteps(generatedSteps);
        setEditedTranscript("");
        onChange("");
        toast.success("Steps generated successfully!");
        setIsGeneratingSteps(false);
      }, 1500);
      
    } catch (error) {
      console.error("Error generating steps:", error);
      toast.error("Failed to generate steps. Please try again.");
      setIsGeneratingSteps(false);
    }
  };

  const addQuestionsWithAI = async () => {
    if (steps.length === 0) {
      toast.error("Please create steps first");
      return;
    }
    
    setIsAddingQuestions(true);
    
    try {
      // Simulate AI processing
      setTimeout(() => {
        const updatedSteps = steps.map(step => {
          // Only add a comment to steps that don't have comments yet
          if (step.comments.length === 0) {
            return {
              ...step,
              comments: ["Is this step necessary for all cases, or are there exceptions?"]
            };
          }
          return step;
        });
        
        setSteps(updatedSteps);
        toast.success("Questions added successfully!");
        setIsAddingQuestions(false);
      }, 1500);
      
    } catch (error) {
      console.error("Error adding questions:", error);
      toast.error("Failed to add questions. Please try again.");
      setIsAddingQuestions(false);
    }
  };

  const handleStepChange = (id: string, newContent: string) => {
    const updatedSteps = steps.map(step => 
      step.id === id ? { ...step, content: newContent } : step
    );
    setSteps(updatedSteps);
  };

  const handleStepDelete = (id: string) => {
    const updatedSteps = steps.filter(step => step.id !== id);
    setSteps(updatedSteps);
    toast.info("Step deleted");
  };

  const handleAddComment = (stepId: string) => {
    const updatedSteps = steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          comments: [...step.comments, ""]
        };
      }
      return step;
    });
    setSteps(updatedSteps);
  };

  const handleCommentChange = (stepId: string, commentIndex: number, content: string) => {
    const updatedSteps = steps.map(step => {
      if (step.id === stepId) {
        const updatedComments = [...step.comments];
        updatedComments[commentIndex] = content;
        return {
          ...step,
          comments: updatedComments
        };
      }
      return step;
    });
    setSteps(updatedSteps);
  };

  const handleDeleteComment = (stepId: string, commentIndex: number) => {
    const updatedSteps = steps.map(step => {
      if (step.id === stepId) {
        const updatedComments = step.comments.filter((_, i) => i !== commentIndex);
        return {
          ...step,
          comments: updatedComments
        };
      }
      return step;
    });
    setSteps(updatedSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === steps.length - 1)) {
      return;
    }
    
    const newSteps = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 border">
        <h3 className="text-lg font-medium mb-2">Current Transcript</h3>
        <Textarea
          value={editedTranscript}
          onChange={handleTranscriptChange}
          className="min-h-[100px] bg-gray-50"
          placeholder="Your recorded transcript will appear here. You can edit it before creating steps."
        />
        <div className="mt-2 flex justify-between flex-wrap gap-2">
          <Button 
            onClick={createStep} 
            disabled={!editedTranscript.trim()}
            size="sm"
          >
            <Plus className="mr-1 h-4 w-4" /> Create Single Step
          </Button>
          
          <div className="flex gap-2">
            <Button 
              onClick={generateStepsWithAI} 
              disabled={!editedTranscript.trim() || isGeneratingSteps}
              variant="outline"
              size="sm"
              className={isGeneratingSteps ? "animate-pulse" : ""}
            >
              <Zap className="mr-1 h-4 w-4" /> 
              {isGeneratingSteps ? "Generating..." : "Generate Steps with AI"}
            </Button>
            
            <Button 
              onClick={addQuestionsWithAI} 
              disabled={steps.length === 0 || isAddingQuestions}
              variant="outline"
              size="sm"
              className={isAddingQuestions ? "animate-pulse" : ""}
            >
              <MessageSquarePlus className="mr-1 h-4 w-4" /> 
              {isAddingQuestions ? "Adding..." : "Add Questions with AI"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Procedural Steps</h3>
        {steps.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-muted-foreground">No steps created yet. Record and create your first step.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={step.id} className="transition-all hover:shadow-md">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Step {index + 1}</h4>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                        className="text-xs h-7 px-2"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === steps.length - 1}
                        className="text-xs h-7 px-2"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleStepDelete(step.id)}
                        className="text-xs h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <Textarea
                    value={step.content}
                    onChange={(e) => handleStepChange(step.id, e.target.value)}
                    className="min-h-[80px] mb-2"
                  />
                  
                  {/* Comments/Questions section */}
                  <div className="mt-3">
                    {step.comments.map((comment, commentIndex) => (
                      <div key={commentIndex} className="flex mt-2 gap-2">
                        <Textarea
                          value={comment}
                          onChange={(e) => handleCommentChange(step.id, commentIndex, e.target.value)}
                          className="text-sm bg-gray-50 min-h-[60px] flex-grow"
                          placeholder="Comment or question..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => handleDeleteComment(step.id, commentIndex)}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddComment(step.id)}
                      className="mt-2"
                    >
                      <MessageSquarePlus className="mr-1 h-4 w-4" /> Add Comment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptEditor;
