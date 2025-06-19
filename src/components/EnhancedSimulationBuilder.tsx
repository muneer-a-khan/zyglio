"use client";

import { useState, useEffect } from "react";
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
  BarChart,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { Step } from "@/lib/ProcedureService";
import { 
  EnhancedSimulationSettings,
  SimulationObject,
  SimulationScenario,
  SimulationTrigger,
  SimulationState
} from "@/types/simulation";
import { simulationEngine } from "@/lib/simulation-engine";
import { generateSimulationFromYaml } from "@/lib/yaml-to-simulation";
import ObjectManager from "./simulation/ObjectManager";
import ScenarioManager from "./simulation/ScenarioManager";
import TriggerManager from "./simulation/TriggerManager";

interface EnhancedSimulationBuilderProps {
  steps: Step[];
  procedureName: string;
  initialSettings?: Partial<EnhancedSimulationSettings>;
  yamlContent?: string;
  onChange: (settings: EnhancedSimulationSettings) => void;
}

const defaultSettings: EnhancedSimulationSettings = {
  // Existing settings
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
  steps: [],
  
  // New features
  objects: [],
  scenarios: [],
  triggers: [],
  enableObjectInteractions: true,
  enableDynamicScenarios: true,
  enableAdvancedTriggers: true,
  environmentType: "virtual",
  realtimeMonitoring: true,
  adaptiveDifficulty: false,
};

const EnhancedSimulationBuilder = ({
  steps,
  procedureName = "Sample Procedure",
  initialSettings,
  yamlContent = "",
  onChange
}: EnhancedSimulationBuilderProps) => {
  const [activeTab, setActiveTab] = useState("settings");
  const [settings, setSettings] = useState<EnhancedSimulationSettings>(
    { ...defaultSettings, ...initialSettings }
  );
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);

  useEffect(() => {
    if (initialSettings) {
      setSettings({ ...defaultSettings, ...initialSettings });
    }
  }, [initialSettings]);

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

  const handleSettingChange = (key: keyof EnhancedSimulationSettings, value: any) => {
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

  const handleScenarioActivation = async (scenarioId: string) => {
    try {
      handleSettingChange('activeScenarioId', scenarioId);
      toast.success("Scenario activated for simulation");
    } catch (error) {
      console.error("Error activating scenario:", error);
      toast.error("Failed to activate scenario");
    }
  };

  const handleGenerateFromYaml = async () => {
    if (!yamlContent || yamlContent.trim() === "") {
      toast.error("No YAML content available to generate simulation elements");
      return;
    }

    try {
      const generatedElements = generateSimulationFromYaml(yamlContent);
      
      const mergedObjects = [
        ...settings.objects.filter(obj => !generatedElements.objects.some(genObj => genObj.name === obj.name)),
        ...generatedElements.objects
      ];
      
      const mergedScenarios = [
        ...settings.scenarios.filter(scenario => !generatedElements.scenarios.some(genScenario => genScenario.name === scenario.name)),
        ...generatedElements.scenarios
      ];
      
      const mergedTriggers = [
        ...settings.triggers.filter(trigger => !generatedElements.triggers.some(genTrigger => genTrigger.name === trigger.name)),
        ...generatedElements.triggers
      ];

      const updatedScenarios = mergedScenarios.map(scenario => ({
        ...scenario,
        objects: mergedObjects.map(obj => obj.id),
        triggers: mergedTriggers
          .filter(trigger => trigger.tags.some(tag => scenario.tags.includes(tag)))
          .map(trigger => trigger.id)
      }));

      const updatedSettings = {
        ...settings,
        objects: mergedObjects,
        scenarios: updatedScenarios,
        triggers: mergedTriggers
      };

      setSettings(updatedSettings);
      onChange(updatedSettings);

      toast.success(`Generated ${generatedElements.objects.length} objects, ${generatedElements.scenarios.length} scenarios, and ${generatedElements.triggers.length} triggers from YAML`);
      
      setActiveTab("objects");
    } catch (error) {
      console.error("Error generating simulation elements from YAML:", error);
      toast.error("Failed to generate simulation elements from YAML");
    }
  };

  const handleStartSimulation = async () => {
    try {
      setIsRunning(true);
      const state = await simulationEngine.initializeSimulation(settings);
      setSimulationState(state);
      toast.success("Simulation started successfully");
    } catch (error) {
      console.error("Error starting simulation:", error);
      toast.error("Failed to start simulation");
      setIsRunning(false);
    }
  };

  const handleStopSimulation = async () => {
    try {
      await simulationEngine.resetSimulation();
      setSimulationState(null);
      setIsRunning(false);
      toast.success("Simulation stopped");
    } catch (error) {
      console.error("Error stopping simulation:", error);
      toast.error("Failed to stop simulation");
    }
  };

  const getStatsCards = () => [
    {
      title: "Objects",
      count: settings.objects.length,
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Scenarios",
      count: settings.scenarios.length,
      icon: Target,
      color: "text-green-600"
    },
    {
      title: "Triggers",
      count: settings.triggers.length,
      icon: Zap,
      color: "text-purple-600"
    },
    {
      title: "Steps",
      count: settings.steps?.length || 0,
      icon: MessageSquare,
      color: "text-orange-600"
    }
  ];

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
        
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {getStatsCards().map((stat, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.count}</p>
                </div>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Generation Status */}
        {yamlContent && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                YAML content detected. Click "Generate from YAML" to automatically create simulation objects, scenarios, and triggers.
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
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
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Simulation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add your settings controls here */}
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
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate from YAML
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
                    <Button 
                      onClick={() => setActiveTab("preview")}
                      variant="outline"
                      disabled={settings.scenarios.length === 0}
                      className="bg-green-50 hover:bg-green-100 border-green-200"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Preview Simulation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Objects Tab */}
          <TabsContent value="objects" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Create Objects</CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <ObjectManager
                    objects={settings.objects}
                    onAddObject={(obj) => handleObjectsChange([...settings.objects, obj])}
                    onUpdateObject={(id, updatedObj) => 
                      handleObjectsChange(settings.objects.map(obj => 
                        obj.id === id ? updatedObj : obj
                      ))
                    }
                    onDeleteObject={(id) => 
                      handleObjectsChange(settings.objects.filter(obj => obj.id !== id))
                    }
                    onSelectObjects={setSelectedObjects}
                    selectedObjects={selectedObjects}
                  />
                </CardContent>
              </Card>
              
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Object Library</CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <div className="space-y-3 max-h-[600px] overflow-y-auto p-4">
                    {settings.objects.map((obj) => (
                      <div key={obj.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{obj.name}</h4>
                          <Badge variant="secondary">{obj.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{obj.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {obj.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                    {settings.objects.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No objects created yet</p>
                    )}
                  </div>
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
                <ScenarioManager
                  objects={settings.objects}
                  scenarios={settings.scenarios}
                  onAddScenario={(scenario) => handleScenariosChange([...settings.scenarios, scenario])}
                  onUpdateScenario={(id, updatedScenario) => 
                    handleScenariosChange(settings.scenarios.map(scenario => 
                      scenario.id === id ? updatedScenario : scenario
                    ))
                  }
                  onDeleteScenario={(id) => 
                    handleScenariosChange(settings.scenarios.filter(scenario => scenario.id !== id))
                  }
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
                <TriggerManager
                  objects={settings.objects}
                  triggers={settings.triggers}
                  onAddTrigger={(trigger) => handleTriggersChange([...settings.triggers, trigger])}
                  onUpdateTrigger={(id, updatedTrigger) => 
                    handleTriggersChange(settings.triggers.map(trigger => 
                      trigger.id === id ? updatedTrigger : trigger
                    ))
                  }
                  onDeleteTrigger={(id) => 
                    handleTriggersChange(settings.triggers.filter(trigger => trigger.id !== id))
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitor Tab */}
          <TabsContent value="monitor" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Simulation Status</span>
                      <Badge variant={isRunning ? "default" : "outline"} className={isRunning ? "bg-green-600" : "text-gray-600"}>
                        {isRunning ? "Running" : "Stopped"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Scenario</span>
                      <Badge variant="outline">
                        {settings.activeScenarioId ? "Active" : "None"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Object Interactions</span>
                      <Badge variant="outline">
                        {settings.enableObjectInteractions ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Object Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Object Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Objects</span>
                      <Badge variant="outline">{settings.objects.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Interactive</span>
                      <Badge variant="outline">
                        {settings.objects.filter(obj => obj.interactive).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Selected</span>
                      <Badge variant="outline">
                        {selectedObjects.length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scenario Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scenario Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Scenarios</span>
                      <Badge variant="outline">{settings.scenarios.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Triggers</span>
                      <Badge variant="outline">
                        {settings.triggers.filter(trigger => trigger.isActive).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Dynamic Scenarios</span>
                      <Badge variant="outline">
                        {settings.enableDynamicScenarios ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="h-[calc(100vh-16rem)]">
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Interactive Preview</CardTitle>
                  <div className="flex gap-2">
                    {isRunning ? (
                      <Button onClick={handleStopSimulation} variant="destructive">
                        Stop Simulation
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleStartSimulation} 
                        className="bg-green-600 hover:bg-green-700"
                        disabled={settings.scenarios.length === 0}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Simulation
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-full p-0">
                {simulationState ? (
                  <div className="h-full p-4">
                    {/* Add your preview component here */}
                    <p className="text-gray-500 text-center py-4">
                      Simulation preview will be implemented here
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Play className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Start Simulation</h2>
                      <p className="text-gray-500 mb-4">
                        Click the "Start Simulation" button to begin the interactive preview
                      </p>
                      <Button 
                        onClick={handleStartSimulation}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={settings.scenarios.length === 0}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Simulation
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedSimulationBuilder; 