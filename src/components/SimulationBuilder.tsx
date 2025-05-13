import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  PlayCircle, 
  Plus, 
  Mic, 
  Trash, 
  Laptop, 
  Radio, 
  Save,
  MessageSquare,
  Settings,
  Smartphone,
  BadgeCheck
} from "lucide-react";
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface Step {
  id: string;
  content: string;
  comments: string[];
}

interface SimulationBuilderProps {
  steps: Step[];
  procedureName: string;
}

const SimulationBuilder = ({ steps, procedureName = "Sample Procedure" }: SimulationBuilderProps) => {
  const [activeTab, setActiveTab] = useState("settings");
  const [enableVoiceInput, setEnableVoiceInput] = useState(true);
  const [enableTextInput, setEnableTextInput] = useState(true);
  const [simulationMode, setSimulationMode] = useState("guided");
  const [feedbackLevel, setFeedbackLevel] = useState("detailed");
  const [enableScoring, setEnableScoring] = useState(true);
  const [timeLimit, setTimeLimit] = useState("0");
  const [simulationSteps, setSimulationSteps] = useState<{
    id: string;
    content: string;
    isCheckpoint: boolean;
    expectedResponses: string[];
  }[]>(steps.map(step => ({
    id: step.id,
    content: step.content,
    isCheckpoint: false,
    expectedResponses: []
  })));
  
  const handleStepChange = (id: string, content: string) => {
    setSimulationSteps(prev => 
      prev.map(step => step.id === id ? { ...step, content } : step)
    );
  };

  const toggleCheckpoint = (id: string) => {
    setSimulationSteps(prev => 
      prev.map(step => step.id === id ? { ...step, isCheckpoint: !step.isCheckpoint } : step)
    );
  };

  const addExpectedResponse = (stepId: string, response: string = "") => {
    setSimulationSteps(prev => 
      prev.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            expectedResponses: [...step.expectedResponses, response]
          };
        }
        return step;
      })
    );
  };

  const updateExpectedResponse = (stepId: string, index: number, value: string) => {
    setSimulationSteps(prev => 
      prev.map(step => {
        if (step.id === stepId) {
          const newResponses = [...step.expectedResponses];
          newResponses[index] = value;
          return {
            ...step,
            expectedResponses: newResponses
          };
        }
        return step;
      })
    );
  };

  const removeExpectedResponse = (stepId: string, index: number) => {
    setSimulationSteps(prev => 
      prev.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            expectedResponses: step.expectedResponses.filter((_, i) => i !== index)
          };
        }
        return step;
      })
    );
  };

  const saveSimulation = () => {
    // In a real app, this would save to a backend
    // For now we'll just show a success message
    toast.success("Simulation saved successfully!");
  };

  const getModeDescription = () => {
    switch (simulationMode) {
      case "guided":
        return "Guided mode walks users through each step in order with detailed instructions";
      case "test":
        return "Test mode evaluates user knowledge by requiring correct responses at key checkpoints";
      case "freeform":
        return "Freeform mode allows users to navigate the procedure non-linearly through voice commands";
      default:
        return "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Simulation Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="steps">
              <MessageSquare className="w-4 h-4 mr-2" />
              Steps & Responses
            </TabsTrigger>
            <TabsTrigger value="preview">
              <PlayCircle className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Simulation Name</h3>
                <Input 
                  placeholder="Enter simulation name" 
                  defaultValue={`${procedureName} Simulation`}
                />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Mode</h3>
                <Select 
                  defaultValue={simulationMode} 
                  onValueChange={setSimulationMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guided">Guided Mode</SelectItem>
                    <SelectItem value="test">Test Mode</SelectItem>
                    <SelectItem value="freeform">Freeform Mode</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">{getModeDescription()}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Input Methods</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-blue-500" />
                    <Label htmlFor="voice-input">Voice Input</Label>
                  </div>
                  <Switch 
                    id="voice-input" 
                    checked={enableVoiceInput} 
                    onCheckedChange={setEnableVoiceInput} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Laptop className="w-4 h-4 text-blue-500" />
                    <Label htmlFor="text-input">Text Input</Label>
                  </div>
                  <Switch 
                    id="text-input" 
                    checked={enableTextInput} 
                    onCheckedChange={setEnableTextInput} 
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Evaluation Settings</h3>
                
                <div className="space-y-3">
                  <Label htmlFor="feedback-level">Feedback Level</Label>
                  <Select 
                    defaultValue={feedbackLevel} 
                    onValueChange={setFeedbackLevel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select feedback level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enable-scoring" 
                    checked={enableScoring}
                    onCheckedChange={(checked) => setEnableScoring(!!checked)} 
                  />
                  <Label htmlFor="enable-scoring">Enable Scoring</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time-limit">Time Limit (minutes, 0 for no limit)</Label>
                  <Input 
                    id="time-limit"
                    type="number" 
                    min="0" 
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="steps" className="space-y-6">
            {simulationSteps.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                <p className="text-muted-foreground">No procedure steps available. Create steps first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {simulationSteps.map((step, index) => (
                  <Card key={step.id} className="relative overflow-hidden">
                    {step.isCheckpoint && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 text-xs rounded-bl-md">
                        Checkpoint
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Step {index + 1}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`checkpoint-${step.id}`}
                              checked={step.isCheckpoint}
                              onCheckedChange={() => toggleCheckpoint(step.id)}
                            />
                            <Label htmlFor={`checkpoint-${step.id}`}>Checkpoint</Label>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea 
                        value={step.content}
                        onChange={(e) => handleStepChange(step.id, e.target.value)}
                        className="min-h-[80px]"
                      />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium">Expected Responses</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => addExpectedResponse(step.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" /> Add Response
                          </Button>
                        </div>
                        
                        {step.expectedResponses.length === 0 ? (
                          <p className="text-sm text-gray-500 italic p-2">
                            No expected responses defined yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {step.expectedResponses.map((response, responseIndex) => (
                              <div key={responseIndex} className="flex items-center space-x-2">
                                <Input
                                  value={response}
                                  onChange={(e) => updateExpectedResponse(step.id, responseIndex, e.target.value)}
                                  placeholder="Enter an expected response"
                                  className="text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeExpectedResponse(step.id, responseIndex)}
                                  className="h-9 w-9 text-red-500"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-6">
            <div className="bg-gray-50 border rounded-lg p-6">
              <div className="text-center max-w-md mx-auto space-y-6">
                <div className="flex flex-col items-center">
                  <div className="w-64 h-96 border-8 border-gray-800 rounded-3xl relative overflow-hidden bg-white shadow-xl">
                    <div className="absolute inset-x-0 top-0 h-6 bg-gray-800 flex justify-center items-center">
                      <div className="w-16 h-1 bg-gray-600 rounded-full"></div>
                    </div>
                    <div className="p-4 flex flex-col h-full">
                      <div className="text-center mb-4">
                        <h3 className="font-bold text-blue-600">{procedureName}</h3>
                        <p className="text-xs text-gray-500">Voice-Guided Simulation</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <Mic className="h-12 w-12 text-blue-500" />
                        <p className="text-sm text-center">
                          "Please describe the first step of {procedureName.toLowerCase()}"
                        </p>
                      </div>
                      <div className="border-t pt-3 flex justify-between">
                        <Badge variant="outline" className="text-xs">
                          <Smartphone className="h-3 w-3 mr-1" /> Mobile
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Radio className="h-3 w-3 mr-1" /> Voice
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <BadgeCheck className="h-3 w-3 mr-1" /> {simulationMode}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Device preview (simplified)
                  </p>
                </div>
                
                <div className="pt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    This is a simplified preview. The actual simulation will be interactive and respond to user input.
                  </p>
                  <Button 
                    onClick={() => toast.success("Simulation preview would launch here!")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" /> Test Simulation
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-6">
          <Button onClick={saveSimulation} className="bg-green-600 hover:bg-green-700">
            <Save className="mr-2 h-4 w-4" /> Save Simulation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimulationBuilder; 