import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, ArrowUp, ArrowDown, MessageSquare, Zap, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  content: string;
  comments: string[];
}

interface TranscriptEditorProps {
  transcript: string;
  onChange: (text: string) => void;
}

const TranscriptEditor = ({ transcript, onChange }: TranscriptEditorProps) => {
  const [editedTranscript, setEditedTranscript] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

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
      toast.success("Step created successfully");
    }
  };

  const updateStep = (id: string, content: string) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, content } : step
    ));
  };

  const deleteStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
    if (activeStepId === id) {
      setActiveStepId(null);
    }
    toast.success("Step deleted");
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    setSteps(newSteps);
  };

  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    setSteps(newSteps);
  };

  const addComment = (stepId: string) => {
    if (!newComment.trim()) return;
    
    setSteps(steps.map(step => 
      step.id === stepId 
        ? { ...step, comments: [...step.comments, newComment.trim()] } 
        : step
    ));
    
    setNewComment("");
    toast.success("Comment added");
  };

  const removeComment = (stepId: string, commentIndex: number) => {
    setSteps(steps.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            comments: step.comments.filter((_, i) => i !== commentIndex) 
          } 
        : step
    ));
  };

  const generateStepsWithAI = () => {
    if (!editedTranscript.trim()) return;
    
    setIsGeneratingSteps(true);
    
    // Simulate AI processing
    setTimeout(() => {
      // Example: Split by sentences and create steps
      const sentences = editedTranscript
        .split(/[.!?]+/)
        .filter(sentence => sentence.trim().length > 5)
        .map(sentence => sentence.trim());
      
      const newSteps = sentences.map(sentence => ({
        id: crypto.randomUUID(),
        content: sentence,
        comments: []
      }));
      
      if (newSteps.length > 0) {
        setSteps([...steps, ...newSteps]);
        setEditedTranscript("");
        onChange("");
        toast.success(`Created ${newSteps.length} steps from transcript`);
      } else {
        toast.error("Could not generate any meaningful steps from transcript");
      }
      
      setIsGeneratingSteps(false);
    }, 1500);
  };

  const addQuestionsWithAI = () => {
    if (steps.length === 0) return;
    
    setIsAddingQuestions(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const updatedSteps = steps.map(step => {
        // Only add a question if the step doesn't already have one
        if (step.comments.length === 0) {
          const questionTypes = [
            "What is the importance of this step?",
            "What could go wrong at this point?",
            "What alternative approaches could be used here?",
            "What is the next step after this one?",
            "Why is this technique preferred?"
          ];
          
          const randomQuestion = questionTypes[Math.floor(Math.random() * questionTypes.length)];
          return {
            ...step,
            comments: [...step.comments, randomQuestion]
          };
        }
        return step;
      });
      
      setSteps(updatedSteps);
      toast.success("Added questions to steps");
      setIsAddingQuestions(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
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
            className="bg-blue-600 hover:bg-blue-700"
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
              <MessageSquare className="mr-1 h-4 w-4" /> 
              {isAddingQuestions ? "Adding..." : "Add Questions with AI"}
            </Button>
          </div>
        </div>
      </div>

      {steps.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Procedure Steps ({steps.length})</h3>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <Card key={step.id} className={cn(
                "border", 
                activeStepId === step.id ? "border-blue-500 shadow-md" : ""
              )}>
                <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
                  <CardTitle className="text-base">Step {index + 1}</CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => moveStepUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => moveStepDown(index)}
                      disabled={index === steps.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500"
                      onClick={() => deleteStep(step.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <Textarea
                    value={step.content}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    className="min-h-[80px] mb-3"
                  />
                  
                  {step.comments.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <h4 className="text-sm font-medium">Comments/Questions:</h4>
                      <div className="space-y-2">
                        {step.comments.map((comment, commentIndex) => (
                          <div key={commentIndex} className="flex justify-between items-start text-sm p-2 bg-gray-50 rounded-md">
                            <p>{comment}</p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => removeComment(step.id, commentIndex)}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add a comment or question..." 
                      value={activeStepId === step.id ? newComment : ""}
                      onChange={(e) => {
                        setActiveStepId(step.id);
                        setNewComment(e.target.value);
                      }}
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && activeStepId === step.id) {
                          e.preventDefault();
                          addComment(step.id);
                        }
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => addComment(step.id)}
                      disabled={!newComment.trim() || activeStepId !== step.id}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptEditor;
