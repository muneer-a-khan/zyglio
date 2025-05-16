import yaml from 'js-yaml';

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

interface ReactFlowNode {
  id: string;
  data: { 
    label: string;
    description?: string;
  };
  position: { x: number; y: number };
  style?: Record<string, any>;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  labelStyle?: Record<string, any>;
  style?: Record<string, any>;
  animated?: boolean;
}

interface ReactFlowElements {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

/**
 * Validates and converts YAML content to ReactFlow nodes and edges
 */
export function convertYamlToReactFlow(yamlContent: string): { 
  elements: ReactFlowElements; 
  error?: string;
} {
  try {
    // First, verify the YAML can be parsed
    const parsedYaml = yaml.load(yamlContent) as YamlProcedure;
    
    if (!parsedYaml) {
      return { 
        elements: createDefaultFlow(),
        error: "Invalid YAML structure"
      };
    }
    
    if (!parsedYaml.steps || !Array.isArray(parsedYaml.steps)) {
      return { 
        elements: createDefaultFlow(),
        error: "Invalid YAML structure: missing 'steps' array"
      };
    }
    
    // Validate each step has at least an id
    for (const step of parsedYaml.steps) {
      if (!step.id) {
        return {
          elements: createDefaultFlow(),
          error: "Invalid step: missing 'id' field"
        };
      }
    }
    
    return { elements: processYamlData(parsedYaml) };
  } catch (error) {
    console.error("Error converting YAML to ReactFlow:", error);
    return { 
      elements: createDefaultFlow(),
      error: error instanceof Error ? error.message : "Unknown error generating flowchart"
    };
  }
}

/**
 * Processes YAML data and converts it to ReactFlow elements
 */
function processYamlData(yamlData: YamlProcedure): ReactFlowElements {
  const nodeWidth = 200;
  const nodeHeight = 80;
  const levelHeight = 120;
  
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];
  const nodePositions = new Map<string, { x: number, y: number }>();
  
  // Create a map to track each step's level in the flow
  const nodeLevels = new Map<string, number>();
  
  // Calculate node level to determine vertical position
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
  
  // Organize nodes by levels
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
  
  // Create nodes
  yamlData.steps.forEach(step => {
    const position = nodePositions.get(step.id) || { x: 0, y: 0 };
    const isDecision = step.decision_point && step.options && step.options.length > 0;
    const isTerminal = step.is_terminal;
    
    nodes.push({
      id: step.id,
      data: { 
        label: sanitizeText(step.title) || step.id,
        description: step.description ? sanitizeText(step.description) : undefined
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
      edges.push({
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
          edges.push({
            id: `${step.id}-option-${index}-to-${option.next}`,
            source: step.id,
            target: option.next,
            label: sanitizeText(option.choice),
            labelStyle: { fill: '#666', fontSize: 12 },
            style: { stroke: '#999' },
            animated: false
          });
        }
      });
    }
  });
  
  return { nodes, edges };
}

/**
 * Sanitize text for safety
 */
function sanitizeText(text: string): string {
  if (!text) return 'Unnamed';
  
  return text
    .replace(/\n/g, ' ')         // Replace newlines with spaces
    .substring(0, 50)            // Limit length
    .trim();
}

/**
 * Generate a default flowchart for fallback
 */
function createDefaultFlow(): ReactFlowElements {
  const defaultNodes: ReactFlowNode[] = [
    {
      id: 'start',
      data: { label: 'Start' },
      position: { x: 250, y: 0 },
      style: {
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '5px',
        padding: '10px',
        width: 200,
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
        width: 200,
        textAlign: 'center'
      }
    }
  ];

  const defaultEdges: ReactFlowEdge[] = [
    {
      id: 'start-to-end',
      source: 'start',
      target: 'end',
      animated: true,
      style: { stroke: '#555' }
    }
  ];

  return { nodes: defaultNodes, edges: defaultEdges };
} 