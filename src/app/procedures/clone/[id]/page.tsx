"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Loader2, Wand2 } from "lucide-react";
import { procedureService, Procedure } from "@/lib/ProcedureService";
import { toast } from "sonner";

export default function CloneProcedurePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const id = params?.id as string;
  
  const [originalProcedure, setOriginalProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  
  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [context, setContext] = useState("");
  const [additionalDescription, setAdditionalDescription] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    const loadProcedure = async () => {
      try {
        if (!id) return;
        const data = await procedureService.getProcedure(id);
        setOriginalProcedure(data);
        
        if (data) {
          setNewTitle(`Copy of ${data.title}`);
        }
      } catch (error) {
        console.error("Error loading procedure:", error);
        toast.error("Failed to load procedure");
      } finally {
        setLoading(false);
      }
    };
    
    if (status === "authenticated") {
      loadProcedure();
    }
  }, [id, status, router]);

  const handleClone = async () => {
    if (!originalProcedure) {
      toast.error("Original procedure not found");
      return;
    }

    if (!context.trim()) {
      toast.error("Please provide context for the new procedure");
      return;
    }

    setCloning(true);
    
    try {
      const response = await fetch('/api/procedures/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalProcedureId: originalProcedure.id,
          newTitle: newTitle.trim() || `Copy of ${originalProcedure.title}`,
          context: context.trim(),
          additionalDescription: additionalDescription.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clone procedure');
      }

      const data = await response.json();
      
      if (data.success && data.newProcedureId) {
        toast.success("Procedure cloned successfully!");
        router.push(`/procedures/${data.newProcedureId}`);
      } else {
        throw new Error(data.error || 'Failed to clone procedure');
      }
    } catch (error) {
      console.error("Error cloning procedure:", error);
      toast.error(error instanceof Error ? error.message : "Failed to clone procedure");
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading procedure...</p>
        </div>
      </div>
    );
  }

  if (!originalProcedure) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Procedure Not Found</h2>
          <p className="text-gray-500 mb-4">The procedure you want to clone could not be found.</p>
          <Link href="/procedures">
            <Button>Return to Procedures</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/procedures">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back to Procedures
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Copy className="h-8 w-8" />
            Clone Procedure
          </h1>
          <p className="text-gray-600">
            Create a new procedure based on "{originalProcedure.title}" with your own context and modifications.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Procedure Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Original Procedure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{originalProcedure.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{originalProcedure.description}</p>
              </div>
              
              {originalProcedure.presenter && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Presenter: </span>
                  <span className="text-sm text-gray-700">{originalProcedure.presenter}</span>
                </div>
              )}
              
              <div>
                <span className="text-sm font-medium text-gray-500">Steps: </span>
                <span className="text-sm text-gray-700">{originalProcedure.steps.length} steps</span>
              </div>
              
              {originalProcedure.kpiTech && originalProcedure.kpiTech.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500 block mb-1">Technical Skills:</span>
                  <div className="flex flex-wrap gap-1">
                    {originalProcedure.kpiTech.slice(0, 3).map((kpi, index) => (
                      <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {kpi}
                      </span>
                    ))}
                    {originalProcedure.kpiTech.length > 3 && (
                      <span className="text-xs text-gray-500">+{originalProcedure.kpiTech.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Steps:</h4>
                <div className="space-y-1">
                  {originalProcedure.steps.slice(0, 3).map((step, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      <span className="font-medium">{index + 1}.</span> {step.content.slice(0, 80)}...
                    </div>
                  ))}
                  {originalProcedure.steps.length > 3 && (
                    <div className="text-xs text-gray-500">... and {originalProcedure.steps.length - 3} more steps</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clone Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>New Procedure Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">New Procedure Title</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter a title for your new procedure"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="context">Context for Adaptation *</Label>
                <Textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Describe how you want this procedure adapted. For example: 'Remake this procedure from the perspective of what a nurse should do during the operation' or 'Adapt this for a pediatric patient instead of an adult'"
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This context will be used by AI to adapt the original procedure to your specific needs.
                </p>
              </div>

              <div>
                <Label htmlFor="description">Additional Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={additionalDescription}
                  onChange={(e) => setAdditionalDescription(e.target.value)}
                  placeholder="Any additional details or modifications you want to include"
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleClone}
                disabled={cloning || !context.trim()}
                className="w-full"
                size="lg"
              >
                {cloning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Copy...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Create Adapted Procedure
                  </>
                )}
              </Button>
              
              {cloning && (
                <div className="text-center text-sm text-gray-600 space-y-1">
                  <p>This may take a moment as AI adapts the procedure...</p>
                  <p className="text-xs">Analyzing original content and applying your context</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">1</div>
                <h4 className="font-medium text-blue-900">Analyze Original</h4>
                <p className="text-blue-700 mt-1">AI analyzes the structure, steps, and content of the original procedure</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">2</div>
                <h4 className="font-medium text-green-900">Apply Context</h4>
                <p className="text-green-700 mt-1">Your context is used to adapt the procedure for the new perspective or requirements</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">3</div>
                <h4 className="font-medium text-purple-900">Generate New</h4>
                <p className="text-purple-700 mt-1">A complete new procedure is created with adapted steps, YAML, and simulation elements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 