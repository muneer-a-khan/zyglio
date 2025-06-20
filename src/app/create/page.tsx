"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import TaskDefinitionForm from "@/components/TaskDefinitionForm";
import MediaUploader from "@/components/MediaUploader";
import VoiceRecorder from "@/components/VoiceRecorder";
import TranscriptEditor from "@/components/TranscriptEditor";
import FlowchartViewer from "@/components/FlowchartViewer";
import YamlGenerator from "@/components/YamlGenerator";
import EnhancedSimulationBuilder from "@/components/EnhancedSimulationBuilder";
import VoiceInterview from "@/components/voice-interview";
import { procedureService, TaskDefinition, Step, MediaItem, SimulationSettings } from "@/lib/ProcedureService";
import { EnhancedSimulationSettings } from "@/types/simulation";
import { v4 as uuidv4 } from 'uuid';
import { generateYamlFromSteps as generateYamlFromStepsViaAPI } from "@/lib/deepseek";

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
  const [simulationSettings, setSimulationSettings] = useState<EnhancedSimulationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingYaml, setIsGeneratingYaml] = useState(false);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [interviewConversation, setInterviewConversation] = useState<Array<{role: 'ai'|'user', content: string}>>([]);
  const [showTranscriptEditor, setShowTranscriptEditor] = useState(false);

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

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
  };

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

  const handleSimulationSettingsChange = async (settings: EnhancedSimulationSettings) => {
    setSimulationSettings(settings);
    try {
      // Convert to basic settings for now to maintain compatibility
      const basicSettings: SimulationSettings = {
        enabled: settings.enabled,
        mode: settings.mode === "scenario_based" ? "guided" : (settings.mode as "guided" | "freeform"),
        timeLimit: settings.timeLimit || 300,
        allowRetries: settings.allowRetries,
        maxRetries: settings.maxRetries || 3,
        showHints: settings.showHints,
        requireMediaConfirmation: settings.requireMediaConfirmation,
        feedbackDelay: settings.feedbackDelay,
        difficulty: settings.difficulty,
        name: settings.name || "Simulation",
        enableVoiceInput: settings.enableVoiceInput || true,
        enableTextInput: settings.enableTextInput || true,
        feedbackLevel: settings.feedbackLevel || "detailed",
        enableScoring: settings.enableScoring || true,
        steps: settings.steps || []
      };
      await procedureService.saveSimulationSettings(basicSettings);
    } catch (error) {
      console.error("Error saving simulation settings:", error);
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

  if (status === "unauthenticated") {
    return null; // Will redirect to sign-in page via useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
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
              <span className="text-lg font-semibold">VoiceProc</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/procedures"
              className="text-sm font-medium hover:underline"
            >
              Procedures
            </Link>
            <Link href="/media" className="text-sm font-medium hover:underline">
              Media Library
            </Link>
            <Link
              href="/create"
              className="text-sm font-medium hover:underline"
            >
              Create
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {session?.user?.name && (
              <span className="text-sm text-gray-600">Hi, {session.user.name}</span>
            )}
            <Button variant="default" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="mb-8">
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
                      procedureId={procedureService.currentProcedureId || ""}
                      initialSessionId={interviewSessionId}
                      taskDefinition={{
                        title: taskDefinition?.name || "Procedure",
                        description: taskDefinition?.description,
                        goal: taskDefinition?.goal
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
                        procedureId={procedureService.currentProcedureId || ""}
                        onSaveSteps={handleStepsChange}
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
                  initialMermaid={flowchartContent}
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
            <Card>
              <CardContent className="pt-6">
                <EnhancedSimulationBuilder
                  steps={steps}
                  procedureName={taskDefinition?.name || "Procedure"}
                  initialSettings={simulationSettings || undefined}
                  yamlContent={yamlContent}
                  onChange={handleSimulationSettingsChange}
                />
              </CardContent>
            </Card>

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
              <span className="text-lg font-semibold">VoiceProc</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 VoiceProc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
