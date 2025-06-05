import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import './ReactFlowChart.css'; // Custom styles for modern appearance
import { convertYamlToReactFlow } from '@/lib/YamlToReactFlow';
import { yamlToMindMap } from '@/utils/yamlConverter';
import MindMap from './MindMap';

interface ReactFlowChartProps {
  yamlContent: string;
  className?: string;
  useMindMap?: boolean; // New prop to choose between old flow and new mind map
}

const ReactFlowChart: React.FC<ReactFlowChartProps> = ({ yamlContent, className = 'h-[600px]', useMindMap = true }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState<string | null>(null);

  const processYaml = useCallback((yamlContent: string) => {
    try {
      if (!yamlContent) {
        // Use default flow if no YAML content
        if (useMindMap) {
          setNodes([]);
          setEdges([]);
        } else {
          const { elements } = convertYamlToReactFlow('');
          setNodes(elements.nodes);
          setEdges(elements.edges);
        }
        setError(null);
        return;
      }

      if (useMindMap) {
        // Use the new mind map converter
        const { nodes: mindMapNodes, edges: mindMapEdges } = yamlToMindMap(yamlContent);
        setNodes(mindMapNodes);
        setEdges(mindMapEdges);
        setError(null);
      } else {
        // Use the old ReactFlow converter
        const { elements, error } = convertYamlToReactFlow(yamlContent);
        
        setNodes(elements.nodes);
        setEdges(elements.edges);
        
        if (error) {
          setError(error);
        } else {
          setError(null);
        }
      }
    } catch (err) {
      console.error("Error processing YAML for React Flow:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      
      // Use default flow on error
      if (useMindMap) {
        setNodes([]);
        setEdges([]);
      } else {
        const { elements } = convertYamlToReactFlow('');
        setNodes(elements.nodes);
        setEdges(elements.edges);
      }
    }
  }, [setNodes, setEdges, useMindMap]);

  useEffect(() => {
    processYaml(yamlContent);
  }, [yamlContent, processYaml]);

  if (useMindMap) {
    return (
      <div className={className}>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow-sm">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}
        <MindMap 
          nodes={nodes} 
          edges={edges} 
          onSaveNodeData={(nodeId, data) => {
            console.log('Node data saved:', nodeId, data);
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow-sm">
          <strong className="font-semibold">Error:</strong> {error}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        attributionPosition="bottom-right"
        style={{ background: 'transparent' }}
      >
        <Controls 
          className="react-flow-controls"
        />
        <MiniMap 
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          nodeColor={'#3b82f6'}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
        <Background 
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#94a3b8"
        />
      </ReactFlow>
    </div>
  );
};

export default ReactFlowChart; 