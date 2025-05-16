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
  name?: string;
  procedure_name?: string; 
  version?: string;
  created_date?: string;
  purpose?: string;
  stages?: string[];
  considerations?: Record<string, any>;
  goals?: string[];
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
      // Try to convert stages to steps if available
      if (parsedYaml.stages && Array.isArray(parsedYaml.stages)) {
        parsedYaml.steps = parsedYaml.stages.map((stage, index) => {
          return {
            id: `step${index + 1}`,
            title: stage,
            next: index < parsedYaml.stages!.length - 1 ? `step${index + 2}` : undefined,
            is_terminal: index === parsedYaml.stages!.length - 1
          };
        });
      } else {
        return { 
          elements: createDefaultFlow(),
          error: "Invalid YAML structure: missing 'steps' or 'stages' array"
        };
      }
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
  
  // We're going to reverse the level calculation logic to put the first step at the top
  
  // First, find the terminal nodes (those without next steps)
  const terminalNodes = yamlData.steps.filter(step => 
    step.is_terminal || 
    !step.next || 
    !yamlData.steps.some(s => s.id === step.next)
  );
  
  // Create a reverse map to find predecessors
  const predecessors = new Map<string, string[]>();
  yamlData.steps.forEach(step => {
    if (step.next) {
      if (!predecessors.has(step.next)) {
        predecessors.set(step.next, []);
      }
      predecessors.get(step.next)!.push(step.id);
    }
    
    // Also track decision options
    if (step.decision_point && step.options) {
      step.options.forEach(option => {
        if (option.next) {
          if (!predecessors.has(option.next)) {
            predecessors.set(option.next, []);
          }
          predecessors.get(option.next)!.push(step.id);
        }
      });
    }
  });
  
  // Create a map to track each step's level in the flow
  const nodeLevels = new Map<string, number>();
  
  // Calculate node level from the bottom up
  const getNodeLevel = (stepId: string, visited = new Set<string>()): number => {
    // Prevent infinite loops from circular dependencies
    if (visited.has(stepId)) return 0;
    visited.add(stepId);
    
    // Find the step
    const step = yamlData.steps.find(s => s.id === stepId);
    if (!step) return 0;
    
    // If we already calculated this node's level, return it
    if (nodeLevels.has(stepId)) return nodeLevels.get(stepId)!;
    
    // For the reversed flow, nodes with no predecessors are at the top (level 0)
    const preds = predecessors.get(stepId) || [];
    if (preds.length === 0) {
      nodeLevels.set(stepId, 0);
      return 0;
    }
    
    // Calculate level based on predecessors - take the max level of predecessors + 1
    let level = 0;
    for (const pred of preds) {
      const predLevel = getNodeLevel(pred, new Set(visited));
      level = Math.max(level, predLevel + 1);
    }
    
    nodeLevels.set(stepId, level);
    return level;
  };
  
  // Calculate levels for all nodes
  yamlData.steps.forEach(step => {
    if (!nodeLevels.has(step.id)) {
      getNodeLevel(step.id);
    }
  });
  
  // Find max level and invert the levels to place first step at the top
  let maxLevel = 0;
  nodeLevels.forEach(level => {
    maxLevel = Math.max(maxLevel, level);
  });
  
  // Create new levels with top-down ordering
  const adjustedLevels = new Map<string, number>();
  nodeLevels.forEach((level, nodeId) => {
    // Invert the level
    adjustedLevels.set(nodeId, maxLevel - level);
  });
  
  // Organize nodes by levels
  const nodesByLevel = new Map<number, string[]>();
  adjustedLevels.forEach((level, nodeId) => {
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