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
import yaml from 'js-yaml';

interface ReactFlowChartProps {
  yamlContent: string;
  className?: string;
}

interface YamlStep {
  id: string;
  title: string;
  description?: string;
  next?: string;
  decision_point?: boolean;
  options?: Array<{
    choice: string;
    next: string;
    condition?: string;
  }>;
  is_terminal?: boolean;
}

interface YamlProcedure {
  name: string;
  version?: string;
  created_date?: string;
  steps: YamlStep[];
}

const nodeWidth = 200;
const nodeHeight = 80;
const levelHeight = 120;

const ReactFlowChart: React.FC<ReactFlowChartProps> = ({ yamlContent, className = 'h-[600px]' }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState<string | null>(null);

  const processYaml = useCallback((yamlContent: string) => {
    try {
      if (!yamlContent) {
        createDefaultFlow();
        return;
      }

      // Parse YAML
      const parsedYaml = yaml.load(yamlContent) as YamlProcedure;
      
      if (!parsedYaml || !parsedYaml.steps || !Array.isArray(parsedYaml.steps)) {
        setError("Invalid YAML structure");
        createDefaultFlow();
        return;
      }

      // Process nodes and edges
      const { newNodes, newEdges } = convertYamlToReactFlow(parsedYaml);
      
      setNodes(newNodes);
      setEdges(newEdges);
      setError(null);
    } catch (err) {
      console.error("Error processing YAML for React Flow:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      createDefaultFlow();
    }
  }, [setNodes, setEdges]);

  // Create a default simple flowchart
  const createDefaultFlow = useCallback(() => {
    const defaultNodes: Node[] = [
      {
        id: 'start',
        data: { label: 'Start' },
        position: { x: 250, y: 0 },
        style: {
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '5px',
          padding: '10px',
          width: nodeWidth,
          textAlign: 'center'
        }
      },
      {
        id: 'end',
        data: { label: 'End' },
        position: { x: 250, y: 120 },
        style: {
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '5px',
          padding: '10px',
          width: nodeWidth,
          textAlign: 'center'
        }
      }
    ];

    const defaultEdges: Edge[] = [
      {
        id: 'start-to-end',
        source: 'start',
        target: 'end',
        animated: true,
        style: { stroke: '#555' }
      }
    ];

    setNodes(defaultNodes);
    setEdges(defaultEdges);
  }, [setNodes, setEdges]);

  // Convert YAML to React Flow format
  const convertYamlToReactFlow = (yamlData: YamlProcedure) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodePositions = new Map<string, { x: number, y: number }>();
    
    // First pass: Create all nodes with positions
    const organizeNodes = () => {
      // Create a map to track each step's level in the flow
      const nodeLevels = new Map<string, number>();
      const getNodeLevel = (stepId: string, visited = new Set<string>()): number => {
        // Prevent infinite loops from circular dependencies
        if (visited.has(stepId)) return 0;
        visited.add(stepId);
        
        // Find the step
        const step = yamlData.steps.find(s => s.id === stepId);
        if (!step) return 0;
        
        // Terminal nodes are always at the bottom
        if (step.is_terminal) return yamlData.steps.length;
        
        // If we already calculated this node's level, return it
        if (nodeLevels.has(stepId)) return nodeLevels.get(stepId)!;
        
        // Calculate level based on next steps
        let maxChildLevel = 0;
        
        // Check standard next connection
        if (step.next) {
          const childLevel = getNodeLevel(step.next, new Set(visited)) + 1;
          maxChildLevel = Math.max(maxChildLevel, childLevel);
        }
        
        // Check decision options
        if (step.decision_point && step.options) {
          for (const option of step.options) {
            if (option.next && option.next !== step.next) {
              const childLevel = getNodeLevel(option.next, new Set(visited)) + 1;
              maxChildLevel = Math.max(maxChildLevel, childLevel);
            }
          }
        }
        
        // Store and return the level
        nodeLevels.set(stepId, maxChildLevel);
        return maxChildLevel;
      };
      
      // Calculate levels for all nodes
      yamlData.steps.forEach(step => {
        if (!nodeLevels.has(step.id)) {
          getNodeLevel(step.id);
        }
      });
      
      // Now organize nodes by levels
      const nodesByLevel = new Map<number, string[]>();
      nodeLevels.forEach((level, nodeId) => {
        if (!nodesByLevel.has(level)) {
          nodesByLevel.set(level, []);
        }
        nodesByLevel.get(level)!.push(nodeId);
      });
      
      // Position nodes by level
      nodesByLevel.forEach((nodeIds, level) => {
        const levelWidth = nodeIds.length * (nodeWidth + 50);
        const startX = Math.max(0, (1000 - levelWidth) / 2);
        
        nodeIds.forEach((nodeId, index) => {
          const x = startX + index * (nodeWidth + 50);
          const y = level * levelHeight;
          nodePositions.set(nodeId, { x, y });
        });
      });
    };
    
    // Calculate node positions
    organizeNodes();
    
    // Create nodes
    yamlData.steps.forEach(step => {
      const position = nodePositions.get(step.id) || { x: 0, y: 0 };
      const isDecision = step.decision_point && step.options && step.options.length > 0;
      const isTerminal = step.is_terminal;
      
      newNodes.push({
        id: step.id,
        data: { 
          label: step.title || step.id,
          description: step.description 
        },
        position,
        style: {
          background: isTerminal ? '#e6ffe6' : isDecision ? '#fff0e6' : '#f5f5f5',
          border: `1px solid ${isTerminal ? '#99cc99' : isDecision ? '#ffcc99' : '#ddd'}`,
          borderRadius: '5px',
          padding: '10px',
          width: nodeWidth,
          textAlign: 'center'
        }
      });
    });
    
    // Create edges
    yamlData.steps.forEach(step => {
      // Standard next connection
      if (step.next) {
        newEdges.push({
          id: `${step.id}-to-${step.next}`,
          source: step.id,
          target: step.next,
          style: { stroke: '#555' },
          animated: false
        });
      }
      
      // Decision connections
      if (step.decision_point && step.options) {
        step.options.forEach((option, index) => {
          if (option.next && option.next !== step.next) {
            newEdges.push({
              id: `${step.id}-option-${index}-to-${option.next}`,
              source: step.id,
              target: option.next,
              label: option.choice,
              labelStyle: { fill: '#666', fontSize: 12 },
              style: { stroke: '#999' },
              animated: false
            });
          }
        });
      }
    });
    
    return { newNodes, newEdges };
  };

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