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
  initialMermaid?: string;
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

const FlowchartViewer = ({ steps: stepsProp, onChange, initialMermaid }: FlowchartViewerProps) => {
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
    // If we have saved flowchart content, use it first
    if (initialMermaid && initialMermaid.trim() !== "") {
      console.log('FlowchartViewer: Loading saved flowchart content');
      console.log('FlowchartViewer: Content length:', initialMermaid.length);
      console.log('FlowchartViewer: Full content:', initialMermaid);
      
      // Parse and analyze the YAML structure
      try {
        const parsed = yaml.load(initialMermaid);
        console.log('FlowchartViewer: Parsed YAML structure:', parsed);
        
        if (parsed && typeof parsed === 'object') {
          if ((parsed as any).steps && Array.isArray((parsed as any).steps)) {
            console.log(`FlowchartViewer: Found ${(parsed as any).steps.length} steps in saved YAML`);
            console.log('FlowchartViewer: Step IDs:', (parsed as any).steps.map((s: any, i: number) => s.id || `step_${i+1}`));
          } else {
            console.log('FlowchartViewer: No steps array found in parsed YAML');
            console.log('FlowchartViewer: YAML keys:', Object.keys(parsed));
          }
        }
        
        console.log('FlowchartViewer: Saved flowchart content is valid YAML');
        setYamlContent(initialMermaid);
        if (onChange) {
          onChange(initialMermaid);
        }
        setError(null);
        return;
      } catch (yamlError) {
        console.error('FlowchartViewer: Saved flowchart content has invalid YAML:', yamlError);
        console.log('FlowchartViewer: Raw content that failed parsing:', initialMermaid);
        setError(`Saved flowchart has invalid YAML format: ${yamlError instanceof Error ? yamlError.message : 'Unknown error'}\\n\\nRaw content preview: ${initialMermaid.substring(0, 500)}...`);
        // Don't return here - fall through to generate new flowchart from steps
      }
    }

    // Otherwise, generate from steps (existing logic)
    const isInputLikelyFullAiYaml = 
      stepsProp.length === 1 &&
      stepsProp[0] && // ensure stepsProp[0] exists
      stepsProp[0].includes('procedure_name:') &&
      (stepsProp[0].includes('stages:') || stepsProp[0].includes('steps:'));

    if (isInputLikelyFullAiYaml) {
      console.log('FlowchartViewer: Using single step as complete YAML');
      setYamlContent(stepsProp[0]);
      if (onChange) {
        onChange(stepsProp[0]);
      }
    } else if (stepsProp && stepsProp.length > 0 && stepsProp.some(s => s.trim() !== "")) {
      console.log('FlowchartViewer: Generating AI YAML from', stepsProp.length, 'steps');
      generateAIYaml(stepsProp);
    } else {
      console.log('FlowchartViewer: No content to display');
      setYamlContent("");
      if (onChange) {
        onChange("");
      }
    }
  }, [stepsProp, onChange, generateAIYaml, initialMermaid]);

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
        {/* Diagnostic Panel */}
        {initialMermaid && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <div className="font-semibold text-blue-800 mb-2">Flowchart Diagnostic Info:</div>
            <div className="text-blue-700 space-y-1">
              <div>Content Length: {initialMermaid.length} characters</div>
              {(() => {
                try {
                  const parsed = yaml.load(initialMermaid);
                  if (parsed && typeof parsed === 'object') {
                    const keys = Object.keys(parsed);
                    const stepsCount = (parsed as any).steps && Array.isArray((parsed as any).steps) ? (parsed as any).steps.length : 0;
                    return (
                      <>
                        <div>YAML Keys: {keys.join(', ')}</div>
                        {stepsCount > 0 && <div>Steps Found: {stepsCount}</div>}
                        {(parsed as any).procedure_name && <div>Procedure: {(parsed as any).procedure_name}</div>}
                      </>
                    );
                  }
                  return <div>Content Type: {typeof parsed}</div>;
                } catch {
                  return <div>Status: Invalid YAML format</div>;
                }
              })()}
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 mb-6 text-red-700 text-sm rounded-lg border border-red-200 shadow-sm">
            <p className="font-semibold text-red-800">Error with Flowchart:</p>
            <pre className="whitespace-pre-wrap text-xs mt-2 font-mono bg-red-100/50 p-2 rounded border">{error}</pre>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  generateAIYaml(stepsProp);
                }}
                disabled={isGeneratingAI || !stepsProp || stepsProp.length === 0}
                className="bg-white text-red-700 border-red-300 hover:bg-red-50"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingAI ? "animate-spin" : ""}`} />
                {isGeneratingAI ? 'Regenerating...' : 'Regenerate Flowchart'}
              </Button>
            </div>
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
