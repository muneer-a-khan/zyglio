import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { convertYamlToReactFlow } from '@/lib/YamlToReactFlow';

interface ReactFlowChartProps {
  yamlContent: string;
  className?: string;
}

const ReactFlowChart: React.FC<ReactFlowChartProps> = ({ yamlContent, className = 'h-[600px]' }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState<string | null>(null);

  const processYaml = useCallback((yamlContent: string) => {
    try {
      if (!yamlContent) {
        // Use default flow if no YAML content
        const { elements } = convertYamlToReactFlow('');
        setNodes(elements.nodes);
        setEdges(elements.edges);
        setError(null);
        return;
      }

      // Use our utility to convert YAML to ReactFlow elements
      const { elements, error } = convertYamlToReactFlow(yamlContent);
      
      setNodes(elements.nodes);
      setEdges(elements.edges);
      
      if (error) {
        setError(error);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error("Error processing YAML for React Flow:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      
      // Use default flow on error
      const { elements } = convertYamlToReactFlow('');
      setNodes(elements.nodes);
      setEdges(elements.edges);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    processYaml(yamlContent);
  }, [yamlContent, processYaml]);

  return (
    <div className={className}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <MiniMap />
        <Background color="#f8f8f8" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default ReactFlowChart; 