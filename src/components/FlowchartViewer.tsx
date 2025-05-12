
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Edit } from "lucide-react";

interface FlowchartViewerProps {
  steps: string[];
}

const FlowchartViewer = ({ steps = [] }: FlowchartViewerProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      flowchart: {
        useMaxWidth: true,
      },
    });

    if (steps.length > 0 && mermaidRef.current) {
      const flowchartDefinition = generateMermaidFlowchart(steps);
      mermaid.render('mermaid-svg', flowchartDefinition).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
        }
      });
    }
  }, [steps]);

  const generateMermaidFlowchart = (steps: string[]): string => {
    let flowchart = 'graph TD;\n';
    
    if (steps.length === 0) {
      return flowchart + 'A[No steps available]';
    }

    // Add each step
    steps.forEach((step, index) => {
      const truncatedStep = step.length > 30 ? step.substring(0, 30) + '...' : step;
      flowchart += `step${index}["Step ${index + 1}: ${truncatedStep}"];\n`;
      
      // Connect steps
      if (index > 0) {
        flowchart += `step${index - 1} --> step${index};\n`;
      }
    });

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
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Procedure Flowchart</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={downloadSvg}>
            <Download className="mr-1 h-4 w-4" /> Export SVG
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-muted-foreground">Create steps to generate a flowchart</p>
          </div>
        ) : (
          <div 
            ref={mermaidRef} 
            className="overflow-auto max-w-full"
            style={{ minHeight: '250px' }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default FlowchartViewer;
