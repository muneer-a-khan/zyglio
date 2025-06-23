"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Package, 
  Target, 
  Zap, 
  Play, 
  MessageSquare,
  Monitor,
  Wand2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

// Import our demo components
import { ObjectDefinitionPanel } from '@/components/objects/object-definition-panel';
import { ObjectLibrary } from '@/components/objects/object-library';
import { ScenarioFlowBuilder } from '@/components/scenarios/scenario-flow-builder';
import { TriggerLogicEditor } from '@/components/scenarios/trigger-logic-editor';
import { PreviewMode } from '@/components/scenarios/preview-mode';

// Import types
import { 
  SmartObject, 
  ScenarioStep, 
  Trigger, 
  ObjectInteraction 
} from '@/types/unified';
import { 
  SimulationSettings, 
  SimulationObject, 
  SimulationScenario, 
  SimulationTrigger,
  SimulationCondition
} from '@/types/simulation';
import { Step } from '@/lib/ProcedureService';
import { generateSimulationFromYaml } from '@/lib/yaml-to-simulation';

interface InteractiveSimulationBuilderProps {
  steps: Step[];
  procedureName: string;
  initialSettings?: Partial<SimulationSettings>;
  yamlContent?: string;
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
  name: "Simulation",
  enableVoiceInput: true,
  enableTextInput: true,
  feedbackLevel: "detailed",
  enableScoring: true,
  steps: [],
  objects: [],
  scenarios: [],
  triggers: []
};

export default function InteractiveSimulationBuilder({
  steps,
  procedureName = "Sample Procedure",
  initialSettings,
  yamlContent = "",
  onChange
}: InteractiveSimulationBuilderProps) {
  const [activeTab, setActiveTab] = useState("objects");
  const [settings, setSettings] = useState<SimulationSettings>(
    { ...defaultSettings, ...initialSettings }
  );
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings({ ...defaultSettings, ...initialSettings });
    }
  }, [initialSettings]);

  useEffect(() => {
    if (steps.length > 0 && !initialSettings?.steps) {
      setSettings((prev: SimulationSettings) => ({
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

  const handleObjectsChange = (objects: SimulationObject[]) => {
    handleSettingChange('objects', objects);
  };

  const handleScenariosChange = (scenarios: SimulationScenario[]) => {
    handleSettingChange('scenarios', scenarios);
  };

  const handleTriggersChange = (triggers: SimulationTrigger[]) => {
    handleSettingChange('triggers', triggers);
  };

  const handleGenerateFromYaml = async () => {
    if (!yamlContent || yamlContent.trim() === "") {
      toast.error("No YAML content available to generate simulation elements");
      return;
    }

    setIsGenerating(true);
    try {
      const generatedElements = await generateSimulationFromYaml(yamlContent);
      
      // Merge generated elements with existing ones
      const mergedObjects = [
        ...settings.objects.filter((obj: SimulationObject) => !generatedElements.objects.some((genObj: SimulationObject) => genObj.name === obj.name)),
        ...generatedElements.objects
      ];
      
      const mergedScenarios = [
        ...settings.scenarios.filter((scenario: SimulationScenario) => !generatedElements.scenarios.some((genScenario: SimulationScenario) => 
          scenario.instruction === genScenario.instruction
        )),
        ...generatedElements.scenarios
      ];
      
      const mergedTriggers = [
        ...settings.triggers.filter((trigger: SimulationTrigger) => !generatedElements.triggers.some((genTrigger: SimulationTrigger) => 
          trigger.objectId === genTrigger.objectId && trigger.signal === genTrigger.signal
        )),
        ...generatedElements.triggers
      ];

      const updatedSettings = {
        ...settings,
        objects: mergedObjects,
        scenarios: mergedScenarios,
        triggers: mergedTriggers
      };

      setSettings(updatedSettings);
      onChange(updatedSettings);

      toast.success(`Generated ${generatedElements.objects.length} objects, ${generatedElements.scenarios.length} scenarios, and ${generatedElements.triggers.length} triggers from YAML`);
      
      setActiveTab("objects");
    } catch (error) {
      console.error("Error generating simulation elements from YAML:", error);
      toast.error("Failed to generate simulation elements from YAML");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleObjectInteraction = (interaction: ObjectInteraction) => {
    console.log('Object interaction:', interaction);
    // In production, this would update analytics, trigger events, etc.
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {procedureName} Simulation
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage interactive simulation elements
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
              {settings.objects.length} Objects
            </Badge>
            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-800">
              {settings.scenarios.length} Scenarios
            </Badge>
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800">
              {settings.triggers.length} Triggers
            </Badge>
          </div>
        </div>

        {/* YAML Generation Status */}
        {yamlContent && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  YAML content detected. Click "Generate from YAML" to automatically create simulation elements.
                </span>
              </div>
              <Button 
                onClick={handleGenerateFromYaml}
                variant="outline"
                className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                disabled={isGenerating}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate from YAML"}
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="objects" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Objects ({settings.objects.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Scenarios ({settings.scenarios.length})
            </TabsTrigger>
            <TabsTrigger value="triggers" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Triggers ({settings.triggers.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Objects Tab */}
          <TabsContent value="objects" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-16rem)]">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Create Objects</CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <ObjectDefinitionPanel
                    onAddObject={(obj) => handleObjectsChange([...settings.objects, obj])}
                    objects={settings.objects}
                    currentTaskId={procedureName}
                  />
                </CardContent>
              </Card>
              
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Object Library</CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <ObjectLibrary
                    objects={settings.objects}
                    onUpdateObject={(id: string, updatedObj: Partial<SimulationObject>) => 
                      handleObjectsChange(settings.objects.map((obj: SimulationObject) => 
                        obj.id === id ? { ...obj, ...updatedObj } : obj
                      ))
                    }
                    onDeleteObject={(id: string) => 
                      handleObjectsChange(settings.objects.filter((obj: SimulationObject) => obj.id !== id))
                    }
                    onSelectObject={(id: string) => setSelectedObjects(prev => 
                      prev.includes(id) ? prev.filter(objId => objId !== id) : [...prev, id]
                    )}
                    selectedObjects={selectedObjects}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Scenario Flow Builder</CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                <ScenarioFlowBuilder
                  objects={settings.objects}
                  scenarioSteps={settings.scenarios}
                  onAddStep={(step: SimulationScenario) => handleScenariosChange([...settings.scenarios, step])}
                  onUpdateStep={(id: string, updatedStep: Partial<SimulationScenario>) => 
                    handleScenariosChange(settings.scenarios.map((step: SimulationScenario) => 
                      step.id === id ? { ...step, ...updatedStep } : step
                    ))
                  }
                  onDeleteStep={(id: string) => 
                    handleScenariosChange(settings.scenarios.filter((step: SimulationScenario) => step.id !== id))
                  }
                  currentProcedureId={procedureName}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Triggers Tab */}
          <TabsContent value="triggers" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Trigger Logic Editor</CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                <TriggerLogicEditor
                  objects={settings.objects}
                  triggers={settings.triggers}
                  onAddTrigger={(trigger: SimulationTrigger) => handleTriggersChange([...settings.triggers, trigger])}
                  onUpdateTrigger={(id: string, updatedTrigger: Partial<SimulationTrigger>) => 
                    handleTriggersChange(settings.triggers.map((trigger: SimulationTrigger) => 
                      trigger.id === id ? { ...trigger, ...updatedTrigger } : trigger
                    ))
                  }
                  onDeleteTrigger={(id: string) => 
                    handleTriggersChange(settings.triggers.filter((trigger: SimulationTrigger) => trigger.id !== id))
                  }
                  currentScenarioId={procedureName}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Simulation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add your settings controls here */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Mode</h3>
                    <select
                      value={settings.mode}
                      onChange={(e) => handleSettingChange('mode', e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="guided">Guided Mode</option>
                      <option value="freeform">Freeform Mode</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Difficulty</h3>
                    <select
                      value={settings.difficulty}
                      onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Feedback Level</h3>
                    <select
                      value={settings.feedbackLevel}
                      onChange={(e) => handleSettingChange('feedbackLevel', e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="minimal">Minimal</option>
                      <option value="moderate">Moderate</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {yamlContent && (
                      <Button 
                        onClick={handleGenerateFromYaml}
                        variant="outline"
                        className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                        disabled={isGenerating}
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        {isGenerating ? "Generating..." : "Generate from YAML"}
                      </Button>
                    )}
                    <Button 
                      onClick={() => setActiveTab("objects")}
                      variant="outline"
                      disabled={settings.objects.length === 0}
                    >
                      Manage Objects
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("scenarios")}
                      variant="outline"
                      disabled={settings.objects.length === 0}
                    >
                      Build Scenarios
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("triggers")}
                      variant="outline"
                      disabled={settings.objects.length === 0}
                    >
                      Add Triggers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Interactive Preview</CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                {settings.scenarios.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                      <h2 className="text-xl font-semibold mb-2">No Scenarios Available</h2>
                      <p className="text-gray-500 mb-4">
                        Create at least one scenario to preview the simulation
                      </p>
                      <Button 
                        onClick={() => setActiveTab("scenarios")}
                        variant="outline"
                      >
                        Create Scenario
                      </Button>
                    </div>
                  </div>
                ) : (
                  <PreviewMode
                    objects={settings.objects}
                    scenarioSteps={settings.scenarios}
                    triggers={settings.triggers}
                    onObjectInteraction={handleObjectInteraction}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 