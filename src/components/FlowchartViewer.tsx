import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Edit, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import mermaid from "mermaid";
import yaml from 'js-yaml';

export interface FlowchartViewerProps {
  steps: string[];
  initialMermaid?: string;
  onChange?: (content: string) => void;
}

const FlowchartViewer = ({ steps, initialMermaid = "", onChange }: FlowchartViewerProps) => {
  const [activeTab, setActiveTab] = useState("visual");
  const [isRendering, setIsRendering] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const flowchartRef = useRef<HTMLDivElement>(null);

  // Initialize mermaid library
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      securityLevel: 'loose',
      theme: 'default'
    });
  }, []);
  
  // Load initial mermaid code if provided
  useEffect(() => {
    if (initialMermaid) {
      setMermaidCode(initialMermaid);
    } else {
      // Generate mermaid code from steps
      generateFlowchart();
    }
  }, [initialMermaid, steps]);
  
  // Render the flowchart whenever the code changes
  useEffect(() => {
    if (flowchartRef.current && mermaidCode) {
      try {
        setError(null);
        const element = flowchartRef.current;
        // Clear previous content
        element.innerHTML = '';
        // Create an element for mermaid to render into
        const renderDiv = document.createElement('div');
        renderDiv.id = 'flowchart';
        element.appendChild(renderDiv);
        
        // Use mermaid to render the flowchart
        mermaid.render('flowchart', mermaidCode).then(({ svg }) => {
          if (flowchartRef.current) {
            renderDiv.innerHTML = svg;
          }
        }).catch(err => {
          setError(err.message || "Error rendering flowchart");
          console.error('Error rendering mermaid flowchart:', err);
        });
      } catch (error: any) {
        setError(error.message || "Error rendering flowchart");
        console.error('Error rendering mermaid flowchart:', error);
      }
    }
    
    // Notify parent component about the code change
    if (onChange) {
      onChange(mermaidCode);
    }
  }, [mermaidCode, onChange]);
  
  // Helper function to sanitize text for mermaid compatibility
  const sanitizeForMermaid = (text: string): string => {
    if (!text) return 'Unnamed';
    
    // Process text to make it mermaid-compatible
    let sanitized = text
      .replace(/\n/g, ' ')        // Replace newlines with spaces
      .replace(/"/g, '\'')        // Replace double quotes with single quotes
      .replace(/\[/g, '(')        // Replace square brackets with parentheses
      .replace(/\]/g, ')')        // Replace square brackets with parentheses
      .replace(/</g, '&lt;')      // Convert < to HTML entity
      .replace(/>/g, '&gt;')      // Convert > to HTML entity
      .replace(/[\\{}|;]/g, '')   // Remove backslashes, curly braces, pipes, and semicolons
      .trim();
    
    // Limit length to ensure flowchart readability
    if (sanitized.length > 30) {
      sanitized = sanitized.substring(0, 27) + '...';
    }
    
    return sanitized;
  };
  
  // Helper function to escape and format a node's text content
  const formatNodeText = (text: string): string => {
    const sanitized = sanitizeForMermaid(text);
    // Return the sanitized text with proper escaping for Mermaid syntax
    return sanitized;
  };
  
  // Function to extract step descriptions from YAML if available
  const extractStepsFromYaml = (yamlText: string): { id: string, title: string, description: string, next?: string, decision_point?: boolean, options?: any[], is_terminal?: boolean }[] | null => {
    try {
      const parsed = yaml.load(yamlText) as any;
      if (parsed && parsed.steps && Array.isArray(parsed.steps)) {
        return parsed.steps.map((step: any) => ({
          id: step.id || '',
          title: step.title || '',
          description: step.description || '',
          next: step.next,
          decision_point: step.decision_point,
          options: step.options,
          is_terminal: step.is_terminal
        }));
      }
    } catch (e) {
      console.log('Not valid YAML or no steps found:', e);
      setError('Failed to parse YAML structure');
    }
    return null;
  };
  
  // Generate a simple fallback flowchart
  const generateFallbackFlowchart = () => {
    return "flowchart TD\n" +
      "  start[\"" + formatNodeText("Start") + "\"] --> " +
      "end[\"" + formatNodeText("End") + "\"]\n";
  };

  const generateFlowchart = () => {
    setIsRendering(true);
    setError(null);
    
    try {
      if (steps.length === 0) {
        setMermaidCode(generateFallbackFlowchart());
        setIsRendering(false);
        return;
      }
      
      // First, check if the first step might be YAML content
      if (steps.length === 1 && steps[0].includes('steps:')) {
        try {
          const yamlSteps = extractStepsFromYaml(steps[0]);
          
          if (yamlSteps && yamlSteps.length > 0) {
            generateFlowchartFromYaml(yamlSteps);
            setIsRendering(false);
            return;
          }
        } catch (yamlError) {
          console.error('Error parsing YAML:', yamlError);
          setError('Failed to parse YAML structure. Using default flowchart format.');
          // Continue with standard format as fallback
        }
      }
      
      // If not YAML or YAML parsing failed, fall back to simple steps
      let code = "flowchart TD\n";
      
      steps.forEach((step, index) => {
        const currentId = `step${index + 1}`;
        const nextId = `step${index + 2}`;
        
        // Sanitize step description
        const sanitizedStep = formatNodeText(step);
        
        // Add the current step node
        code += `  ${currentId}["${sanitizedStep}"]\n`;
        
        // Add connection to the next step if it exists
        if (index < steps.length - 1) {
          code += `  ${currentId} --> ${nextId}\n`;
        }
      });
      
      setMermaidCode(code);
    } catch (error: any) {
      setError(error.message || "Error generating flowchart");
      console.error('Error generating flowchart:', error);
      
      // Create a minimal valid flowchart as fallback
      setMermaidCode(generateFallbackFlowchart());
    } finally {
      setIsRendering(false);
    }
  };
  
  const generateFlowchartFromYaml = (yamlSteps: { id: string, title: string, description: string, next?: string, decision_point?: boolean, options?: any[], is_terminal?: boolean }[]) => {
    // Start with a clean flowchart definition
    let code = "flowchart TD\n";
    
    try {
      // Handle empty steps array
      if (!yamlSteps || yamlSteps.length === 0) {
        setMermaidCode(generateFallbackFlowchart());
        return;
      }
      
      // Create a map for step IDs
      const validStepIds = new Map<string, string>();
      
      // First pass: create valid IDs for all steps
      yamlSteps.forEach(step => {
        if (step.id) {
          // Create a valid ID using our helper
          const validId = createValidId(step.id);
          validStepIds.set(step.id, validId);
        }
      });
      
      // Second pass: create all nodes
      yamlSteps.forEach(step => {
        if (!step.id) return;
        
        const validId = validStepIds.get(step.id) || createValidId(step.id);
        const title = formatNodeText(step.title || step.id);
        
        // Add the node with proper escaped text
        code += `  ${validId}["${title}"]\n`;
      });
      
      // Third pass: add connections and decision logic
      yamlSteps.forEach(step => {
        if (!step.id) return;
        
        const validId = validStepIds.get(step.id) || createValidId(step.id);
        
        // Add standard connections based on 'next' property
        if (step.next && !step.is_terminal) {
          const nextId = validStepIds.get(step.next) || createValidId(step.next);
          code += `  ${validId} --> ${nextId}\n`;
        }
        
        // Add decision point connections if applicable
        if (step.decision_point && step.options && Array.isArray(step.options)) {
          step.options.forEach(option => {
            if (option.next) {
              const choiceText = formatNodeText(option.choice || 'Option');
              const nextId = validStepIds.get(option.next) || createValidId(option.next);
              
              // Skip if it's a duplicate of the standard path
              if (step.next !== option.next) {
                code += `  ${validId} -->|${choiceText}| ${nextId}\n`;
              }
            }
          });
        }
      });
      
      // Style terminal nodes (optional)
      const endSteps = yamlSteps.filter(step => step.is_terminal);
      if (endSteps.length > 0) {
        endSteps.forEach(step => {
          if (!step.id) return;
          const validId = validStepIds.get(step.id) || createValidId(step.id);
          code += `  style ${validId} fill:#e6ffe6,stroke:#99cc99\n`;
        });
      }
      
      setMermaidCode(code);
    } catch (error: any) {
      console.error('Error generating flowchart from YAML:', error);
      setError(`Error converting YAML to flowchart: ${error.message}`);
      
      // Fallback to basic flowchart
      setMermaidCode(generateFallbackFlowchart());
    }
  };
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMermaidCode(e.target.value);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(mermaidCode)
      .then(() => toast.success("Flowchart code copied to clipboard"))
      .catch(() => toast.error("Failed to copy code"));
  };
  
  const exportAsSvg = () => {
    if (flowchartRef.current) {
      const svgElement = flowchartRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'procedure_flowchart.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success("Flowchart exported as SVG");
      }
    }
  };

  // Create a valid Mermaid ID from any string
  const createValidId = (id: string): string => {
    if (!id) return 'node' + Math.floor(Math.random() * 10000);
    
    // Remove special characters and ensure it starts with a letter
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // If empty after sanitization or starts with a number, prefix it
    if (!sanitized || /^[0-9]/.test(sanitized)) {
      return 'id' + sanitized;
    }
    
    return sanitized;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Procedure Flowchart</CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsSvg}
            disabled={steps.length === 0 || !!error}
          >
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateFlowchart}
            disabled={isRendering}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${isRendering ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="visual"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>

          <TabsContent value="visual">
            <div className="bg-white rounded-lg border p-4 overflow-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}
              <div ref={flowchartRef} className="flex justify-center min-h-[300px]">
                {!mermaidCode && !error && (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No steps available to display
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="code">
            <Textarea
              value={mermaidCode}
              onChange={handleCodeChange}
              placeholder="Enter mermaid flowchart code here..."
              className="font-mono min-h-[300px]"
            />
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={copyToClipboard}>
                Copy to Clipboard
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FlowchartViewer;
