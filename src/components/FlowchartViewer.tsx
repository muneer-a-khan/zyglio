import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ReactFlowChart from "./ReactFlowChart";
import yaml from 'js-yaml';

export interface FlowchartViewerProps {
  steps: string[];
  onChange?: (content: string) => void;
}

// Helper function to extract raw step descriptions from a string
const extractRawStepsFromString = (inputString: string): string[] => {
  if (!inputString || inputString.trim() === "") {
    return [];
  }
  try {
    const doc = yaml.load(inputString) as any;
    let extracted: string[] = [];
    if (doc && typeof doc === 'object') {
      if (doc.stages && Array.isArray(doc.stages)) {
        extracted = doc.stages.map((stage: any) => {
          if (typeof stage === 'string') return stage.split(':')[0].trim(); 
          if (typeof stage === 'object' && stage !== null) {
            const firstKey = Object.keys(stage)[0];
            if (firstKey) return String(stage[firstKey]).split(':')[0].trim();
          }
          return String(stage).split(':')[0].trim();
        });
      } else if (doc.steps && Array.isArray(doc.steps)) { // For basic "steps:" yaml
        extracted = doc.steps.map((step: any) => String(step.title || step.id || 'Unnamed Step'));
      }
      // Filter out any empty strings that might result from parsing
      const filteredExtracted = extracted.filter(s => s && s.trim() !== '');
      if (filteredExtracted.length > 0) return filteredExtracted;
    }
  } catch (e) {
    // Not valid YAML or not the structure we're looking for, fall through
  }
  // Default to the whole string as one step if it's not empty
  const trimmedInput = inputString.trim();
  return trimmedInput ? [trimmedInput] : [];
};

const FlowchartViewer = ({ steps: stepsProp, onChange }: FlowchartViewerProps) => {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [yamlContent, setYamlContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const generateAIYaml = useCallback(async (currentInputSource: string[]) => {
    if (!currentInputSource || currentInputSource.length === 0 || currentInputSource.every(s => s.trim() === "")) {
      setYamlContent("");
      if (onChange) onChange("");
      toast.info("No steps provided for AI generation.");
      return;
    }

    let rawStepsForAI: string[];

    if (currentInputSource.length === 1) {
      rawStepsForAI = extractRawStepsFromString(currentInputSource[0]);
    } else {
      rawStepsForAI = currentInputSource.map(s => s.trim()).filter(s => s !== "");
    }

    if (rawStepsForAI.length === 0) {
      toast.error("Could not extract meaningful steps for AI generation.");
      // Optionally, use a fallback or keep existing YAML
      // For now, we do nothing to prevent overwriting valid YAML with an error state here
      return;
    }
    
    setIsGeneratingAI(true);
    setError(null);
    
    try {
      const response = await fetch('/api/yaml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: rawStepsForAI }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `API error: ${response.status}` }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        console.warn('AI generation warning:', result.error);
        toast.warning("AI generation had issues. Displaying potentially partial or fallback YAML.");
        // The server might return a fallback YAML in result.yaml even if there's an error message
      }
      
      setYamlContent(result.yaml || ""); // Ensure yamlContent is not undefined
      
      if (onChange) {
        onChange(result.yaml || "");
      }
      
      if (!result.error) {
        toast.success("AI-optimized procedure flowchart created/updated");
      }
    } catch (error: any) {
      setError(error.message || "Error generating AI flowchart");
      console.error('Error generating AI flowchart:', error);
      toast.error(`Failed to generate AI flowchart: ${error.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [onChange]);

  useEffect(() => {
    const isInputLikelyFullAiYaml = 
      stepsProp.length === 1 &&
      stepsProp[0] && // ensure stepsProp[0] exists
      stepsProp[0].includes('procedure_name:') &&
      (stepsProp[0].includes('stages:') || stepsProp[0].includes('steps:'));

    if (isInputLikelyFullAiYaml) {
      setYamlContent(stepsProp[0]);
      if (onChange) {
        onChange(stepsProp[0]);
      }
    } else if (stepsProp && stepsProp.length > 0 && stepsProp.some(s => s.trim() !== "")) {
      generateAIYaml(stepsProp);
    } else {
      setYamlContent("");
      if (onChange) {
        onChange("");
      }
    }
  }, [stepsProp, onChange, generateAIYaml]);

  return (
    <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Procedure Flowchart
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAIYaml(stepsProp)} 
            disabled={isGeneratingAI || !stepsProp || stepsProp.length === 0 || stepsProp.every(s => s.trim() === "")}
            title="Regenerate flowchart with AI"
            className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isGeneratingAI ? "animate-spin" : ""}`}
            /> 
            {isGeneratingAI ? 'Generating...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 mb-6 text-red-700 text-sm rounded-lg border border-red-200 shadow-sm">
            <p className="font-semibold text-red-800">Error with AI Flowchart Generation:</p>
            <pre className="whitespace-pre-wrap text-xs mt-2 font-mono bg-red-100/50 p-2 rounded border">{error}</pre>
          </div>
        )}
        
        <div className="h-[650px] rounded-lg overflow-hidden shadow-inner">
          <ReactFlowChart 
            key={yamlContent ? `flowchart-${yamlContent.length}` : 'empty-flowchart'}
            yamlContent={yamlContent || ""}
            className="w-full h-full rounded-lg"
            useMindMap={true}
            forceInitialCenter={true}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FlowchartViewer;
