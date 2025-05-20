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
import { generateStepsFromTranscript, generateYamlFromSteps } from "@/lib/deepseek";
import * as yaml from 'js-yaml';

export interface TranscriptEditorProps {
  initialTranscript: string;
  onTranscriptChange: (text: string) => void;
  onStepsChange?: (steps: Step[]) => void;
  steps?: Step[];
  onYamlGenerated?: (yaml: string) => void;
  procedureName: string;
}

const TranscriptEditor = ({ 
  initialTranscript,
  onTranscriptChange,
  onStepsChange, 
  steps = [],
  onYamlGenerated,
  procedureName,
}: TranscriptEditorProps) => {
  const [currentTranscript, setCurrentTranscript] = useState(initialTranscript);
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

  useEffect(() => {
    setCurrentTranscript(initialTranscript);
  }, [initialTranscript]);

  const handleTranscriptTextAreaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setCurrentTranscript(newValue);
    onTranscriptChange(newValue);
  };

  const handleAddStepManual = () => {
    if (!currentTranscript.trim()) {
      toast.info("Transcript is empty. Cannot create step.");
      return;
    }
    
    const newStep: Step = {
      id: uuidv4(),
      content: currentTranscript.trim(),
      comments: []
    };
    
    const newStepsArray = [...procedureSteps, newStep];
    setProcedureSteps(newStepsArray);
    
    if (onStepsChange) {
      onStepsChange(newStepsArray);
    }
    
    setCurrentTranscript("");
    toast.success("Manual step created successfully");
  };

  const handleUpdateStepContent = (id: string, newContent: string) => {
    const updatedSteps = procedureSteps.map(step =>
      step.id === id ? { ...step, content: newContent } : step
    );
    setProcedureSteps(updatedSteps);
    if (onStepsChange) {
      onStepsChange(updatedSteps);
    }
  };
  
  const handleFinalizeUpdateStep = (id: string, finalContent: string) => {
    handleUpdateStepContent(id, finalContent);
    setEditingStepId(null);
    toast.success("Step updated");
  };

  const handleRemoveStep = (id: string) => {
    const newStepsArray = procedureSteps.filter(step => step.id !== id);
    setProcedureSteps(newStepsArray);
    
    if (onStepsChange) {
      onStepsChange(newStepsArray);
    }
    
    if (activeStepId === id) {
      setActiveStepId(null);
    }
    
    toast.success("Step deleted");
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === procedureSteps.length - 1) return;

    const newStepsArray = [...procedureSteps];
    const itemToMove = newStepsArray[index];
    newStepsArray.splice(index, 1);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    newStepsArray.splice(newIndex, 0, itemToMove);
    
    setProcedureSteps(newStepsArray);
    if (onStepsChange) {
      onStepsChange(newStepsArray);
    }
  };

  const generateAndProcessStepsWithAI = async () => {
    if (!currentTranscript.trim()) {
      toast.info("Please provide a transcript to generate steps.");
      return;
    }

    setIsGeneratingSteps(true);
    toast.info("Generating steps from transcript...");

    try {
      let rawSteps: string[] = [];
      try {
        rawSteps = await generateStepsFromTranscript(currentTranscript);
      } catch (apiError) {
        console.error('DeepSeek API error during step generation:', apiError);
        toast.error('Step Generation API error. Using fallback sentence splitting.');
        rawSteps = currentTranscript
          .split(/[.!?]+/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 10)
          .map((sentence, index) => `Step ${index + 1}: ${sentence}`);
      }
      
      if (rawSteps.length === 0) {
        toast.error('Could not generate any steps from the transcript.');
        setIsGeneratingSteps(false);
        return;
      }
      
      const newStepObjects: Step[] = rawSteps.map(stepText => ({
        id: uuidv4(),
        content: stepText,
        comments: []
      }));

      const updatedStepsArray = [...procedureSteps, ...newStepObjects];
      setProcedureSteps(updatedStepsArray);
      if (onStepsChange) {
        onStepsChange(updatedStepsArray);
      }
      toast.success(`${newStepObjects.length} steps generated and added.`);
      
      // Clear the transcript input without triggering a save
      setCurrentTranscript("");
      // Don't call onTranscriptChange with empty string

      await generateAndPassYaml(updatedStepsArray, procedureName);

    } catch (error) {
      console.error('Error in AI step generation process:', error);
      toast.error('Failed to process AI-generated steps.');
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const generateAndPassYaml = async (currentSteps: Step[], nameOfProcedure: string) => {
    if (currentSteps.length === 0) {
      toast.info("No steps available to generate YAML.");
      if (onYamlGenerated) onYamlGenerated("");
      return;
    }
    if (!onYamlGenerated) {
      console.warn("onYamlGenerated prop is not provided to TranscriptEditor.");
      return;
    }
    if (!nameOfProcedure) {
      toast.error("Procedure name is not available. Cannot generate YAML.");
      return;
    }

    toast.info("Generating YAML from current steps...");
    try {
      const yamlString = await generateYamlFromSteps(currentSteps, nameOfProcedure);
      if (yamlString) {
        onYamlGenerated(yamlString);
        toast.success("YAML generated successfully from current steps.");
      } else {
        toast.error("YAML generation resulted in empty content.");
        if (onYamlGenerated) onYamlGenerated("");
      }
    } catch (yamlError) {
      console.error('DeepSeek API error during YAML generation:', yamlError);
      toast.error('YAML Generation API error.');
      if (onYamlGenerated) onYamlGenerated("");
    }
  };

  const addQuestionsWithAI = () => {
    if (procedureSteps.length === 0) {
      toast.info("No steps to add questions to.");
      return;
    }
    setIsAddingQuestions(true);
    toast.info("Adding AI questions to steps (mock implementation)...");

    setTimeout(() => {
      const updatedStepsWithQuestions = procedureSteps.map((step) => {
        if (step.comments.length === 0) {
          const questionTypes = [
            "What is the primary objective of this specific step?",
            "What are potential risks or challenges at this stage?",
            "How can one verify successful completion of this step?",
            "Are there alternative methods or tools for this step?",
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
      setProcedureSteps(updatedStepsWithQuestions);
      if (onStepsChange) {
        onStepsChange(updatedStepsWithQuestions);
      }
      toast.success("Mock questions added to steps.");
      setIsAddingQuestions(false);
    }, 1500);
  };

  const handleMoveStepUp = (index: number) => handleMoveStep(index, 'up');
  const handleMoveStepDown = (index: number) => handleMoveStep(index, 'down');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4 border">
        <h3 className="text-lg font-medium mb-2">Current Transcript</h3>
        <Textarea
          value={currentTranscript}
          onChange={handleTranscriptTextAreaChange}
          className="min-h-[100px] bg-gray-50"
          placeholder="Enter or paste your procedure transcript here..."
        />
        <div className="mt-2 flex justify-between flex-wrap gap-2">
          <Button
            onClick={handleAddStepManual}
            disabled={!currentTranscript.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-1 h-4 w-4" /> Create Step from Transcript
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={generateAndProcessStepsWithAI}
              disabled={!currentTranscript.trim() || isGeneratingSteps}
              variant="outline"
              size="sm"
            >
              {isGeneratingSteps ? (
                <>
                  <div className="spinner mr-1" /> Processing Transcript...
                </>
              ) : (
                <>
                  <div className="mr-1">✨</div> Auto-Generate Steps & YAML
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
                  <div className="spinner mr-1" /> Adding Questions...
                </>
              ) : (
                <>
                  <div className="mr-1">❓</div> Add AI Questions
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
                  <CardTitle 
                    className="text-base cursor-pointer hover:text-blue-600"
                    onClick={() => editingStepId === step.id ? setEditingStepId(null) : setEditingStepId(step.id)}
                  >
                    Step {index + 1}{editingStepId === step.id ? " (Editing)" : ""}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveStepUp(index)}
                      disabled={index === 0}
                      title="Move step up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveStepDown(index)}
                      disabled={index === procedureSteps.length - 1}
                      title="Move step down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleRemoveStep(step.id)}
                      title="Remove step"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {editingStepId === step.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={step.content}
                        onChange={(e) => handleUpdateStepContent(step.id, e.target.value)}
                        className="min-h-[80px] mb-2"
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingStepId(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleFinalizeUpdateStep(step.id, step.content)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Save Step
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <p 
                          className="text-gray-700 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-1 rounded"
                          onClick={() => setEditingStepId(step.id)}
                        >
                          {step.content}
                        </p>
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="ml-2"
                            onClick={() => setEditingStepId(step.id)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                      </div>
                    </div>
                  )}

                  {step.comments.length > 0 && (
                    <div className="mt-3 pl-0">
                      <h4 className="text-sm font-medium text-gray-600">Comments/Questions:</h4>
                      <div className="space-y-1 mt-1">
                        {step.comments.map((comment, commentIndex) => (
                          <div
                            key={`comment-${step.id}-${commentIndex}`}
                            className="flex justify-between items-start text-sm p-2 bg-gray-50 rounded-md border"
                          >
                            <p className="text-gray-700 flex-grow">{comment}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-2 text-red-400 hover:text-red-600 flex-shrink-0"
                              onClick={() => {
                                const updatedStepsWithCommentRemoved = procedureSteps.map((s) =>
                                  s.id === step.id
                                    ? {
                                        ...s,
                                        comments: s.comments.filter((_, i) => i !== commentIndex),
                                      }
                                    : s
                                );
                                setProcedureSteps(updatedStepsWithCommentRemoved);
                                if (onStepsChange) {
                                  onStepsChange(updatedStepsWithCommentRemoved);
                                }
                              }}
                              title="Remove comment"
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
                        placeholder="Add a comment or question for this step..."
                        value={activeStepId === step.id ? newComment : ""}
                        onChange={(e) => {
                          setActiveStepId(step.id);
                          setNewComment(e.target.value);
                        }}
                        onFocus={() => setActiveStepId(step.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && activeStepId === step.id && newComment.trim()) {
                            e.preventDefault();
                            const updatedStepsWithNewComment = procedureSteps.map((s) =>
                              s.id === step.id
                                ? {
                                    ...s,
                                    comments: [...s.comments, newComment.trim()],
                                  }
                                : s
                            );
                            setProcedureSteps(updatedStepsWithNewComment);
                            if (onStepsChange) {
                              onStepsChange(updatedStepsWithNewComment);
                            }
                            setNewComment("");
                          }
                        }}
                        className="flex-grow"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!newComment.trim() || activeStepId !== step.id) return;
                          const updatedStepsWithNewComment = procedureSteps.map((s) =>
                            s.id === step.id
                              ? {
                                  ...s,
                                  comments: [...s.comments, newComment.trim()],
                                }
                              : s
                          );
                          setProcedureSteps(updatedStepsWithNewComment);
                          if (onStepsChange) {
                            onStepsChange(updatedStepsWithNewComment);
                          }
                          setNewComment("");
                        }}
                        disabled={!newComment.trim() || activeStepId !== step.id}
                        className="flex-shrink-0"
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
