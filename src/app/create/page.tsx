"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface TaskDefinition {
  name: string;
  description: string;
  kpiTech: string[];
  kpiConcept: string[];
  presenter: string;
  affiliation: string;
  date: string;
}

export default function CreateProcedure() {
  const [activeTab, setActiveTab] = useState("task");
  const [taskDefinition, setTaskDefinition] = useState<TaskDefinition | null>(null);

  const handleNextTab = () => {
    if (activeTab === "task") setActiveTab("media");
    else if (activeTab === "media") setActiveTab("dictation");
    else if (activeTab === "dictation") setActiveTab("procedure");
    else if (activeTab === "procedure") setActiveTab("yaml");
    else if (activeTab === "yaml") setActiveTab("flowchart");
    else if (activeTab === "flowchart") setActiveTab("simulation");
  };

  const handlePreviousTab = () => {
    if (activeTab === "media") setActiveTab("task");
    else if (activeTab === "dictation") setActiveTab("media");
    else if (activeTab === "procedure") setActiveTab("dictation");
    else if (activeTab === "yaml") setActiveTab("procedure");
    else if (activeTab === "flowchart") setActiveTab("yaml");
    else if (activeTab === "simulation") setActiveTab("flowchart");
  };

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
            <Link href="/procedures" className="text-sm font-medium hover:underline">
              Procedures
            </Link>
            <Link href="/media" className="text-sm font-medium hover:underline">
              Media Library
            </Link>
            <Link href="/create" className="text-sm font-medium hover:underline">
              Create
            </Link>
          </nav>
          <div>
            <Button variant="default">Sign In</Button>
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
          onValueChange={setActiveTab}
        >
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="task">1. Define Task</TabsTrigger>
              <TabsTrigger value="media">2. Media</TabsTrigger>
              <TabsTrigger value="dictation">3. Dictation</TabsTrigger>
              <TabsTrigger value="procedure">4. Procedure</TabsTrigger>
              <TabsTrigger value="yaml">5. YAML</TabsTrigger>
              <TabsTrigger value="flowchart">6. Flowchart</TabsTrigger>
              <TabsTrigger value="simulation">7. Simulation</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="task">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Task Definition</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Define the learning task with key performance indicators and presenter information.
                    </p>
                    <p className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      Task definition form will be implemented here, based on the schema from your Prisma model.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        setTaskDefinition({
                          name: "Sample Procedure",
                          description: "This is a sample procedure",
                          kpiTech: ["Technical Skill 1", "Technical Skill 2"],
                          kpiConcept: ["Concept 1", "Concept 2"],
                          presenter: "Dr. Jane Smith",
                          affiliation: "Medical Center",
                          date: new Date().toISOString(),
                        });
                        toast.success("Task definition saved successfully!");
                        handleNextTab();
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Save & Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="media">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Media Library</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Upload supporting materials such as PDFs, images, audio files, and videos.
                    </p>
                    <p className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      Media uploader component will be implemented here.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousTab}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
                    </Button>
                    <Button 
                      onClick={handleNextTab}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="dictation">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Voice Dictation</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Record your voice to create the procedure with AI assistance.
                    </p>
                    <p className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      Voice recorder and transcript editor components will be implemented here.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousTab}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
                    </Button>
                    <Button 
                      onClick={handleNextTab}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="procedure">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Procedure Steps</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Define and organize your procedure steps with associated media and questions.
                    </p>
                    <p className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      Procedure step editor component will be implemented here.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousTab}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
                    </Button>
                    <Button 
                      onClick={handleNextTab}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="yaml">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">YAML Generation</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Auto-generate YAML schema of the procedure with decision points and conditionals.
                    </p>
                    <p className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      YAML generation and editing component will be implemented here.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousTab}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
                    </Button>
                    <Button 
                      onClick={handleNextTab}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="flowchart">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Flowchart Visualization</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Visualize your procedure as an editable flowchart.
                    </p>
                    <p className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      Flowchart editor component using Mermaid.js will be implemented here.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousTab}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
                    </Button>
                    <Button 
                      onClick={handleNextTab}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="simulation">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Simulation Builder</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Create a voice-first simulation experience from your procedure.
                    </p>
                    <p className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      Simulation builder component will be implemented here.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousTab}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => toast.success("Procedure saved successfully!")}
                    >
                      Save & Publish
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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