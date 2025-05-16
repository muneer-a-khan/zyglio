import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ReactFlowChart from "./ReactFlowChart";

export interface FlowchartViewerProps {
  steps: string[];
  onChange?: (content: string) => void;
}

const FlowchartViewer = ({ steps, onChange }: FlowchartViewerProps) => {
  const [isRendering, setIsRendering] = useState(false);
  const [yamlContent, setYamlContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Extract YAML content if available
  useEffect(() => {
    if (steps.length === 1 && steps[0].includes('steps:')) {
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
      if (steps.length === 1 && steps[0].includes('steps:')) {
        setYamlContent(steps[0]);
      } else {
        // Generate simple YAML for steps if no YAML is provided
        const simpleYaml = generateSimpleYaml(steps);
        setYamlContent(simpleYaml);
        
        // If onChange callback is provided, pass the generated YAML
        if (onChange) {
          onChange(simpleYaml);
        }
      }
    } catch (error: any) {
      setError(error.message || "Error generating flowchart");
      console.error('Error generating flowchart:', error);
    } finally {
      setIsRendering(false);
    }
  };
  
  // Generate simple YAML for basic steps
  const generateSimpleYaml = (steps: string[]): string => {
    if (steps.length === 0) return "";
    
    let yaml = "name: Simple Procedure\nsteps:\n";
    
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
