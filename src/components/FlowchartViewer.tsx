import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Edit, ZoomIn, ZoomOut, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import mermaid from "mermaid";
import yaml from 'js-yaml';
import { convertYamlToMermaidDSL } from "@/lib/YamlToDSL";
import ReactFlowChart from "./ReactFlowChart";

export interface FlowchartViewerProps {
  steps: string[];
  initialMermaid?: string;
  onChange?: (content: string) => void;
}

const FlowchartViewer = ({ steps, initialMermaid = "", onChange }: FlowchartViewerProps) => {
  const [activeTab, setActiveTab] = useState("visual");
  const [renderEngine, setRenderEngine] = useState<"mermaid" | "reactflow">("mermaid");
  const [isRendering, setIsRendering] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const flowchartRef = useRef<HTMLDivElement>(null);
  const [yamlContent, setYamlContent] = useState<string>("");

  // Extract YAML content if available
  useEffect(() => {
    if (steps.length === 1 && steps[0].includes('steps:')) {
      setYamlContent(steps[0]);
    } else {
      setYamlContent("");
    }
  }, [steps]);

  // Initialize mermaid library
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      securityLevel: 'loose',
      theme: 'default',
      logLevel: 3, // Reduce log spam
      fontFamily: 'sans-serif',
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      }
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
    if (renderEngine !== "mermaid") return;
    
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
  }, [mermaidCode, onChange, renderEngine]);
  
  // Generate a simple fallback flowchart
  const generateFallbackFlowchart = () => {
    return "flowchart TD\n" +
      "  start[\"Start\"] --> end[\"End\"]\n" +
      "  style start fill:#f9f9f9,stroke:#999999\n" +
      "  style end fill:#f9f9f9,stroke:#999999";
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
          // Use our dedicated utility to convert YAML to Mermaid DSL
          const { dsl, error } = convertYamlToMermaidDSL(steps[0]);
          
          if (error) {
            setError(`YAML conversion issue: ${error}`);
          }
          
          setMermaidCode(dsl);
          setIsRendering(false);
          return;
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
        
        // Add the current step node with simplified text
        code += `  ${currentId}["Step ${index + 1}"]\n`;
        
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

  const toggleRenderEngine = () => {
    setRenderEngine(prev => prev === "mermaid" ? "reactflow" : "mermaid");
    setError(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Procedure Flowchart</CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleRenderEngine}
            title={`Switch to ${renderEngine === "mermaid" ? "React Flow" : "Mermaid"} renderer`}
            className="mr-4"
          >
            <ArrowLeftRight className="mr-1 h-4 w-4" />
            {renderEngine === "mermaid" ? "Try React Flow" : "Try Mermaid"}
          </Button>
          
          {renderEngine === "mermaid" && (
            <>
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
                /> Refresh
              </Button>
            </>
          )}
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
            {renderEngine === "mermaid" && (
              <TabsTrigger value="code">Code</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="visual" className="h-[600px] relative">
            {error && (
              <div className="bg-red-50 p-3 mb-4 text-red-600 text-sm rounded border border-red-200">
                <p className="font-semibold">Error rendering flowchart:</p>
                <p>{error}</p>
              </div>
            )}
            
            {renderEngine === "mermaid" ? (
              <div 
                ref={flowchartRef} 
                className="w-full overflow-auto h-full flex items-center justify-center"
              />
            ) : (
              <div className="w-full h-full">
                <ReactFlowChart 
                  yamlContent={yamlContent || ""}
                  className="w-full h-full"
                />
              </div>
            )}
          </TabsContent>

          {renderEngine === "mermaid" && (
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
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FlowchartViewer;
