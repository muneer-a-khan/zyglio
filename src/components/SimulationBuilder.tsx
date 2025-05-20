"use client";

import { useState, useEffect } from "react";
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
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Step, procedureService } from "@/lib/ProcedureService";

export interface SimulationSettings {
  enabled: boolean;
  mode: "guided" | "freeform";
  timeLimit?: number;
  allowRetries: boolean;
  maxRetries?: number;
  showHints: boolean;
  requireMediaConfirmation: boolean;
  feedbackDelay: number;
  difficulty: "easy" | "medium" | "hard";
  name?: string;
  enableVoiceInput?: boolean;
  enableTextInput?: boolean;
  feedbackLevel?: string;
  enableScoring?: boolean;
  steps?: any[];
}

interface SimulationBuilderProps {
  steps: Step[];
  procedureName: string;
  initialSettings?: SimulationSettings;
  onChange: (settings: SimulationSettings) => void;
}

const defaultSettings: SimulationSettings = {
  enabled: true,
  mode: "guided",
  timeLimit: 300,
  allowRetries: true,
  maxRetries: 3,
  showHints: true,
  requireMediaConfirmation: false,
  feedbackDelay: 2,
  difficulty: "medium",
  enableVoiceInput: true,
  enableTextInput: true,
  feedbackLevel: "detailed",
  enableScoring: true,
  steps: []
};

const SimulationBuilder = ({
  steps,
  procedureName = "Sample Procedure",
  initialSettings,
  onChange
}: SimulationBuilderProps) => {
  const [activeTab, setActiveTab] = useState("settings");
  const [simulationName, setSimulationName] = useState(`${procedureName} Simulation`);
  const [settings, setSettings] = useState<SimulationSettings>(
    initialSettings || defaultSettings
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setSimulationName(initialSettings.name ?? `${procedureName} Simulation`);
      setSettings(initialSettings);
    }
  }, [initialSettings, procedureName]);

  useEffect(() => {
    if (steps.length > 0 && !initialSettings?.steps) {
      setSettings(prev => ({
        ...prev,
        steps: steps.map((step) => ({
          id: step.id,
          content: step.content,
          isCheckpoint: false,
          expectedResponses: [],
        }))
      }));
    }
  }, [steps, initialSettings]);

  const handleSettingChange = (key: keyof SimulationSettings, value: any) => {
    const updatedSettings = {
      ...settings,
      [key]: value
    };
    setSettings(updatedSettings);
    onChange(updatedSettings);
  };

  const handleStepChange = (id: string, content: string) => {
    const updatedSettings = {
      ...settings,
      steps: settings.steps?.map((step) =>
        step.id === id ? { ...step, content } : step
      ) || []
    };
    setSettings(updatedSettings);
    onChange(updatedSettings);
  };

  const toggleCheckpoint = (id: string) => {
    const updatedSettings = {
      ...settings,
      steps: settings.steps?.map((step) =>
        step.id === id ? { ...step, isCheckpoint: !step.isCheckpoint } : step
      ) || []
    };
    setSettings(updatedSettings);
    onChange(updatedSettings);
  };

  const addExpectedResponse = (stepId: string, response: string = "") => {
    const updatedSettings = {
      ...settings,
      steps: settings.steps?.map((step) => {
        if (step.id === stepId) {
          return {
            ...step,
            expectedResponses: [...(step.expectedResponses || []), response],
          };
        }
        return step;
      }) || []
    };
    setSettings(updatedSettings);
    onChange(updatedSettings);
  };

  const updateExpectedResponse = (
    stepId: string,
    index: number,
    value: string
  ) => {
    const updatedSettings = {
      ...settings,
      steps: settings.steps?.map((step) => {
        if (step.id === stepId) {
          const newResponses = [...(step.expectedResponses || [])];
          newResponses[index] = value;
          return {
            ...step,
            expectedResponses: newResponses,
          };
        }
        return step;
      }) || []
    };
    setSettings(updatedSettings);
    onChange(updatedSettings);
  };

  const removeExpectedResponse = (stepId: string, index: number) => {
    const updatedSettings = {
      ...settings,
      steps: settings.steps?.map((step) => {
        if (step.id === stepId) {
          return {
            ...step,
            expectedResponses: (step.expectedResponses || []).filter(
              (_, i) => i !== index
            ),
          };
        }
        return step;
      }) || []
    };
    setSettings(updatedSettings);
    onChange(updatedSettings);
  };

  const saveSimulation = async () => {
    try {
      setIsSaving(true);
      
      const simulationSettings: SimulationSettings = {
        name: simulationName,
        mode: settings.mode,
        enableVoiceInput: settings.enableVoiceInput ?? true,
        enableTextInput: settings.enableTextInput ?? true,
        feedbackLevel: settings.feedbackLevel ?? "detailed",
        enableScoring: settings.enableScoring ?? true,
        timeLimit: settings.timeLimit ?? 300,
        steps: settings.steps ?? []
      };
      
      await procedureService.saveSimulationSettings(simulationSettings);
      toast.success("Simulation settings saved successfully!");
    } catch (error) {
      console.error("Error saving simulation settings:", error);
      toast.error("Failed to save simulation settings");
    } finally {
      setIsSaving(false);
    }
  };

  const getModeDescription = () => {
    switch (settings.mode) {
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

  const stepsArray = settings.steps ?? [];

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
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Simulation Name</h3>
              <Input
                placeholder="Enter simulation name"
                value={simulationName ?? `${procedureName} Simulation`}
                onChange={(e) => setSimulationName(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">Mode</h3>
              <Select
                value={settings.mode ?? "guided"}
                onValueChange={(value) => handleSettingChange("mode", value)}
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

            <div className="space-y-3">
              <h3 className="text-lg font-medium">Input Methods</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-blue-500" />
                  <Label htmlFor="voice-input">Voice Input</Label>
                </div>
                <Switch
                  id="voice-input"
                  checked={settings.enableVoiceInput ?? true}
                  onCheckedChange={(checked) => handleSettingChange("enableVoiceInput", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Laptop className="w-4 h-4 text-blue-500" />
                  <Label htmlFor="text-input">Text Input</Label>
                </div>
                <Switch
                  id="text-input"
                  checked={settings.enableTextInput ?? true}
                  onCheckedChange={(checked) => handleSettingChange("enableTextInput", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-lg font-medium">Evaluation Settings</h3>

              <div className="space-y-3">
                <Label htmlFor="feedback-level">Feedback Level</Label>
                <Select
                  value={settings.feedbackLevel ?? "detailed"}
                  onValueChange={(value) => handleSettingChange("feedbackLevel", value)}
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
                  checked={settings.enableScoring ?? true}
                  onCheckedChange={(checked) => handleSettingChange("enableScoring", !!checked)}
                />
                <Label htmlFor="enable-scoring">Enable Scoring</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-limit">
                  Time Limit (minutes, 0 for no limit)
                </Label>
                <Input
                  id="time-limit"
                  type="number"
                  min="0"
                  value={settings.timeLimit ?? 300}
                  onChange={(e) => handleSettingChange("timeLimit", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="steps" className="space-y-6">
            {stepsArray.length === 0 ? (
              <div className="text-center p-6 border rounded-lg">
                <p className="text-gray-500">
                  No steps available. Add steps in the Procedure tab first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stepsArray.map((step, index) => (
                  <Card key={step.id} className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="bg-blue-100 text-blue-800 font-medium rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <h3 className="font-medium">Step {index + 1}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`checkpoint-${step.id}`}
                              checked={step.isCheckpoint ?? false}
                              onCheckedChange={() => toggleCheckpoint(step.id)}
                            />
                            <Label htmlFor={`checkpoint-${step.id}`}>
                              Checkpoint
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700">{step.content}</p>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">
                            Expected Responses
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addExpectedResponse(step.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Response
                          </Button>
                        </div>

                        {(step.expectedResponses?.length || 0) === 0 ? (
                          <p className="text-sm text-gray-500">
                            No expected responses defined.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(step.expectedResponses || []).map((response, respIndex) => (
                              <div key={respIndex} className="flex items-center gap-2">
                                <Input
                                  value={response ?? ""}
                                  onChange={(e) =>
                                    updateExpectedResponse(
                                      step.id,
                                      respIndex,
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Response ${respIndex + 1}`}
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeExpectedResponse(step.id, respIndex)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash className="w-4 h-4" />
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
                    <div className="p-4 mt-6">
                      <h3 className="font-medium text-lg">{simulationName}</h3>
                      <div className="mt-4 space-y-4">
                        <div className="border rounded p-3 bg-blue-50 text-blue-800">
                          {stepsArray.length > 0 ? stepsArray[0].content : "No steps available"}
                        </div>
                        <div className="border rounded p-2 bg-gray-100">
                          <div className="flex items-center">
                            <Mic className="w-4 h-4 mr-2 text-blue-500" />
                            <span className="text-sm text-gray-500">
                              Speak your response...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    This is a simplified preview. The actual simulation will be
                    interactive and respond to user input.
                  </p>
                  <Button
                    onClick={() =>
                      toast.success("Simulation preview would launch here!")
                    }
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
          <Button
            onClick={saveSimulation}
            className="bg-green-600 hover:bg-green-700"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin mr-2">◌</div> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Simulation
              </>
            )}
          </Button>
        </div>

        <div className="text-sm text-gray-500">
          <p>Total Steps: {stepsArray.length}</p>
          <p>Procedure: {procedureName}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimulationBuilder;
