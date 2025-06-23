"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import TaskDefinitionForm from "@/components/TaskDefinitionForm";
import MediaUploader from "@/components/MediaUploader";
import VoiceRecorder from "@/components/VoiceRecorder";
import TranscriptEditor from "@/components/TranscriptEditor";
import FlowchartViewer from "@/components/FlowchartViewer";
import YamlGenerator from "@/components/YamlGenerator";
import InteractiveSimulationBuilder from "@/components/InteractiveSimulationBuilder";
import VoiceInterview from "@/components/voice-interview";
import { procedureService, TaskDefinition, Step, MediaItem, SimulationSettings } from "@/lib/ProcedureService";
import { v4 as uuidv4 } from 'uuid';
import { generateYamlFromSteps as generateYamlFromStepsViaAPI } from "@/lib/deepseek";
import { generateObjectsFromYaml, generateScenariosFromYaml, generateTriggersFromYaml } from "@/lib/deepseek";

// Import our migrated components for simulation
import { ObjectDefinitionPanel } from '@/components/objects/object-definition-panel';
import { ObjectLibrary } from '@/components/objects/object-library';
import { ScenarioFlowBuilder } from '@/components/scenarios/scenario-flow-builder';
import { TriggerLogicEditor } from '@/components/scenarios/trigger-logic-editor';
import { PreviewMode } from '@/components/scenarios/preview-mode';
import { AIEnhancementPanel } from '@/components/ai/ai-enhancement-panel';
import MediaUpload from '@/components/media/media-upload';
import MediaLibrary from '@/components/media/media-library';

// Import types
import { 
  SmartObject, 
  ScenarioStep, 
  Trigger, 
  ObjectInteraction 
} from '@/types/unified';
import { MediaFile } from '@/lib/storage-service';
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateProcedure() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("task");
  const [taskDefinition, setTaskDefinition] = useState<TaskDefinition | null>(
    null
  );
  const [transcript, setTranscript] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [yamlContent, setYamlContent] = useState("");
  const [flowchartContent, setFlowchartContent] = useState("");
  const [simulationSettings, setSimulationSettings] = useState<SimulationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingYaml, setIsGeneratingYaml] = useState(false);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [interviewConversation, setInterviewConversation] = useState<Array<{role: 'ai'|'user', content: string}>>([]);
  const [showTranscriptEditor, setShowTranscriptEditor] = useState(false);

  // Simulation state (matching demo page structure)
  const [objects, setObjects] = useState<SmartObject[]>([]);
  const [scenarioSteps, setScenarioSteps] = useState<ScenarioStep[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [simulationActiveTab, setSimulationActiveTab] = useState('objects');

  // Auto-generation loading states
  const [isGeneratingObjects, setIsGeneratingObjects] = useState(false);
  const [isGeneratingScenarios, setIsGeneratingScenarios] = useState(false);
  const [isGeneratingTriggers, setIsGeneratingTriggers] = useState(false);

  // Demo context IDs
  const demoTaskId = 'demo-task-001';
  const demoProcedureId = 'demo-procedure-001';
  const demoScenarioId = 'demo-scenario-001';

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Clear any existing procedure ID when the create page loads
  useEffect(() => {
    // Only clear if authenticated
    if (status === "authenticated") {
      // This ensures we're starting fresh when creating a new procedure
      procedureService.clearCurrentProcedure();
      setLoading(false);
    }
  }, [status]);



  const handleTaskSubmit = async (taskData: TaskDefinition) => {
    try {
      setTaskDefinition(taskData);
      
      // Save task definition to database
      await procedureService.createProcedure(taskData);
      
      toast.success("Task definition saved successfully!");
      handleNextTab();
    } catch (error) {
      console.error("Error saving task definition:", error, JSON.stringify(error));
      
      // Check if this is a Row Level Security error
      if (error instanceof Error && error.message.includes('new row violates row-level security policy')) {
        toast.error('Cannot create procedure due to permission restrictions. Please sign in to continue.');
      } else {
        toast.error(`Failed to save task definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleTranscriptChange = async (text: string) => {
    try {
      // Only save if we have a task ID and non-empty transcript
      if (!procedureService.getCurrentTaskId()) {
        console.log('No task ID available for saving transcript');
        return;
      }

      if (!text.trim()) {
        console.log('Empty transcript, skipping save');
        return;
      }

      setTranscript(text);
      
      // Save transcript to database
      await procedureService.saveTranscript(text);
    } catch (error) {
      console.error("Error saving transcript:", error);
      toast.error("Failed to save transcript. Please try again.");
    }
  };
  
  const handleStepsChange = async (newSteps: Step[]) => {
    setSteps(newSteps);
    
    // Save steps to database
    const currentProcedureId = procedureService.getCurrentProcedureId();
    if (currentProcedureId) {
      await procedureService.saveSteps(currentProcedureId, newSteps);
    }
  };
  
  const handleMediaItemsChange = async (newMediaItems: MediaItem[]) => {
    setMediaItems(newMediaItems);
    
    try {
      // Save media items to database
      await procedureService.saveMediaItems(newMediaItems);
    } catch (error) {
      console.error("Error saving media items:", error);
    }
  };
  
  const handleYamlGenerated = useCallback(async (yaml: string) => {
    setYamlContent(yaml);
    try {
      // Save YAML content to database
      await procedureService.saveYamlContent(yaml);
    } catch (error) {
      console.error("Error saving YAML content:", error);
      toast.error("Failed to save YAML content.");
    }
  }, []);
  
  const handleFlowchartChange = async (content: string) => {
    setFlowchartContent(content);
    
    try {
      // Save flowchart content to database
      await procedureService.saveFlowchart(content);
    } catch (error) {
      console.error("Error saving flowchart:", error);
    }
  };

  const handleSimulationSettingsChange = async (settings: SimulationSettings) => {
    setSimulationSettings(settings);
    try {
      // Convert timeLimit to string for ProcedureService
      const mappedSettings = {
        ...settings,
        timeLimit: String(settings.timeLimit)
      };
      await procedureService.saveSimulationSettings(mappedSettings);
    } catch (error) {
      console.error("Error saving simulation settings:", error);
    }
  };

  // Simulation handlers (matching demo page structure)
  const handleAddObject = (object: SmartObject) => {
    setObjects(prev => [...prev, object]);
  };

  const handleUpdateObject = (id: string, updatedObject: Partial<SmartObject>) => {
    setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updatedObject } : obj));
  };

  const handleDeleteObject = (id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id));
    // Remove object from scenario steps
    setScenarioSteps(prev => prev.map(step => ({
      ...step,
      requiredObjects: step.requiredObjects.filter(objId => objId !== id)
    })));
    // Remove related triggers
    setTriggers(prev => prev.filter(trigger => trigger.objectId !== id));
  };

  const handleSelectObjects = (objectIds: string[]) => {
    setSelectedObjects(objectIds);
  };

  // Single object selection handler for ObjectLibrary
  const handleSelectObject = (objectId: string) => {
    setSelectedObjects(prev => 
      prev.includes(objectId) 
        ? prev.filter(id => id !== objectId) 
        : [...prev, objectId]
    );
  };

  // Scenario step handlers
  const handleAddStep = (step: ScenarioStep) => {
    setScenarioSteps(prev => [...prev, step]);
  };

  const handleUpdateStep = (id: string, updatedStep: Partial<ScenarioStep>) => {
    setScenarioSteps(prev => prev.map(step => step.id === id ? { ...step, ...updatedStep } : step));
  };

  const handleDeleteStep = (id: string) => {
    setScenarioSteps(prev => prev.filter(step => step.id !== id));
  };

  // Trigger handlers
  const handleAddTrigger = (trigger: Trigger) => {
    setTriggers(prev => [...prev, trigger]);
  };

  const handleUpdateTrigger = (id: string, updatedTrigger: Partial<Trigger>) => {
    setTriggers(prev => prev.map(trigger => trigger.id === id ? { ...trigger, ...updatedTrigger } : trigger));
  };

  const handleDeleteTrigger = (id: string) => {
    setTriggers(prev => prev.filter(trigger => trigger.id !== id));
  };

  // Object interaction handler
  const handleObjectInteraction = (interaction: ObjectInteraction) => {
    console.log('Object interaction:', interaction);
    // In production, this would update analytics, trigger events, etc.
  };

  // AI enhancement handler
  const handleApplyEnhancements = (enhancements: {
    objects?: SmartObject[];
    steps?: ScenarioStep[];
    triggers?: Trigger[];
  }) => {
    if (enhancements.objects) {
      setObjects(enhancements.objects);
    }
    if (enhancements.steps) {
      setScenarioSteps(enhancements.steps);
    }
    if (enhancements.triggers) {
      setTriggers(enhancements.triggers);
    }
  };

  // Media handlers
  const handleMediaUpload = (uploadedFiles: MediaFile[]) => {
    setMediaFiles(prev => [...uploadedFiles, ...prev]);
  };

  const handleMediaDelete = (file: MediaFile) => {
    setMediaFiles(prev => prev.filter(f => f.id !== file.id));
  };

  const handleBulkMediaDelete = (filesToDelete: MediaFile[]) => {
    const deleteIds = new Set(filesToDelete.map(f => f.id));
    setMediaFiles(prev => prev.filter(f => !deleteIds.has(f.id)));
  };

  // Auto-generation handlers
  const handleGenerateObjectsFromYaml = async () => {
    if (!yamlContent) {
      toast.error("No YAML content available. Please generate YAML first.");
      return;
    }

    setIsGeneratingObjects(true);
    try {
      const generatedObjects = await generateObjectsFromYaml(yamlContent, taskDefinition?.name);
      
      if (generatedObjects.length > 0) {
        // Add generated objects to existing objects
        const newObjects = generatedObjects.map(obj => ({
          ...obj,
          id: obj.id || uuidv4(), // Ensure each object has a unique ID
          position: obj.position || { x: Math.random() * 400, y: Math.random() * 300, z: 0 }
        }));
        
        setObjects(prev => [...prev, ...newObjects]);
        toast.success(`Generated ${newObjects.length} objects from YAML!`);
      } else {
        toast.warning("No objects were generated. Please check your YAML content.");
      }
    } catch (error) {
      console.error("Error generating objects from YAML:", error);
      toast.error("Failed to generate objects from YAML. Please try again.");
    } finally {
      setIsGeneratingObjects(false);
    }
  };

  const handleGenerateScenariosFromYaml = async () => {
    if (!yamlContent) {
      toast.error("No YAML content available. Please generate YAML first.");
      return;
    }

    setIsGeneratingScenarios(true);
    try {
      const generatedScenarios = await generateScenariosFromYaml(yamlContent, objects);
      
      if (generatedScenarios.length > 0) {
        // Add generated scenarios to existing scenarios
        const newScenarios = generatedScenarios.map(scenario => ({
          ...scenario,
          id: scenario.id || uuidv4(), // Ensure each scenario has a unique ID
          requiredObjects: scenario.requiredObjects || [],
          optionalObjects: scenario.optionalObjects || [],
          hints: scenario.hints || [],
          successCriteria: scenario.successCriteria || [],
          nextSteps: scenario.nextSteps || []
        }));
        
        setScenarioSteps(prev => [...prev, ...newScenarios]);
        toast.success(`Generated ${newScenarios.length} scenarios from YAML!`);
      } else {
        toast.warning("No scenarios were generated. Please check your YAML content.");
      }
    } catch (error) {
      console.error("Error generating scenarios from YAML:", error);
      toast.error("Failed to generate scenarios from YAML. Please try again.");
    } finally {
      setIsGeneratingScenarios(false);
    }
  };

  const handleGenerateTriggersFromYaml = async () => {
    if (!yamlContent) {
      toast.error("No YAML content available. Please generate YAML first.");
      return;
    }

    setIsGeneratingTriggers(true);
    try {
      const generatedTriggers = await generateTriggersFromYaml(yamlContent, objects, scenarioSteps);
      
      if (generatedTriggers.length > 0) {
        // Add generated triggers to existing triggers
        const newTriggers = generatedTriggers.map(trigger => ({
          ...trigger,
          id: trigger.id || uuidv4(), // Ensure each trigger has a unique ID
          condition: trigger.condition || { type: 'state_change', parameters: {} },
          actions: trigger.actions || [],
          isActive: trigger.isActive !== undefined ? trigger.isActive : true,
          priority: trigger.priority || 1,
          cooldown: trigger.cooldown || 5000
        }));
        
        setTriggers(prev => [...prev, ...newTriggers]);
        toast.success(`Generated ${newTriggers.length} triggers from YAML!`);
      } else {
        toast.warning("No triggers were generated. Please check your YAML content.");
      }
    } catch (error) {
      console.error("Error generating triggers from YAML:", error);
      toast.error("Failed to generate triggers from YAML. Please try again.");
    } finally {
      setIsGeneratingTriggers(false);
    }
  };

  const handleTabChange = async (value: string) => {
    // Save current tab's data before changing
    try {
      if (activeTab === "interview" && transcript) {
        await procedureService.saveTranscript(transcript);
      } else if (activeTab === "yaml" && yamlContent) {
        await procedureService.saveYaml(yamlContent);
      } else if (activeTab === "flowchart" && flowchartContent) {
        await procedureService.saveFlowchart(flowchartContent);
      }
      
      // If changing to YAML tab and we have steps but no YAML content, generate it
      if (value === "yaml" && steps.length > 0 && !yamlContent && taskDefinition?.name) {
        setIsGeneratingYaml(true);
        try {
          const generatedYaml = await generateYamlFromStepsViaAPI(steps, taskDefinition.name);
          if (generatedYaml) {
            setYamlContent(generatedYaml);
            await procedureService.saveYamlContent(generatedYaml);
          }
        } catch (error) {
          console.error("Error auto-generating YAML:", error);
        } finally {
          setIsGeneratingYaml(false);
        }
      }
    } catch (error) {
      console.error("Error saving data before tab change:", error);
    }
    
    setActiveTab(value);
  };

  const handleNextTab = () => {
    if (activeTab === "task") handleTabChange("media");
    else if (activeTab === "media") handleTabChange("interview");
    else if (activeTab === "interview") handleTabChange("yaml");
    else if (activeTab === "yaml") handleTabChange("flowchart");
    else if (activeTab === "flowchart") handleTabChange("simulation");
  };

  const handlePreviousTab = () => {
    if (activeTab === "media") handleTabChange("task");
    else if (activeTab === "interview") handleTabChange("media");
    else if (activeTab === "yaml") handleTabChange("interview");
    else if (activeTab === "flowchart") handleTabChange("yaml");
    else if (activeTab === "simulation") handleTabChange("flowchart");
  };
  
  const handleRegenerateYamlFromStepsViaApi = useCallback(async (currentSteps: Step[], currentProcedureName: string | undefined): Promise<string | null> => {
    if (!currentProcedureName) {
      toast.error("Procedure name is not defined. Cannot generate YAML.");
      return null;
    }
    if (currentSteps.length === 0) {
      toast.info("No steps available to generate YAML.");
      return "";
    }

    setIsGeneratingYaml(true);
    let newYaml = null;
    try {
      newYaml = await generateYamlFromStepsViaAPI(currentSteps, currentProcedureName);
      if (newYaml) {
        setYamlContent(newYaml);
        await procedureService.saveYamlContent(newYaml);
      } else {
        toast.error("Failed to generate YAML from steps. The API returned no content.");
      }
    } catch (error) {
      console.error("Error regenerating YAML from steps via API:", error);
      toast.error(`Failed to regenerate YAML: ${error instanceof Error ? error.message : "Unknown API error"}`);
      newYaml = null;
    } finally {
      setIsGeneratingYaml(false);
    }
    return newYaml;
  }, [generateYamlFromStepsViaAPI]);

  const handlePublish = async () => {
    try {
      const success = await procedureService.publishProcedure();
      
      if (success) {
        toast.success("Procedure published successfully!");
        // Could redirect to the procedures list page here
      } else {
        toast.error("Failed to publish procedure");
      }
    } catch (error) {
      console.error("Error publishing procedure:", error);
      toast.error("Failed to publish procedure");
    }
  };

  const handleInterviewComplete = (conversationHistory: Array<{role: 'ai'|'user', content: string}>) => {
    setInterviewConversation(conversationHistory);
    
    // Extract all user responses to create a comprehensive transcript
    const userResponses = conversationHistory
      .filter(entry => entry.role === 'user')
      .map(entry => entry.content)
      .join('\n\n');
    
    // Get all AI questions for context
    const aiQuestions = conversationHistory
      .filter(entry => entry.role === 'ai')
      .map(entry => entry.content);
    
    // Create a formatted transcript with questions and answers
    let formattedTranscript = '';
    for (let i = 0; i < aiQuestions.length; i++) {
      formattedTranscript += `Q: ${aiQuestions[i]}\n\n`;
      
      // Match each question with the corresponding answer if available
      const userResponsesArray = conversationHistory.filter(entry => entry.role === 'user');
      if (i < userResponsesArray.length) {
        const userResponse = userResponsesArray[i]?.content || '';
        formattedTranscript += `A: ${userResponse}\n\n`;
      }
    }
    
    // Update the transcript
    handleTranscriptChange(formattedTranscript.trim() || userResponses);
    
    // Show the transcript editor
    setShowTranscriptEditor(true);
    toast.success("Interview completed! You can now edit the transcript and generate procedure steps.");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect to sign-in page via useEffect
  }

  return (
    <div className="min-h-screen">
      <main className="container py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Create New Procedure</h1>
              <p className="text-gray-500">
                Document your procedure step by step using our voice-based platform.
              </p>
              {taskDefinition && (
                <p className="mt-2 font-medium text-blue-700">
                  {taskDefinition.name}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <UserSyncButton />
              <p className="text-xs text-gray-500 text-center">
                If you get user errors, try syncing
              </p>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="task"
          value={activeTab}
          onValueChange={handleTabChange}
        >
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="task">1. Define Task</TabsTrigger>
              <TabsTrigger value="media">2. Media</TabsTrigger>
              <TabsTrigger value="interview">3. Interview</TabsTrigger>
              <TabsTrigger value="yaml">4. YAML</TabsTrigger>
              <TabsTrigger value="flowchart">5. Flowchart</TabsTrigger>
              <TabsTrigger value="simulation">6. Simulation</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="task">
            <Card>
              <CardContent className="pt-6">
                <TaskDefinitionForm 
                  onSubmit={handleTaskSubmit} 
                  initialData={taskDefinition}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card>
              <CardContent className="pt-6">
                <MediaUploader 
                  mediaItems={mediaItems}
                  onChange={handleMediaItemsChange}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePreviousTab}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button
                onClick={handleNextTab}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next Step <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="interview">
            <div className="grid grid-cols-1 gap-6">
              {!showTranscriptEditor ? (
                <Card>
                  <CardContent className="pt-6">
                    <VoiceInterview
                      procedureId={procedureService.getCurrentProcedureId() || ""}
                      initialSessionId={interviewSessionId || undefined}
                      taskDefinition={{
                        title: taskDefinition?.name || "Procedure",
                        description: taskDefinition?.description
                      }}
                      onInterviewComplete={handleInterviewComplete}
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4">
                        Transcript Editor
                      </h2>
                      <TranscriptEditor
                        initialTranscript={transcript}
                        onTranscriptChange={handleTranscriptChange}
                        onStepsChange={handleStepsChange}
                        steps={steps}
                        onYamlGenerated={handleYamlGenerated}
                        procedureName={taskDefinition?.name || "Procedure"}
                        procedureId={procedureService.getCurrentProcedureId() || ""}
                        onSaveSteps={async (steps) => { await handleStepsChange(steps); return true; }}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePreviousTab}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button
                onClick={handleNextTab}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {showTranscriptEditor ? "Next Step" : "Skip Interview"} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="yaml">
            <Card>
              <CardContent className="pt-6">
                <YamlGenerator
                  steps={steps}
                  procedureName={taskDefinition?.name || "Sample Procedure"}
                  initialYaml={yamlContent}
                  onChange={handleYamlGenerated}
                  onRegenerateYaml={handleRegenerateYamlFromStepsViaApi}
                  isLoadingExternal={isGeneratingYaml}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePreviousTab}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button
                onClick={handleNextTab}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next Step <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="flowchart">
            <Card>
              <CardContent className="pt-6">
                <FlowchartViewer 
                  steps={yamlContent ? [yamlContent] : steps.map((step) => step.content)} 
                  onChange={handleFlowchartChange}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePreviousTab}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button
                onClick={handleNextTab}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next Step <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="simulation">
            <div className="bg-gray-50">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 mb-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                          Interactive Simulation Builder
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                          Create intelligent, voice-enhanced training scenarios with smart objects
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                          ✅ Ready
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                          {objects.length} Objects
                        </Badge>
                        <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-800">
                          {scenarioSteps.length} Steps
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800">
                          {triggers.length} Triggers
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
                <Tabs value={simulationActiveTab} onValueChange={setSimulationActiveTab} className="h-full">
                  <TabsList className="grid w-full grid-cols-7 mb-6">
                    <TabsTrigger value="objects" className="flex items-center gap-2">
                      🧪 Objects ({objects.length})
                    </TabsTrigger>
                    <TabsTrigger value="scenarios" className="flex items-center gap-2">
                      📋 Scenarios ({scenarioSteps.length})
                    </TabsTrigger>
                    <TabsTrigger value="triggers" className="flex items-center gap-2">
                      ⚡ Triggers ({triggers.length})
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex items-center gap-2">
                      🤖 AI Studio
                    </TabsTrigger>
                    <TabsTrigger value="media" className="flex items-center gap-2">
                      📁 Media Library
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      ▶️ Preview
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      📊 Overview
                    </TabsTrigger>
                  </TabsList>

                  {/* Objects Tab */}
                  <TabsContent value="objects" className="space-y-6">
                    {/* AI Generation Section */}
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                          🤖 AI-Powered Object Generation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-blue-700">
                            Generate smart objects automatically from your YAML procedure. AI will analyze your procedure and create relevant objects with states, behaviors, and signals.
                          </p>
                          <div className="flex items-center gap-4">
                            <Button
                              onClick={handleGenerateObjectsFromYaml}
                              disabled={!yamlContent || isGeneratingObjects}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isGeneratingObjects ? (
                                <>
                                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                  Generating Objects...
                                </>
                              ) : (
                                <>
                                  🧪 Generate Objects from YAML
                                </>
                              )}
                            </Button>
                            {yamlContent && (
                              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                                ✅ YAML Available
                              </Badge>
                            )}
                          </div>
                          {!yamlContent && (
                            <p className="text-sm text-orange-600">
                              ⚠️ Generate YAML content first to enable AI object generation.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '600px' }}>
                      <Card className="h-full">
                        <CardHeader>
                          <CardTitle>Create Objects</CardTitle>
                        </CardHeader>
                        <CardContent className="h-full p-0">
                          <ObjectDefinitionPanel
                            onAddObject={handleAddObject}
                            objects={objects}
                            currentTaskId={demoTaskId}
                          />
                        </CardContent>
                      </Card>
                      
                      <Card className="h-full">
                        <CardHeader>
                          <CardTitle>Object Library</CardTitle>
                        </CardHeader>
                        <CardContent className="h-full p-0">
                          <ObjectLibrary
                            objects={objects}
                            onUpdateObject={handleUpdateObject}
                            onDeleteObject={handleDeleteObject}
                            onSelectObject={handleSelectObject}
                            selectedObjects={selectedObjects}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Scenarios Tab */}
                  <TabsContent value="scenarios" style={{ minHeight: '600px' }}>
                    {/* AI Generation Section */}
                    <Card className="border-purple-200 bg-purple-50 mb-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-800">
                          🤖 AI-Powered Scenario Generation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-purple-700">
                            Generate interactive scenario steps automatically from your YAML procedure. AI will create engaging, educational steps that follow your procedure flow.
                          </p>
                          <div className="flex items-center gap-4">
                            <Button
                              onClick={handleGenerateScenariosFromYaml}
                              disabled={!yamlContent || isGeneratingScenarios}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {isGeneratingScenarios ? (
                                <>
                                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                  Generating Scenarios...
                                </>
                              ) : (
                                <>
                                  📋 Generate Scenarios from YAML
                                </>
                              )}
                            </Button>
                            {yamlContent && (
                              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                                ✅ YAML Available
                              </Badge>
                            )}
                            {objects.length > 0 && (
                              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                                🧪 {objects.length} Objects Available
                              </Badge>
                            )}
                          </div>
                          {!yamlContent && (
                            <p className="text-sm text-orange-600">
                              ⚠️ Generate YAML content first to enable AI scenario generation.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle>Scenario Flow Builder</CardTitle>
                      </CardHeader>
                      <CardContent className="h-full p-0">
                        <ScenarioFlowBuilder
                          objects={objects}
                          scenarioSteps={scenarioSteps}
                          onAddStep={handleAddStep}
                          onUpdateStep={handleUpdateStep}
                          onDeleteStep={handleDeleteStep}
                          currentProcedureId={demoProcedureId}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Triggers Tab */}
                  <TabsContent value="triggers" style={{ minHeight: '600px' }}>
                    {/* AI Generation Section */}
                    <Card className="border-orange-200 bg-orange-50 mb-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-800">
                          🤖 AI-Powered Trigger Generation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-orange-700">
                            Generate intelligent triggers automatically from your YAML procedure. AI will create responsive triggers that enhance the simulation experience.
                          </p>
                          <div className="flex items-center gap-4">
                            <Button
                              onClick={handleGenerateTriggersFromYaml}
                              disabled={!yamlContent || isGeneratingTriggers}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              {isGeneratingTriggers ? (
                                <>
                                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                  Generating Triggers...
                                </>
                              ) : (
                                <>
                                  ⚡ Generate Triggers from YAML
                                </>
                              )}
                            </Button>
                            {yamlContent && (
                              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                                ✅ YAML Available
                              </Badge>
                            )}
                            {objects.length > 0 && (
                              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                                🧪 {objects.length} Objects Available
                              </Badge>
                            )}
                            {scenarioSteps.length > 0 && (
                              <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-800">
                                📋 {scenarioSteps.length} Scenarios Available
                              </Badge>
                            )}
                          </div>
                          {!yamlContent && (
                            <p className="text-sm text-orange-600">
                              ⚠️ Generate YAML content first to enable AI trigger generation.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle>Trigger Logic Editor</CardTitle>
                      </CardHeader>
                      <CardContent className="h-full p-0">
                        <TriggerLogicEditor
                          objects={objects}
                          triggers={triggers}
                          onAddTrigger={handleAddTrigger}
                          onUpdateTrigger={handleUpdateTrigger}
                          onDeleteTrigger={handleDeleteTrigger}
                          currentScenarioId={demoScenarioId}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* AI Enhancement Tab */}
                  <TabsContent value="ai" style={{ minHeight: '600px' }}>
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle>AI Enhancement Studio</CardTitle>
                      </CardHeader>
                      <CardContent className="h-full p-0">
                        <AIEnhancementPanel
                          objects={objects}
                          scenarioSteps={scenarioSteps}
                          triggers={triggers}
                          onApplyEnhancements={handleApplyEnhancements}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Media Tab */}
                  <TabsContent value="media" className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Upload Media Files</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <MediaUpload
                            userId="demo-user"
                            onUploadComplete={handleMediaUpload}
                            onUploadError={(error) => console.error('Upload error:', error)}
                            multiple={true}
                            options={{
                              maxSize: 100 * 1024 * 1024, // 100MB
                              extractMetadata: true,
                              allowedTypes: ['*']
                            }}
                          />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Media Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{mediaFiles.length}</div>
                              <div className="text-sm text-gray-600">Total Files</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {mediaFiles.filter(f => f.type.startsWith('audio/')).length}
                              </div>
                              <div className="text-sm text-gray-600">Audio Files</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {mediaFiles.filter(f => f.type.startsWith('image/')).length}
                              </div>
                              <div className="text-sm text-gray-600">Images</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {mediaFiles.filter(f => f.type.startsWith('video/')).length}
                              </div>
                              <div className="text-sm text-gray-600">Videos</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Media Library</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <MediaLibrary
                          files={mediaFiles}
                          onFileDelete={handleMediaDelete}
                          onBulkDelete={handleBulkMediaDelete}
                          selectable={true}
                          multiSelect={true}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Preview Tab */}
                  <TabsContent value="preview" style={{ minHeight: '600px' }}>
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle>Interactive Preview</CardTitle>
                      </CardHeader>
                      <CardContent className="h-full p-0">
                        <PreviewMode
                          objects={objects}
                          scenarioSteps={scenarioSteps}
                          triggers={triggers}
                          onObjectInteraction={handleObjectInteraction}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
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
                              <Badge variant="default" className="bg-green-600">Ready</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Voice Service</span>
                              <Badge variant="outline" className="text-green-600 border-green-600">Ready</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Components</span>
                              <Badge variant="outline">7/7 Available</Badge>
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
                              <Badge variant="outline">{objects.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">With Behaviors</span>
                              <Badge variant="outline">
                                {objects.filter(obj => obj.behaviors.length > 0).length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">With Signals</span>
                              <Badge variant="outline">
                                {objects.filter(obj => obj.signals.length > 0).length}
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
                              <span className="text-sm text-gray-600">Total Steps</span>
                              <Badge variant="outline">{scenarioSteps.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Checkpoints</span>
                              <Badge variant="outline">
                                {scenarioSteps.filter(step => step.isCheckpoint).length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Active Triggers</span>
                              <Badge variant="outline">
                                {triggers.filter(trigger => trigger.isActive).length}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Feature Highlights */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Simulation Features</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900">✅ Available Features</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Smart object definition with states and behaviors</li>
                              <li>• Visual scenario flow building</li>
                              <li>• Interactive trigger logic system</li>
                              <li>• Real-time simulation preview</li>
                              <li>• Production-ready voice recording service</li>
                              <li>• Unified type system and validation</li>
                              <li>• Mobile-responsive design</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900">🚀 Ready for Next Phase</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Database schema implementation</li>
                              <li>• Supabase authentication integration</li>
                              <li>• AI-powered content enhancement</li>
                              <li>• Advanced analytics and reporting</li>
                              <li>• Real-time collaboration features</li>
                              <li>• Performance optimization</li>
                              <li>• Production deployment</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3">
                          <Button 
                            onClick={() => setSimulationActiveTab('objects')}
                            variant="outline"
                          >
                            Create Your First Object
                          </Button>
                          <Button 
                            onClick={() => setSimulationActiveTab('scenarios')}
                            variant="outline"
                            disabled={objects.length === 0}
                          >
                            Build a Scenario
                          </Button>
                          <Button 
                            onClick={() => setSimulationActiveTab('triggers')}
                            variant="outline"
                            disabled={objects.length === 0}
                          >
                            Add Triggers
                          </Button>
                          <Button 
                            onClick={() => setSimulationActiveTab('ai')}
                            variant="outline"
                            disabled={objects.length === 0 || scenarioSteps.length === 0}
                            className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                          >
                            🤖 AI Enhance
                          </Button>
                          <Button 
                            onClick={() => setSimulationActiveTab('preview')}
                            variant="outline"
                            disabled={scenarioSteps.length === 0}
                          >
                            Preview Simulation
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Auto-Generation Section */}
                    <Card className="border-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          🚀 AI-Powered Auto-Generation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-3">Generate Complete Simulation from YAML</h4>
                            <p className="text-sm text-gray-600 mb-4">
                              Use AI to automatically generate all simulation components (objects, scenarios, and triggers) from your YAML procedure. This creates a complete, interactive simulation in one click.
                            </p>
                            
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Button
                                  onClick={async () => {
                                    if (!yamlContent) {
                                      toast.error("No YAML content available. Please generate YAML first.");
                                      return;
                                    }
                                    
                                    // Generate all components in sequence
                                    try {
                                      toast.info("Starting AI auto-generation...");
                                      
                                      // Generate objects first
                                      setIsGeneratingObjects(true);
                                      const generatedObjects = await generateObjectsFromYaml(yamlContent, taskDefinition?.name);
                                      if (generatedObjects.length > 0) {
                                        const newObjects = generatedObjects.map(obj => ({
                                          ...obj,
                                          id: obj.id || uuidv4(),
                                          position: obj.position || { x: Math.random() * 400, y: Math.random() * 300, z: 0 }
                                        }));
                                        setObjects(prev => [...prev, ...newObjects]);
                                        toast.success(`Generated ${newObjects.length} objects`);
                                      }
                                      setIsGeneratingObjects(false);
                                      
                                      // Generate scenarios
                                      setIsGeneratingScenarios(true);
                                      const generatedScenarios = await generateScenariosFromYaml(yamlContent, objects);
                                      if (generatedScenarios.length > 0) {
                                        const newScenarios = generatedScenarios.map(scenario => ({
                                          ...scenario,
                                          id: scenario.id || uuidv4(),
                                          requiredObjects: scenario.requiredObjects || [],
                                          optionalObjects: scenario.optionalObjects || [],
                                          hints: scenario.hints || [],
                                          successCriteria: scenario.successCriteria || [],
                                          nextSteps: scenario.nextSteps || []
                                        }));
                                        setScenarioSteps(prev => [...prev, ...newScenarios]);
                                        toast.success(`Generated ${newScenarios.length} scenarios`);
                                      }
                                      setIsGeneratingScenarios(false);
                                      
                                      // Generate triggers
                                      setIsGeneratingTriggers(true);
                                      const generatedTriggers = await generateTriggersFromYaml(yamlContent, objects, scenarioSteps);
                                      if (generatedTriggers.length > 0) {
                                        const newTriggers = generatedTriggers.map(trigger => ({
                                          ...trigger,
                                          id: trigger.id || uuidv4(),
                                          condition: trigger.condition || { type: 'state_change', parameters: {} },
                                          actions: trigger.actions || [],
                                          isActive: trigger.isActive !== undefined ? trigger.isActive : true,
                                          priority: trigger.priority || 1,
                                          cooldown: trigger.cooldown || 5000
                                        }));
                                        setTriggers(prev => [...prev, ...newTriggers]);
                                        toast.success(`Generated ${newTriggers.length} triggers`);
                                      }
                                      setIsGeneratingTriggers(false);
                                      
                                      toast.success("🎉 Complete simulation generated successfully!");
                                      
                                    } catch (error) {
                                      console.error("Error in auto-generation:", error);
                                      toast.error("Auto-generation failed. Please try individual generation.");
                                      setIsGeneratingObjects(false);
                                      setIsGeneratingScenarios(false);
                                      setIsGeneratingTriggers(false);
                                    }
                                  }}
                                  disabled={!yamlContent || isGeneratingObjects || isGeneratingScenarios || isGeneratingTriggers}
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                >
                                  {isGeneratingObjects || isGeneratingScenarios || isGeneratingTriggers ? (
                                    <>
                                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                      Generating Complete Simulation...
                                    </>
                                  ) : (
                                    <>
                                      🚀 Generate Complete Simulation
                                    </>
                                  )}
                                </Button>
                                
                                {yamlContent && (
                                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                                    ✅ YAML Ready
                                  </Badge>
                                )}
                              </div>
                              
                              {!yamlContent && (
                                <p className="text-sm text-orange-600">
                                  ⚠️ Generate YAML content first to enable AI auto-generation.
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{objects.length}</div>
                              <div className="text-sm text-blue-700">Objects</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">{scenarioSteps.length}</div>
                              <div className="text-sm text-purple-700">Scenarios</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">{triggers.length}</div>
                              <div className="text-sm text-orange-700">Triggers</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePreviousTab}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handlePublish}
              >
                Save & Publish
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-gray-100 py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-md bg-blue-600 h-8 w-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 11V9a2 2 0 0 0-2-2H8.5L3 3v18l5.5-4H17a2 2 0 0 0 2-2v-2" />
                  <path d="M15 9h6" />
                  <path d="M18 6v6" />
                </svg>
              </div>
              <span className="text-lg font-semibold">Zyglio</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 Zyglio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
