
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TaskDefinitionForm from "@/components/TaskDefinitionForm";
import MediaUploader from "@/components/MediaUploader";
import VoiceRecorder from "@/components/VoiceRecorder";
import TranscriptEditor from "@/components/TranscriptEditor";
import FlowchartViewer from "@/components/FlowchartViewer";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";

interface TaskDefinition {
  name: string;
  description: string;
  presenter: string;
  affiliation: string;
  kpis: string[];
}

const CreateProcedure = () => {
  const [activeTab, setActiveTab] = useState("task");
  const [transcript, setTranscript] = useState("");
  const [taskDefinition, setTaskDefinition] = useState<TaskDefinition | null>(null);
  const [procedureSteps, setProcedureSteps] = useState<string[]>([]);

  const handleTaskSubmit = (taskData: TaskDefinition) => {
    setTaskDefinition(taskData);
    setActiveTab("media");
    toast.success("Task definition saved successfully!");
  };

  const handleTranscriptChange = (text: string) => {
    setTranscript(text);
  };

  const handleChangeTab = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  const handleNextTab = () => {
    if (activeTab === "task") setActiveTab("media");
    else if (activeTab === "media") setActiveTab("record");
    else if (activeTab === "record") setActiveTab("visualize");
  };

  const handlePreviousTab = () => {
    if (activeTab === "media") setActiveTab("task");
    else if (activeTab === "record") setActiveTab("media");
    else if (activeTab === "visualize") setActiveTab("record");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Procedure</h1>
          <p className="text-gray-500">
            Document your procedure step by step using our voice-based platform.
          </p>
          {taskDefinition && (
            <p className="mt-2 font-medium text-medical-700">
              {taskDefinition.name}
            </p>
          )}
        </div>
        
        <Tabs defaultValue="task" value={activeTab} onValueChange={handleChangeTab}>
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="task">1. Define Task</TabsTrigger>
              <TabsTrigger value="media">2. Upload Media</TabsTrigger>
              <TabsTrigger value="record">3. Record Steps</TabsTrigger>
              <TabsTrigger value="visualize">4. Visualize</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="task">
            <Card>
              <CardContent className="pt-6">
                <TaskDefinitionForm onSubmit={handleTaskSubmit} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="media">
            <Card>
              <CardContent className="pt-6">
                <MediaUploader />
              </CardContent>
            </Card>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={handlePreviousTab}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button 
                onClick={handleNextTab}
                className="bg-medical-600 hover:bg-medical-700"
              >
                Next Step <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="record">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Voice Recording</h2>
                  <VoiceRecorder onTranscriptUpdate={handleTranscriptChange} />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Transcript Editor</h2>
                  <TranscriptEditor 
                    transcript={transcript} 
                    onChange={handleTranscriptChange}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={handlePreviousTab}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button 
                onClick={handleNextTab}
                className="bg-medical-600 hover:bg-medical-700"
              >
                Next Step <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="visualize">
            <Card>
              <CardContent className="pt-6">
                <FlowchartViewer steps={procedureSteps} />
              </CardContent>
            </Card>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={handlePreviousTab}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
              </Button>
              <Button 
                className="bg-medical-600 hover:bg-medical-700"
              >
                Save & Publish
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CreateProcedure;
