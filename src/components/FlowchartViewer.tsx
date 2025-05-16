import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Cpu } from "lucide-react";
import { toast } from "sonner";
import ReactFlowChart from "./ReactFlowChart";

export interface FlowchartViewerProps {
  steps: string[];
  onChange?: (content: string) => void;
}

const FlowchartViewer = ({ steps, onChange }: FlowchartViewerProps) => {
  const [isRendering, setIsRendering] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [yamlContent, setYamlContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Extract YAML content if available
  useEffect(() => {
    if (steps.length === 1 && (steps[0].includes('steps:') || steps[0].includes('stages:'))) {
      setYamlContent(steps[0]);
      // If onChange callback is provided, pass the YAML content
      if (onChange) {
        onChange(steps[0]);
      }
    } else {
      setYamlContent("");
    }
  }, [steps, onChange]);

  const refreshFlowchart = () => {
    setIsRendering(true);
    setError(null);
    
    try {
      // Update the YAML content if needed
      if (steps.length === 1 && (steps[0].includes('steps:') || steps[0].includes('stages:'))) {
        setYamlContent(steps[0]);
      } else {
        // Generate comprehensive YAML for steps
        const complexYaml = generateComplexYaml(steps);
        setYamlContent(complexYaml);
        
        // If onChange callback is provided, pass the generated YAML
        if (onChange) {
          onChange(complexYaml);
        }
      }
    } catch (error: any) {
      setError(error.message || "Error generating flowchart");
      console.error('Error generating flowchart:', error);
    } finally {
      setIsRendering(false);
    }
  };
  
  // Generate AI-powered YAML via server API
  const generateAIYaml = async () => {
    if (steps.length === 0) {
      toast.error("Please add steps first");
      return;
    }
    
    setIsGeneratingAI(true);
    setError(null);
    
    try {
      // Call server API to generate YAML
      const response = await fetch('/api/yaml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        console.warn('AI generation warning:', result.error);
        toast.warning("AI generation had issues, using basic formatting");
      }
      
      setYamlContent(result.yaml);
      
      // If onChange callback is provided, pass the generated YAML
      if (onChange) {
        onChange(result.yaml);
      }
      
      toast.success("AI-optimized procedure flowchart created");
    } catch (error: any) {
      setError(error.message || "Error generating AI flowchart");
      console.error('Error generating AI flowchart:', error);
      toast.error("Failed to generate AI flowchart");
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  // Generate comprehensive YAML format with all requested sections
  const generateComplexYaml = (steps: string[]): string => {
    if (steps.length === 0) return "";
    
    let yaml = "procedure_name: Sample Procedure\n";
    yaml += "purpose: To demonstrate a procedural workflow and visualize the steps in a flowchart format.\n";
    
    // Generate stages from steps
    yaml += "stages:\n";
    steps.forEach((step, index) => {
      yaml += `    - ${step || `Step ${index + 1}`}\n`;
    });
    
    // Add considerations section
    yaml += "considerations:\n";
    yaml += "    - pre-operative:\n";
    yaml += "        - Review procedure details\n";
    yaml += "        - Prepare necessary equipment\n";
    yaml += "    - intra-operative:\n";
    yaml += "        - Monitor progress through steps\n";
    yaml += "        - Document any deviations\n";
    yaml += "    - post-operative:\n";
    yaml += "        - Review outcome\n";
    yaml += "        - Plan follow-up\n";
    
    // Add goals section
    yaml += "goals:\n";
    yaml += "    - Successfully complete the procedure\n";
    yaml += "    - Document all steps accurately\n";
    yaml += "    - Ensure quality control\n";
    
    // Invisible steps section for react-flow to use
    yaml += "\n# Internal mapping for flowchart (not displayed)\n";
    yaml += "steps:\n";
    
    steps.forEach((step, index) => {
      const stepId = `step${index + 1}`;
      const nextId = index < steps.length - 1 ? `step${index + 2}` : undefined;
      
      yaml += `  - id: ${stepId}\n`;
      yaml += `    title: ${step || `Step ${index + 1}`}\n`;
      
      if (nextId) {
        yaml += `    next: ${nextId}\n`;
      } else {
        yaml += `    is_terminal: true\n`;
      }
    });
    
    return yaml;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Procedure Flowchart</CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateAIYaml}
            disabled={isGeneratingAI || steps.length === 0}
          >
            <Cpu
              className={`mr-1 h-4 w-4 ${isGeneratingAI ? "animate-pulse" : ""}`}
            /> AI Generate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshFlowchart}
            disabled={isRendering}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${isRendering ? "animate-spin" : ""}`}
            /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 p-3 mb-4 text-red-600 text-sm rounded border border-red-200">
            <p className="font-semibold">Error rendering flowchart:</p>
            <p>{error}</p>
          </div>
        )}
        
        <div className="h-[600px]">
          <ReactFlowChart 
            yamlContent={yamlContent || ""}
            className="w-full h-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FlowchartViewer;
