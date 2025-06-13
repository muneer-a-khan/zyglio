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
          <CardTitle className="text-xl">Enhanced Simulation Builder</CardTitle>
          <div className="flex gap-2">
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
            {isRunning ? (
              <Button onClick={handleStopSimulation} variant="destructive">
                Stop Simulation
              </Button>
            ) : (
              <Button onClick={handleStartSimulation} className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Start Simulation
              </Button>
            )}
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
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="objects">
              <Package className="w-4 h-4 mr-2" />
              Objects
            </TabsTrigger>
            <TabsTrigger value="scenarios">
              <Target className="w-4 h-4 mr-2" />
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="triggers">
              <Zap className="w-4 h-4 mr-2" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="monitor">
              <Monitor className="w-4 h-4 mr-2" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic simulation mode and settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Simulation Mode</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={settings.mode}
                      onChange={(e) => handleSettingChange('mode', e.target.value)}
                    >
                      <option value="guided">Guided Mode</option>
                      <option value="freeform">Freeform Mode</option>
                      <option value="scenario_based">Scenario-Based Mode</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Environment Type</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={settings.environmentType}
                      onChange={(e) => handleSettingChange('environmentType', e.target.value)}
                    >
                      <option value="virtual">Virtual</option>
                      <option value="laboratory">Laboratory</option>
                      <option value="clinical">Clinical</option>
                      <option value="field">Field</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Difficulty Level</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={settings.difficulty}
                      onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Time Limit (minutes)</label>
                    <input 
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={settings.timeLimit || 300}
                      onChange={(e) => handleSettingChange('timeLimit', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Retries</label>
                    <input 
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={settings.maxRetries || 3}
                      onChange={(e) => handleSettingChange('maxRetries', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Feature toggles */}
                <div className="space-y-3">
                  <h4 className="font-medium">Advanced Features</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'enableObjectInteractions', label: 'Object Interactions' },
                      { key: 'enableDynamicScenarios', label: 'Dynamic Scenarios' },
                      { key: 'enableAdvancedTriggers', label: 'Advanced Triggers' },
                      { key: 'realtimeMonitoring', label: 'Realtime Monitoring' },
                      { key: 'adaptiveDifficulty', label: 'Adaptive Difficulty' },
                      { key: 'enableScoring', label: 'Scoring System' },
                    ].map((feature) => (
                      <label key={feature.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings[feature.key as keyof EnhancedSimulationSettings] as boolean}
                          onChange={(e) => handleSettingChange(feature.key as keyof EnhancedSimulationSettings, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">{feature.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Active scenario selection */}
                {settings.scenarios.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Active Scenario</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={settings.activeScenarioId || ""}
                      onChange={(e) => handleSettingChange('activeScenarioId', e.target.value || undefined)}
                    >
                      <option value="">No specific scenario</option>
                      {settings.scenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name} ({scenario.difficulty})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="objects">
            <ObjectManager
              objects={settings.objects}
              onObjectsChange={handleObjectsChange}
            />
          </TabsContent>

          <TabsContent value="scenarios">
            <ScenarioManager
              scenarios={settings.scenarios}
              objects={settings.objects}
              triggers={settings.triggers}
              onScenariosChange={handleScenariosChange}
              onActivateScenario={handleScenarioActivation}
            />
          </TabsContent>

          <TabsContent value="triggers">
            <TriggerManager
              triggers={settings.triggers}
              objects={settings.objects}
              onTriggersChange={handleTriggersChange}
            />
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulation Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                {simulationState ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Session ID</p>
                        <p className="text-sm text-gray-600">{simulationState.sessionId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Current Step</p>
                        <p className="text-sm text-gray-600">{simulationState.currentStepId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Score</p>
                        <p className="text-sm text-gray-600">{simulationState.score}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant={simulationState.isPaused ? "secondary" : "default"}>
                          {simulationState.isPaused ? "Paused" : "Running"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Active Objects</p>
                      <div className="grid gap-2">
                        {Object.entries(simulationState.activeObjects).map(([id, obj]: [string, any]) => (
                          <div key={id} className="p-2 border rounded text-sm">
                            <strong>{obj._meta.name}</strong> ({obj._meta.type})
                            {obj._meta.lastInteraction && (
                              <p className="text-xs text-gray-500">
                                Last interaction: {new Date(obj._meta.lastInteraction).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Recent Actions</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {simulationState.userActions.slice(-10).reverse().map((action, index) => (
                          <div key={action.id} className="text-xs p-2 bg-gray-50 rounded">
                            <span className="font-medium">{action.type}</span>
                            <span className="text-gray-500 ml-2">
                              {new Date(action.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active simulation to monitor</p>
                    <p className="text-sm">Start a simulation to see real-time data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulation Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics Dashboard</p>
                  <p className="text-sm">Coming soon - comprehensive analytics and reporting</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedSimulationBuilder; 