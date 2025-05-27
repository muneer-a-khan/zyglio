import yaml from 'js-yaml';

interface YamlStep {
  id: string;
  title: string | Record<string, any>; // Allow title to be object for robustness
  description?: string | Record<string, any>; // Allow description to be object
  next?: string;
  decision_point?: boolean;
  options?: Array<{
    choice: string | Record<string, any>; // Allow choice to be object
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
  stages?: Array<string | Record<string, any>>; // Allow stages to be strings or objects
  considerations?: Record<string, any>;
  goals?: Array<string | Record<string, any>>; // Allow goals to be strings or objects
  steps: YamlStep[];
}

interface ReactFlowNode {
  id: string;
  data: {
    label: string;
    description?: string;
    isTerminal?: boolean;
    isDecision?: boolean;
  };
  position: { x: number; y: number };
  style?: Record<string, any>;
  type?: string; // For custom node types if needed
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  labelStyle?: Record<string, any>;
  style?: Record<string, any>;
  animated?: boolean;
  markerEnd?: any; // For arrowheads
  type?: string;
  data?: Record<string, any>; // Add data property for edge metadata
}

interface ReactFlowElements {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

const MAX_LABEL_LENGTH = 50; // Increased max label length for better readability
const NODE_WIDTH = 280; // Wider nodes for better content display
const NODE_HEIGHT = 'auto'; // Auto height based on content
const LEVEL_Y_SPACING = 120; // Reduced from 200 to 120 for more compact vertical spacing
const LEVEL_X_SPACING = 60; // Reduced from 100 to 60 for more compact horizontal spacing

/**
 * Extracts a meaningful string from a value that might be a string or an object.
 * @param value The value to process.
 * @param defaultString The string to return if no meaningful string can be extracted.
 * @returns A string.
 */
function getStringValue(value: any, defaultString = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object' && value !== null) {
    return String(value.text || value.label || value.name || value.title || Object.values(value).find(v => typeof v === 'string') || defaultString);
  }
  return defaultString;
}

/**
 * Validates and converts YAML content to ReactFlow nodes and edges
 */
export function convertYamlToReactFlow(yamlContent: string): {
  elements: ReactFlowElements;
  error?: string;
} {
  try {
    const parsedYaml = yaml.load(yamlContent) as YamlProcedure;

    if (!parsedYaml || typeof parsedYaml !== 'object') {
      return {
        elements: createDefaultFlow(),
        error: "Invalid YAML: Not a valid object"
      };
    }

    if (!parsedYaml.steps && parsedYaml.stages && Array.isArray(parsedYaml.stages)) {
      console.log("Converting 'stages' to 'steps' for React Flow.");
      parsedYaml.steps = parsedYaml.stages.map((stageItem, index) => {
        const id = `stage_as_step_${index + 1}`;
        let title: string | Record<string, any> = `Stage ${index + 1}`;
        let description: string | Record<string, any> | undefined = undefined;

        if (typeof stageItem === 'string') {
          const firstColonIndex = stageItem.indexOf(':');
          if (firstColonIndex !== -1) {
            title = stageItem.substring(0, firstColonIndex).trim();
            description = stageItem.substring(firstColonIndex + 1).trim();
          } else {
            title = stageItem.trim(); // No colon, treat whole string as title
          }
        } else if (typeof stageItem === 'object' && stageItem !== null) {
          title = stageItem.title || stageItem.name || stageItem.id || Object.keys(stageItem)[0] || `Stage ${index + 1}`;
          description = stageItem.description || stageItem.details || (typeof stageItem[Object.keys(stageItem)[0]] === 'string' ? stageItem[Object.keys(stageItem)[0]] : undefined);
        }
        
        return {
          id,
          title,
          description,
          next: index < parsedYaml.stages!.length - 1 ? `stage_as_step_${index + 2}` : undefined,
          is_terminal: index === parsedYaml.stages!.length - 1
        };
      });
    }

    if (!parsedYaml.steps || !Array.isArray(parsedYaml.steps) || parsedYaml.steps.length === 0) {
      return {
        elements: createDefaultFlow(),
        error: "Invalid YAML structure: missing 'steps' array or 'stages' that can be converted to steps."
      };
    }

    for (const step of parsedYaml.steps) {
      if (!step.id || typeof step.id !== 'string') {
        return {
          elements: createDefaultFlow(),
          error: `Invalid step: missing or invalid 'id' field. Found: ${JSON.stringify(step.id)}`
        };
      }
       if (!step.title) {
         console.warn(`Step with id '${step.id}' is missing a title. Using ID as title.`);
         // Ensure title is at least the ID if missing
         (step as any).title = step.id;
       }
    }
    
    console.log("Processed YAML steps for React Flow:", parsedYaml.steps);
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
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];
  const nodePositions = new Map<string, { x: number, y: number }>();
  const nodeDepths = new Map<string, number>(); // Store depth of each node
  const nodesAtDepth: { [key: number]: string[] } = {};

  // Build adjacency list and in-degree map
  const adj: { [key: string]: string[] } = {};
  const inDegree: { [key: string]: number } = {};
  const allNodeIds = new Set<string>();

  yamlData.steps.forEach(step => {
    allNodeIds.add(step.id);
    adj[step.id] = [];
    inDegree[step.id] = 0;
  });

  yamlData.steps.forEach(step => {
    const targets: string[] = [];
    if (step.next && allNodeIds.has(step.next)) {
      targets.push(step.next);
    }
    if (step.options) {
      step.options.forEach(opt => {
        if (opt.next && allNodeIds.has(opt.next)) {
          targets.push(opt.next);
        }
      });
    }
    targets.forEach(target => {
      if (!adj[step.id].includes(target)) { // Avoid duplicate edges for in-degree calculation
        adj[step.id].push(target);
        inDegree[target] = (inDegree[target] || 0) + 1;
      }
    });
  });

  // Topological sort to determine depths (levels)
  const queue: string[] = [];
  yamlData.steps.forEach(step => {
    if (inDegree[step.id] === 0) {
      queue.push(step.id);
      nodeDepths.set(step.id, 0);
      if (!nodesAtDepth[0]) nodesAtDepth[0] = [];
      nodesAtDepth[0].push(step.id);
    }
  });

  let head = 0;
  while(head < queue.length) {
    const u = queue[head++];
    (adj[u] || []).forEach(v => {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        const depth = (nodeDepths.get(u) || 0) + 1;
        nodeDepths.set(v, depth);
        if (!nodesAtDepth[depth]) nodesAtDepth[depth] = [];
        nodesAtDepth[depth].push(v);
        queue.push(v);
      }
    });
  }
  
  // Position nodes based on depth and order within depth
  Object.keys(nodesAtDepth).sort((a,b) => Number(a) - Number(b)).forEach(depthKey => {
    const depth = Number(depthKey);
    const nodesInLevel = nodesAtDepth[depth];
    
    // Calculate extra spacing for decision nodes at this level
    const decisionNodesCount = nodesInLevel.filter(nodeId => {
      const step = yamlData.steps.find(s => s.id === nodeId);
      return step && step.decision_point && step.options && step.options.length > 0;
    }).length;
    
    // Increase spacing if there are decision nodes
    const nodeSpacing = LEVEL_X_SPACING + (decisionNodesCount > 0 ? 30 : 0);
    const levelWidth = nodesInLevel.length * (NODE_WIDTH + nodeSpacing) - nodeSpacing;
    let startX = (1400 - levelWidth) / 2; // Wider canvas for better spacing
    if (startX < 50) startX = 50;

    nodesInLevel.forEach((nodeId, index) => {
      const step = yamlData.steps.find(s => s.id === nodeId);
      const isDecisionNode = step && step.decision_point && step.options && step.options.length > 0;
      
      // Give decision nodes extra width in positioning
      const nodeWidth = isDecisionNode ? NODE_WIDTH + 40 : NODE_WIDTH;
      const x = startX + index * (nodeWidth + nodeSpacing);
      const y = depth * LEVEL_Y_SPACING + 50; // Add top margin
      nodePositions.set(nodeId, { x, y });
    });
  });

  // Create nodes with modern styling
  yamlData.steps.forEach(step => {
    const position = nodePositions.get(step.id) || { x: Math.random() * 400, y: Math.random() * 400 }; // Fallback position
    const isDecision = !!(step.decision_point && step.options && step.options.length > 0);
    const isTerminal = !!step.is_terminal;

    const nodeLabel = getStringValue(step.title, step.id);
    const nodeDescription = getStringValue(step.description);

    // Modern node styling inspired by contemporary flowchart libraries
    let nodeStyle = {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      borderRadius: '12px',
      border: 'none',
      padding: '16px 20px',
      width: NODE_WIDTH,
      minHeight: '80px',
      height: NODE_HEIGHT,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.4',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
      transition: 'all 0.2s ease',
    };

    if (isTerminal) {
      nodeStyle.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      nodeStyle.borderRadius = '20px';
    } else if (isDecision) {
      nodeStyle.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      nodeStyle.borderRadius = '8px';
      nodeStyle.border = '3px solid #ffffff';
      nodeStyle.boxShadow = '0 6px 20px rgba(240, 147, 251, 0.3)';
      // Make decision nodes slightly wider to accommodate decision text
      nodeStyle.width = NODE_WIDTH + 40;
      nodeStyle.minHeight = '90px';
    }

    nodes.push({
      id: step.id,
      data: {
        label: sanitizeText(truncateText(nodeLabel)),
        description: nodeDescription ? sanitizeText(nodeDescription) : undefined,
        isTerminal,
        isDecision,
      },
      position,
      style: nodeStyle,
      type: 'default', // Use default React Flow node type with custom styling
    });
  });

  // Create edges with modern styling
  yamlData.steps.forEach(step => {
    const sourceId = step.id;
    
    // Handle regular next edge (non-decision)
    if (step.next && allNodeIds.has(step.next) && (!step.decision_point || !step.options || step.options.length === 0)) {
      edges.push({
        id: `${sourceId}-to-${step.next}`,
        source: sourceId,
        target: step.next,
        type: 'smoothstep',
        style: { 
          stroke: '#3b82f6', 
          strokeWidth: 2,
        },
        animated: false,
        markerEnd: { 
          type: 'arrowclosed', 
          color: '#3b82f6',
          width: 20,
          height: 20,
        },
      });
    }

    // Handle decision point edges
    if (step.decision_point && step.options && step.options.length > 0) {
      console.log(`Processing decision node: ${step.id} with ${step.options.length} options`);
      
      step.options.forEach((option, index) => {
        if (option.next && allNodeIds.has(option.next)) { 
          const choiceLabel = getStringValue(option.choice, `Option ${index+1}`);
          
          // Determine if this is a yes/no decision or a multiple choice
          const isYesNo = step.options && step.options.length === 2 && 
            step.options.some(opt => getStringValue(opt.choice, '').toLowerCase().includes('yes')) &&
            step.options.some(opt => getStringValue(opt.choice, '').toLowerCase().includes('no'));
          
          const isYesOption = isYesNo && (
            choiceLabel.toLowerCase().includes('yes') || 
            choiceLabel.toLowerCase().includes('true') ||
            choiceLabel.toLowerCase().includes('proceed') ||
            choiceLabel.toLowerCase().includes('continue')
          );
          
          const isNoOption = isYesNo && (
            choiceLabel.toLowerCase().includes('no') || 
            choiceLabel.toLowerCase().includes('false') ||
            choiceLabel.toLowerCase().includes('stop') ||
            choiceLabel.toLowerCase().includes('abort')
          );
          
          edges.push({
            id: `${sourceId}-option-${index}-to-${option.next}`,
            source: sourceId,
            target: option.next,
            type: 'smoothstep',
            label: sanitizeText(truncateText(choiceLabel, 25)),
            labelStyle: { 
              fill: '#374151', 
              fontSize: 12, 
              fontWeight: '500',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              backgroundColor: isYesOption ? '#dcfce7' : (isNoOption ? '#fef2f2' : '#ffffff'),
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${isYesOption ? '#10b981' : (isNoOption ? '#ef4444' : '#e5e7eb')}`,
            },
            style: { 
              stroke: isYesOption ? '#10b981' : (isNoOption ? '#ef4444' : '#f59e0b'),
              strokeWidth: 2,
              strokeDasharray: isYesNo ? '5,5' : '8,4',
            },
            animated: false,
            markerEnd: { 
              type: 'arrowclosed', 
              color: isYesOption ? '#10b981' : (isNoOption ? '#ef4444' : '#f59e0b'),
              width: 20,
              height: 20,
            },
            data: {
              label: choiceLabel,
              isDecisionEdge: true,
              isYes: isYesOption,
              isNo: isNoOption,
              choice: choiceLabel,
              condition: option.condition,
              optionIndex: index
            }
          });
        }
      });
      
      // Add fallback edge if there's a next step defined for the decision node itself
      if (step.next && allNodeIds.has(step.next)) {
        // Only add if this next step isn't already covered by options
        const optionTargets = step.options.map(opt => opt.next).filter(Boolean);
        if (!optionTargets.includes(step.next)) {
          edges.push({
            id: `${sourceId}-fallback-to-${step.next}`,
            source: sourceId,
            target: step.next,
            type: 'smoothstep',
            label: 'Default',
            labelStyle: { 
              fill: '#6b7280', 
              fontSize: 11, 
              fontWeight: '400',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              backgroundColor: '#f9fafb',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
            },
            style: { 
              stroke: '#9ca3af', 
              strokeWidth: 1,
              strokeDasharray: '10,5',
            },
            animated: false,
            markerEnd: { 
              type: 'arrowclosed', 
              color: '#9ca3af',
              width: 16,
              height: 16,
            },
            data: {
              label: 'Default',
              isDecisionEdge: false,
              isFallback: true
            }
          });
        }
      }
    }
  });
  
  console.log("Generated React Flow Nodes:", nodes);
  console.log("Generated React Flow Edges:", edges);
  return { nodes, edges };
}

/**
 * Sanitizes text for display, removing potentially problematic characters and ensuring it's a string.
 * @param text The input text (or other type) to sanitize.
 * @returns A sanitized string.
 */
function sanitizeText(text: any): string {
  const stringText = String(text === null || text === undefined ? '' : text);
  return stringText
    .replace(/[`;#]/g, '') 
    .replace(/\(/g, '(')    // Keep parentheses as is for React Flow labels
    .replace(/\)/g, ')')
    .replace(/\n/g, ' ') // Replace newlines with space for single line display in nodes
    .trim();
}

/**
 * Truncates text to a maximum length, adding ellipsis if truncated.
 * @param text The text to truncate.
 * @param maxLength The maximum length for the text.
 * @returns The (potentially) truncated text.
 */
function truncateText(text: string, maxLength: number = MAX_LABEL_LENGTH): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a default flowchart for fallback
 */
function createDefaultFlow(): ReactFlowElements {
  const defaultNodes: ReactFlowNode[] = [
    {
      id: 'start_node',
      data: { label: 'Procedure Start', isTerminal: false, isDecision: false },
      position: { x: 350, y: 100 },
      style: { 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
        borderRadius: '12px',
        border: 'none',
        padding: '16px 20px',
        width: NODE_WIDTH,
        minHeight: '80px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center' as const,
      }
    },
    {
      id: 'error_node',
      data: { label: 'Error: Could not generate flowchart from YAML.', isTerminal: true, isDecision: false },
      position: { x: 300, y: 300 },
      style: { 
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#ffffff',
        borderRadius: '12px',
        border: 'none',
        padding: '16px 20px',
        width: NODE_WIDTH + 80,
        minHeight: '80px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center' as const,
      }
    }
  ];

  const defaultEdges: ReactFlowEdge[] = [
    {
      id: 'start-to-error',
      source: 'start_node',
      target: 'error_node',
      type: 'smoothstep',
      style: { stroke: '#ef4444', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color: '#ef4444', width: 20, height: 20 },
    }
  ];

  return { nodes: defaultNodes, edges: defaultEdges };
} 