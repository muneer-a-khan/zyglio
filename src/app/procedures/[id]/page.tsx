// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, PlayCircle, Tag, User, Building, FileText, Code } from "lucide-react";
import { procedureService, Procedure } from "@/lib/services";
import { toast } from "sonner";
import FlowchartViewer from "@/components/FlowchartViewer";
import YamlGenerator from "@/components/YamlGenerator";
import EnhancedSimulationBuilder from "@/components/EnhancedSimulationBuilder";
import { GenerateTrainingButton } from "@/components/training/generate-training-button";

export default function ProcedurePage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  useEffect(() => {
    const loadProcedure = async () => {
      try {
        if (!id) return;
        const data = await procedureService.getProcedure(id);
        setProcedure(data);
      } catch (error) {
        console.error("Error loading procedure:", error);
        toast.error("Failed to load procedure");
      } finally {
        setLoading(false);
      }
    };
    
    loadProcedure();
  }, [id]);
  
  const startSimulation = () => {
    toast.success("Simulation would start here in a production environment");
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading procedure...</p>
        </div>
      </div>
    );
  }
  
  if (!procedure) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Procedure Not Found</h2>
          <p className="text-gray-500 mb-4">The procedure you are looking for could not be found.</p>
          <Link href="/procedures">
            <Button>Return to Procedures</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <main className="container py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Link href="/procedures">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ArrowLeft className="h-4 w-4" /> Back to Procedures
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-bold mb-2">{procedure.title}</h1>
              <p className="text-gray-600 max-w-3xl mb-4">{procedure.description}</p>
              
              <div className="flex flex-wrap gap-4 text-sm mb-4">
                {procedure.presenter && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <User className="h-4 w-4" />
                    <span>{procedure.presenter}</span>
                  </div>
                )}
                
                {procedure.affiliation && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Building className="h-4 w-4" />
                    <span>{procedure.affiliation}</span>
                  </div>
                )}
                
                {procedure.date && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(procedure.date).toLocaleDateString()}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Est. time: {Math.max(5, procedure.steps.length * 2)} mins</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {procedure.kpiTech && procedure.kpiTech.map((tag, index) => (
                  <Badge key={`tech-${index}`} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {procedure.kpiConcept && procedure.kpiConcept.map((tag, index) => (
                  <Badge key={`concept-${index}`} variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={startSimulation}
              >
                <PlayCircle className="mr-2 h-5 w-5" /> Start Simulation
              </Button>
              {procedure.id && <GenerateTrainingButton procedureId={procedure.id} />}
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Procedure Steps</TabsTrigger>
            <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
            <TabsTrigger value="yaml">YAML</TabsTrigger>
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Procedure Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <p className="text-gray-600">{procedure.description}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Media Resources</h3>
                  {procedure.mediaItems && procedure.mediaItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {procedure.mediaItems.map((item, index) => (
                        <Card key={index} className="overflow-hidden">
                          <CardContent className="p-3">
                            <div className="aspect-video bg-gray-100 rounded flex items-center justify-center mb-2">
                              {item.type === "IMAGE" ? (
                                <img 
                                  src={item.url} 
                                  alt={item.caption || `Media ${index + 1}`}
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : item.type === "VIDEO" ? (
                                <video 
                                  src={item.url}
                                  controls
                                  className="max-h-full max-w-full"
                                />
                              ) : (
                                <FileText className="h-12 w-12 text-gray-400" />
                              )}
                            </div>
                            {item.caption && (
                              <p className="text-sm text-gray-600">{item.caption}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No media resources available for this procedure.</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Technical Skills (KPIs)</h3>
                  {procedure.kpiTech && procedure.kpiTech.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {procedure.kpiTech.map((kpi, index) => (
                        <li key={index} className="text-gray-600">{kpi}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No technical skills defined.</p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Conceptual Skills (KPIs)</h3>
                  {procedure.kpiConcept && procedure.kpiConcept.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {procedure.kpiConcept.map((kpi, index) => (
                        <li key={index} className="text-gray-600">{kpi}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No conceptual skills defined.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Simulation Settings</CardTitle>
              </CardHeader>
              <CardContent>
                {procedure.simulationSettings ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">Mode</h3>
                        <p className="text-gray-600 capitalize">{procedure.simulationSettings.mode} Mode</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-medium">Input Methods</h3>
                        <div className="flex flex-wrap gap-2">
                          {procedure.simulationSettings.enableVoiceInput && (
                            <Badge>Voice Input</Badge>
                          )}
                          {procedure.simulationSettings.enableTextInput && (
                            <Badge variant="outline">Text Input</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-medium">Feedback Level</h3>
                        <p className="text-gray-600 capitalize">{procedure.simulationSettings.feedbackLevel}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">Scoring</h3>
                        <p className="text-gray-600">{procedure.simulationSettings.enableScoring ? "Enabled" : "Disabled"}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-medium">Time Limit</h3>
                        <p className="text-gray-600">
                          {parseInt(procedure.simulationSettings.timeLimit) > 0 
                            ? `${procedure.simulationSettings.timeLimit} minutes` 
                            : "No time limit"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No simulation settings available for this procedure.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="steps">
            <Card>
              <CardHeader>
                <CardTitle>Procedure Steps</CardTitle>
              </CardHeader>
              <CardContent>
                {procedure.steps.length > 0 ? (
                  <div className="space-y-6">
                    {procedure.steps.map((step, index) => (
                      <div 
                        key={step.id}
                        className="border p-4 rounded-lg space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-medium h-8 w-8 mt-0.5">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium mb-1">Step {index + 1}</h3>
                            <p className="text-gray-600">{step.content}</p>
                          </div>
                        </div>
                        
                        {step.comments && step.comments.length > 0 && (
                          <div className="pl-11">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Comments:</h4>
                            <div className="space-y-2">
                              {step.comments.map((comment, commentIndex) => (
                                <div key={commentIndex} className="bg-gray-50 p-2 rounded text-sm text-gray-600">
                                  {comment}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No procedure steps available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="flowchart">
            <Card>
              <CardHeader>
                <CardTitle>Procedure Flowchart</CardTitle>
              </CardHeader>
              <CardContent>
                {procedure.flowchartCode ? (
                  <FlowchartViewer
                    steps={procedure.steps.map((step) => step.content)}
                    initialMermaid={procedure.flowchartCode}
                  />
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <Code className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No flowchart available</h2>
                    <p className="text-gray-500">
                      This procedure doesn't have a flowchart visualization.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="yaml">
            <Card>
              <CardHeader>
                <CardTitle>YAML Definition</CardTitle>
              </CardHeader>
              <CardContent>
                {procedure.yamlContent ? (
                  <YamlGenerator
                    steps={procedure.steps}
                    procedureName={procedure.title}
                    initialYaml={procedure.yamlContent}
                  />
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No YAML definition available</h2>
                    <p className="text-gray-500">
                      This procedure doesn't have a YAML definition.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulation">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Simulation</CardTitle>
              </CardHeader>
              <CardContent>
                {procedure.yamlContent ? (
                  <EnhancedSimulationBuilder
                    steps={procedure.steps}
                    procedureName={procedure.title}
                    yamlContent={procedure.yamlContent}
                    onChange={() => {}} // Read-only view
                  />
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <PlayCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No simulation available</h2>
                    <p className="text-gray-500">
                      This procedure doesn't have simulation settings. A YAML definition is required to generate simulation elements.
                    </p>
                  </div>
                )}
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