import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Edit, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface FlowchartViewerProps {
  steps: string[];
}

const FlowchartViewer = ({ steps = [] }: FlowchartViewerProps) => {
  const [activeTab, setActiveTab] = useState("flowchart");
  const [isRendering, setIsRendering] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import mermaid to avoid SSR issues
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: true,
        theme: 'neutral',
        flowchart: {
          useMaxWidth: true,
          curve: 'basis',
        },
        securityLevel: 'loose',
      });
      
      renderFlowchart();
    }).catch(err => {
      console.error('Error loading mermaid:', err);
      toast.error('Failed to load flowchart library');
    });
  }, []);

  useEffect(() => {
    renderFlowchart();
  }, [steps]);

  const renderFlowchart = async () => {
    if (steps.length === 0 || !mermaidRef.current) return;
    
    setIsRendering(true);
    
    try {
      const flowchartDefinition = generateMermaidFlowchart(steps);
      setMermaidCode(flowchartDefinition);
      
      // Dynamically import mermaid
      const mermaid = await import('mermaid');
      mermaidRef.current.innerHTML = ''; // Clear previous render
      
      const { svg } = await mermaid.default.render('mermaid-svg', flowchartDefinition);
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = svg;
      }
    } catch (error) {
      console.error('Error rendering flowchart:', error);
      toast.error('Failed to render flowchart');
    } finally {
      setIsRendering(false);
    }
  };

  const generateMermaidFlowchart = (steps: string[]): string => {
    let flowchart = 'graph TD;\n';
    
    if (steps.length === 0) {
      return flowchart + 'noSteps["No steps available"]';
    }

    // Add start node
    flowchart += 'start([Start]);\n';
    
    // Add each step
    steps.forEach((step, index) => {
      const truncatedStep = step.length > 40 ? step.substring(0, 40) + '...' : step;
      const sanitizedStep = truncatedStep.replace(/"/g, "'");
      flowchart += `step${index}["Step ${index + 1}: ${sanitizedStep}"];\n`;
    });
    
    // Add end node
    flowchart += 'end([End]);\n';
    
    // Connect all nodes
    flowchart += 'start --> step0;\n';
    
    for (let i = 0; i < steps.length - 1; i++) {
      flowchart += `step${i} --> step${i + 1};\n`;
    }
    
    if (steps.length > 0) {
      flowchart += `step${steps.length - 1} --> end;\n`;
    } else {
      flowchart += 'start --> end;\n';
    }
    
    return flowchart;
  };

  const downloadSvg = () => {
    if (mermaidRef.current) {
      const svgData = mermaidRef.current.innerHTML;
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = 'procedure_flowchart.svg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      toast.success('Flowchart downloaded as SVG');
    }
  };

  const refreshFlowchart = () => {
    renderFlowchart();
    toast.success('Flowchart refreshed');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Procedure Flowchart</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadSvg}
            disabled={steps.length === 0}
          >
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshFlowchart}
            disabled={isRendering}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${isRendering ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="flowchart" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
            <TabsTrigger value="code">Mermaid Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flowchart">
            {steps.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                <p className="text-muted-foreground">Create steps to generate a flowchart</p>
              </div>
            ) : (
              <div 
                ref={mermaidRef} 
                className="overflow-auto max-w-full"
                style={{ minHeight: '300px' }}
              />
            )}
          </TabsContent>
          
          <TabsContent value="code">
            <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[300px] text-sm">
              {mermaidCode || 'No code generated yet'}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FlowchartViewer;
