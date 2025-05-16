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
}

interface ReactFlowElements {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

const MAX_LABEL_LENGTH = 40; // Increased max label length
const NODE_WIDTH = 220;
const NODE_HEIGHT = 'auto'; // Auto height based on content
const LEVEL_Y_SPACING = 150;
const LEVEL_X_SPACING = 70;

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
    const levelWidth = nodesInLevel.length * (NODE_WIDTH + LEVEL_X_SPACING) - LEVEL_X_SPACING;
    let startX = (1000 - levelWidth) / 2; // Centering based on a nominal canvas width
    if (startX < 0) startX = 50;

    nodesInLevel.forEach((nodeId, index) => {
      const x = startX + index * (NODE_WIDTH + LEVEL_X_SPACING);
      const y = depth * LEVEL_Y_SPACING;
      nodePositions.set(nodeId, { x, y });
    });
  });

  // Create nodes
  yamlData.steps.forEach(step => {
    const position = nodePositions.get(step.id) || { x: Math.random() * 400, y: Math.random() * 400 }; // Fallback position
    const isDecision = !!(step.decision_point && step.options && step.options.length > 0);
    const isTerminal = !!step.is_terminal;

    const nodeLabel = getStringValue(step.title, step.id);
    const nodeDescription = getStringValue(step.description);

    nodes.push({
      id: step.id,
      data: {
        label: sanitizeText(truncateText(nodeLabel)),
        description: nodeDescription ? sanitizeText(nodeDescription) : undefined,
        isTerminal,
        isDecision,
      },
      position,
      style: {
        background: isTerminal ? '#d4edda' : isDecision ? '#fff3cd' : '#e9ecef', // Bootstrap-like colors
        borderColor: isTerminal ? '#c3e6cb' : isDecision ? '#ffeeba' : '#ced4da',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '0.25rem',
        padding: '10px 15px',
        width: NODE_WIDTH,
        minHeight: '60px', // Min height
        height: NODE_HEIGHT, // Auto height
        textAlign: 'center',
        fontSize: '14px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      },
      // type: 'customStepNode', // If you have custom nodes
    });
  });

  // Create edges
  yamlData.steps.forEach(step => {
    const sourceId = step.id;
    if (step.next && allNodeIds.has(step.next)) {
      edges.push({
        id: `${sourceId}-to-${step.next}`,
        source: sourceId,
        target: step.next,
        style: { stroke: '#6c757d', strokeWidth: 1.5 },
        animated: false,
        markerEnd: { type: 'arrowclosed', color: '#6c757d' },
      });
    }

    if (step.decision_point && step.options) {
      step.options.forEach((option, index) => {
        if (option.next && allNodeIds.has(option.next) && option.next !== step.next) { // Avoid duplicate if option.next is same as step.next
          const choiceLabel = getStringValue(option.choice, `Option ${index+1}`);
          edges.push({
            id: `${sourceId}-option-${index}-to-${option.next}`,
            source: sourceId,
            target: option.next,
            label: sanitizeText(truncateText(choiceLabel, 20)),
            labelStyle: { fill: '#495057', fontSize: 11, fontWeight: 'normal' },
            style: { stroke: '#adb5bd', strokeWidth: 1.5, strokeDasharray: '5,5' },
            animated: false,
            markerEnd: { type: 'arrowclosed', color: '#adb5bd' },
          });
        }
      });
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
      position: { x: 250, y: 50 },
      style: { background: '#e9ecef', borderColor: '#ced4da', borderWidth: '1px', borderStyle: 'solid', borderRadius: '0.25rem', padding: '10px 15px', width: NODE_WIDTH, textAlign: 'center', fontSize: '14px' }
    },
    {
      id: 'error_node',
      data: { label: 'Error: Could not generate flowchart from YAML.', isTerminal: true, isDecision: false },
      position: { x: 250, y: 200 },
      style: { background: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24', borderWidth: '1px', borderStyle: 'solid', borderRadius: '0.25rem', padding: '10px 15px', width: NODE_WIDTH + 100, textAlign: 'center', fontSize: '14px' }
    }
  ];

  const defaultEdges: ReactFlowEdge[] = [
    {
      id: 'start-to-error',
      source: 'start_node',
      target: 'error_node',
      style: { stroke: '#6c757d' },
      markerEnd: { type: 'arrowclosed', color: '#6c757d' },
    }
  ];

  return { nodes: defaultNodes, edges: defaultEdges };
} 