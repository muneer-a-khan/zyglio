import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Edit, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import mermaid from "mermaid";

export interface FlowchartViewerProps {
  steps: string[];
  initialMermaid?: string;
  onChange?: (content: string) => void;
}

const FlowchartViewer = ({ steps, initialMermaid = "", onChange }: FlowchartViewerProps) => {
  const [activeTab, setActiveTab] = useState("visual");
  const [isRendering, setIsRendering] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
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
        mermaid.render('flowchart', mermaidCode, (svgCode) => {
          if (flowchartRef.current) {
            flowchartRef.current.innerHTML = svgCode;
          }
        });
      } catch (error) {
        console.error('Error rendering mermaid flowchart:', error);
      }
    }
    
    // Notify parent component about the code change
    if (onChange) {
      onChange(mermaidCode);
    }
  }, [mermaidCode, onChange]);
  
  const generateFlowchart = () => {
    if (steps.length === 0) {
      setMermaidCode("");
      return;
    }
    
    let code = "flowchart TD\n";
    
    steps.forEach((step, index) => {
      const currentId = `step${index + 1}`;
      const nextId = `step${index + 2}`;
      
      // Add the current step node
      code += `  ${currentId}["Step ${index + 1}: ${step.substring(0, 30)}${step.length > 30 ? '...' : ''}"]\n`;
      
      // Add connection to the next step if it exists
      if (index < steps.length - 1) {
        code += `  ${currentId} --> ${nextId}\n`;
      }
    });
    
    setMermaidCode(code);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Procedure Flowchart</CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsSvg}
            disabled={steps.length === 0}
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
              <div ref={flowchartRef} className="flex justify-center min-h-[300px]">
                {!mermaidCode && (
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
