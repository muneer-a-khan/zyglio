import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Zap,
  RotateCw,
  Pencil,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Step } from "@/lib/ProcedureService";
import { v4 as uuidv4 } from 'uuid';
import { generateYamlFromTranscript, generateStepsFromTranscript } from "@/lib/openai";
import * as yaml from 'js-yaml';

export interface TranscriptEditorProps {
  transcript: string;
  onChange: (text: string) => void;
  onStepsChange?: (steps: Step[]) => void;
  steps?: Step[];
  onYamlGenerated?: (yaml: any) => void;
}

const TranscriptEditor = ({ 
  transcript, 
  onChange, 
  onStepsChange, 
  steps = [],
  onYamlGenerated,
}: TranscriptEditorProps) => {
  const [procedureSteps, setProcedureSteps] = useState<Step[]>(steps);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  useEffect(() => {
    if (steps.length > 0) {
      setProcedureSteps(steps);
    }
  }, [steps]);

  const handleTranscriptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleAddStep = () => {
    if (!transcript.trim()) return;
    
    const newStep: Step = {
      id: uuidv4(),
      content: transcript,
      comments: []
    };
    
    const newSteps = [...procedureSteps, newStep];
    setProcedureSteps(newSteps);
    
    if (onStepsChange) {
      onStepsChange(newSteps);
    }
    
    onChange("");
    toast.success("Step created successfully");
  };

  const handleUpdateStep = (id: string, content: string) => {
    const newSteps = procedureSteps.map(step =>
      step.id === id ? { ...step, content } : step
    );
    
    setProcedureSteps(newSteps);
    
    if (onStepsChange) {
      onStepsChange(newSteps);
    }
    
    setEditingStepId(null);
  };

  const handleRemoveStep = (id: string) => {
    const newSteps = procedureSteps.filter(step => step.id !== id);
    setProcedureSteps(newSteps);
    
    if (onStepsChange) {
      onStepsChange(newSteps);
    }
    
    if (activeStepId === id) {
      setActiveStepId(null);
    }
    
    toast.success("Step deleted");
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    
    const newSteps = [...procedureSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    
    setProcedureSteps(newSteps);
    
    if (onStepsChange) {
      onStepsChange(newSteps);
    }
  };

  const handleMoveStepDown = (index: number) => {
    if (index === procedureSteps.length - 1) return;
    
    const newSteps = [...procedureSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    
    setProcedureSteps(newSteps);
    
    if (onStepsChange) {
      onStepsChange(newSteps);
    }
  };

  const generateStepsWithAI = async () => {
    if (!transcript.trim()) return;

    setIsGeneratingSteps(true);

    try {
      // First, try to generate steps from the OpenAI API
      let generatedSteps: string[] = [];
      
      try {
        generatedSteps = await generateStepsFromTranscript(transcript);
      } catch (apiError) {
        console.error('API error in step generation:', apiError);
        toast.error('API error - using fallback method');
        
        // Fallback: Split the transcript into sentences and use as steps
        generatedSteps = transcript
          .split(/[.!?]+/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 10)
          .map((sentence, index) => `Step ${index + 1}: ${sentence}`);
      }
      
      if (generatedSteps.length === 0) {
        toast.error('Could not generate any steps from transcript');
        return;
      }
      
      // Create Step objects from the generated steps
      const newSteps = generatedSteps.map(stepText => ({
        id: uuidv4(),
        content: stepText,
        comments: []
      }));

      // Update the steps state
      const updatedSteps = [...procedureSteps, ...newSteps];
      setProcedureSteps(updatedSteps);
      
      if (onStepsChange) {
        onStepsChange(updatedSteps);
      }

      // Then, try to generate YAML from the steps
      try {
        const yamlString = await generateYamlFromTranscript(
          generatedSteps.join('\n')
        );
        
        // Store the YAML in the parent component
        if (onYamlGenerated && yamlString) {
          onYamlGenerated(yamlString);
        }
      } catch (yamlError) {
        console.error('Error generating YAML:', yamlError);
        toast.error('Generated steps but failed to create YAML');
      }

      onChange("");
      toast.success(`Created ${newSteps.length} steps from transcript`);
    } catch (error) {
      console.error('Error in step generation process:', error);
      toast.error('Failed to generate steps from transcript');
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const addQuestionsWithAI = () => {
    if (procedureSteps.length === 0) return;

    setIsAddingQuestions(true);

    setTimeout(() => {
      const updatedSteps = procedureSteps.map((step) => {
        if (step.comments.length === 0) {
          const questionTypes = [
            "What is the purpose of this step?",
            "What could go wrong at this step?",
            "How do you know when this step is completed correctly?",
            "What is an alternative approach for this step?",
          ];
          
          return {
            ...step,
            comments: [
              questionTypes[Math.floor(Math.random() * questionTypes.length)],
            ],
          };
        }
        return step;
      });

      setProcedureSteps(updatedSteps);
      toast.success("Added questions to steps");
      setIsAddingQuestions(false);
      
      if (onStepsChange) {
        onStepsChange(updatedSteps);
      }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4 border">
        <h3 className="text-lg font-medium mb-2">Current Transcript</h3>
        <Textarea
          value={transcript}
          onChange={handleTranscriptChange}
          className="min-h-[100px] bg-gray-50"
          placeholder="Enter or paste your procedure transcript here..."
        />
        <div className="mt-2 flex justify-between flex-wrap gap-2">
          <Button
            onClick={handleAddStep}
            disabled={!transcript.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-1 h-4 w-4" /> Create Step
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={generateStepsWithAI}
              disabled={!transcript.trim() || isGeneratingSteps}
              variant="outline"
              size="sm"
            >
              {isGeneratingSteps ? (
                <>
                  <div className="spinner mr-1" /> Processing...
                </>
              ) : (
                <>
                  <div className="mr-1">✨</div> Auto-Generate Steps
                </>
              )}
            </Button>

            <Button
              onClick={addQuestionsWithAI}
              disabled={procedureSteps.length === 0 || isAddingQuestions}
              variant="outline"
              size="sm"
            >
              {isAddingQuestions ? (
                <>
                  <div className="spinner mr-1" /> Processing...
                </>
              ) : (
                <>
                  <div className="mr-1">❓</div> Add Questions
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {procedureSteps.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">
            Procedure Steps ({procedureSteps.length})
          </h3>
          <div className="space-y-3">
            {procedureSteps.map((step, index) => (
              <Card
                key={step.id}
                className={cn(
                  "border",
                  activeStepId === step.id ? "border-blue-500 shadow-md" : ""
                )}
              >
                <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
                  <CardTitle className="text-base">Step {index + 1}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveStepUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveStepDown(index)}
                      disabled={index === procedureSteps.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleRemoveStep(step.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {editingStepId === step.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={step.content}
                        onChange={(e) => handleUpdateStep(step.id, e.target.value)}
                        className="min-h-[80px] mb-3"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingStepId(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => handleUpdateStep(step.id, step.content)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="bg-blue-100 text-blue-800 font-medium rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <div className="text-lg font-medium">Step {index + 1}</div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingStepId(step.id)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemoveStep(step.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 pl-11">
                        <p className="text-gray-700 whitespace-pre-wrap">{step.content}</p>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveStepUp(index)}
                          disabled={index === 0}
                        >
                          Move Up
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveStepDown(index)}
                          disabled={index === procedureSteps.length - 1}
                        >
                          Move Down
                        </Button>
                      </div>
                    </div>
                  )}

                  {step.comments.length > 0 && (
                    <div className="mt-3 pl-11">
                      <h4 className="text-sm font-medium">Comments/Questions:</h4>
                      <div className="space-y-2">
                        {step.comments.map((comment, commentIndex) => (
                          <div
                            key={`comment-${step.id}-${commentIndex}`}
                            className="flex justify-between items-start text-sm p-2 bg-gray-50 rounded-md"
                          >
                            <p>{comment}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                const updatedSteps = procedureSteps.map((s) =>
                                  s.id === step.id
                                    ? {
                                        ...s,
                                        comments: s.comments.filter((_, i) => i !== commentIndex),
                                      }
                                    : s
                                );
                                setProcedureSteps(updatedSteps);
                                if (onStepsChange) {
                                  onStepsChange(updatedSteps);
                                }
                              }}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment or question..."
                        value={activeStepId === step.id ? newComment : ""}
                        onChange={(e) => {
                          setActiveStepId(step.id);
                          setNewComment(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && activeStepId === step.id) {
                            e.preventDefault();
                            
                            if (!newComment.trim()) return;
                            
                            const updatedSteps = procedureSteps.map((s) =>
                              s.id === step.id
                                ? {
                                    ...s,
                                    comments: [...s.comments, newComment.trim()],
                                  }
                                : s
                            );
                            setProcedureSteps(updatedSteps);
                            if (onStepsChange) {
                              onStepsChange(updatedSteps);
                            }
                            setNewComment("");
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!newComment.trim()) return;
                          
                          const updatedSteps = procedureSteps.map((s) =>
                            s.id === step.id
                              ? {
                                  ...s,
                                  comments: [...s.comments, newComment.trim()],
                                }
                              : s
                          );
                          setProcedureSteps(updatedSteps);
                          if (onStepsChange) {
                            onStepsChange(updatedSteps);
                          }
                          setNewComment("");
                        }}
                        disabled={!newComment.trim() || activeStepId !== step.id}
                      >
                        <MessageCircle className="mr-1 h-4 w-4" /> Add
                      </Button>
                    </div>
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
