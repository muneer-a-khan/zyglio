import YAML from 'yaml';

// Convert text to YAML
export const textToYaml = (text: string): string => {
  try {
    // Simple indentation-based parsing
    const lines = text.split('\n');
    const result: any = {};
    
    let currentIndent = 0;
    let currentPath: string[] = [];
    let currentObject: any = result;
    
    lines.forEach(line => {
      if (!line.trim()) return; // Skip empty lines
      
      // Count leading spaces to determine indentation level
      const indent = line.search(/\S|$/);
      const content = line.trim();
      
      // Handle indentation changes
      if (indent > currentIndent) {
        // Deeper level
        currentPath.push(currentObject._lastKey);
        const newObj = {};
        currentObject[currentObject._lastKey] = newObj;
        currentObject = newObj;
      } else if (indent < currentIndent) {
        // Go back up the hierarchy
        const levels = Math.floor((currentIndent - indent) / 2);
        for (let i = 0; i < levels; i++) {
          currentPath.pop();
          currentObject = getNestedObject(result, currentPath);
        }
      }
      
      currentIndent = indent;
      
      // Process the content
      if (content.includes(':')) {
        const [key, value] = content.split(':', 2);
        const trimmedKey = key.trim();
        const trimmedValue = value ? value.trim() : '';
        
        currentObject[trimmedKey] = trimmedValue || {};
        currentObject._lastKey = trimmedKey;
      } else if (content.startsWith('-')) {
        // Handle list items
        const item = content.substring(1).trim();
        if (!currentObject.items) {
          currentObject.items = [];
        }
        currentObject.items.push(item);
      } else {
        // Handle plain text
        if (!currentObject.items) {
          currentObject.items = [];
        }
        currentObject.items.push(content);
      }
    });
    
    // Clean up _lastKey properties
    cleanupObject(result);
    
    return YAML.stringify(result);
  } catch (error) {
    console.error('Error converting text to YAML:', error);
    return '# Error parsing text';
  }
};

// Helper function to get a nested object from a path
const getNestedObject = (obj: any, path: string[]) => {
  return path.reduce((prev, curr) => prev[curr], obj);
};

// Remove utility properties
const cleanupObject = (obj: any) => {
  if (obj && typeof obj === 'object') {
    delete obj._lastKey;
    Object.values(obj).forEach(val => {
      if (val && typeof val === 'object') {
        cleanupObject(val);
      }
    });
  }
};

// Interface for mind map data
interface MindMapData {
  nodes: any[];
  edges: any[];
}

// Improved tree layout configuration for left-to-right flow
const layoutConfig = {
  horizontalSpacing: {
    0: 350, // Root level has wider spacing
    1: 300, // First level
    2: 260, // Second level
    3: 230, // Third level
    default: 200 // Default for deeper levels
  },
  verticalSpacing: {
    0: 180, // Root level has wider vertical spacing
    1: 140, // First level spacing between siblings
    2: 100, // Second level
    3: 80,  // Third level
    default: 70 // Default for deeper levels
  },
  subtreeSpacing: 200, // Space between subtrees
  depthMultiplier: 1.4 // Used to visually separate depth levels
};

// Convert YAML to a hierarchical data structure for mind mapping
export const yamlToMindMap = (yamlString: string): MindMapData => {
  try {
    const parsed = YAML.parse(yamlString);
    
    // Check if this is a procedure YAML with steps
    if (parsed && parsed.steps && Array.isArray(parsed.steps)) {
      return buildProcedureLayout(parsed);
    }
    
    // Fall back to the original hierarchical layout for other YAML structures
    return buildHierarchicalLayout(parsed);
  } catch (error) {
    console.error('Error parsing YAML:', error);
    return { 
      nodes: [{ 
        id: 'error', 
        type: 'mindMapNode', 
        data: { label: 'Error parsing YAML', depth: 0 }, 
        position: { x: 0, y: 0 } 
      }], 
      edges: [] 
    };
  }
};

// Build a hierarchical layout for the mind map (left to right flow)
const buildHierarchicalLayout = (obj: any): MindMapData => {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  // Create root node
  const rootLabel = getRootLabel(obj);
  nodes.push({
    id: 'root',
    type: 'mindMapNode',
    data: { label: rootLabel, depth: 0 },
    position: { x: 0, y: 0 },
    style: { zIndex: 1000 }
  });
  
  // Process main categories
  const mainCategories = getMainCategories(obj);
  let mainCategoryCount = mainCategories.length;
  let yOffset = -(mainCategoryCount * layoutConfig.verticalSpacing[1]) / 2;

  // Separate standard categories from special categories
  const standardCategories = mainCategories.filter(cat => cat !== 'items' && cat !== 'undefined');
  const hasItems = mainCategories.includes('items');
  const hasUndefined = mainCategories.includes('undefined');
  
  // First, process standard categories
  standardCategories.forEach((category, idx) => {
    const x = layoutConfig.horizontalSpacing[1];
    const y = yOffset + (idx * layoutConfig.verticalSpacing[1]);
    
    const categoryNodeId = `category-${category}`;
    
    nodes.push({
      id: categoryNodeId,
      type: 'mindMapNode',
      data: { label: category, depth: 1 },
      position: { x, y },
      style: { zIndex: 900 }
    });
    
    edges.push({
      id: `e-root-${categoryNodeId}`,
      source: 'root',
      target: categoryNodeId,
      animated: true,
      style: { stroke: getColorByDepth(1) }
    });
    
    // Process subcategory
    processSubcategory(obj[category], categoryNodeId, 2, nodes, edges);
  });
  
  // Then, process items if they exist
  if (hasItems && obj.items && Array.isArray(obj.items)) {
    const items = obj.items.slice(1); // Skip the first item as it's used as root
    if (items.length > 0) {
      const itemsPerRow = Math.min(items.length, 4);
      const rows = Math.ceil(items.length / itemsPerRow);
      
      // Position items below standard categories
      let itemYOffset = yOffset + (standardCategories.length * layoutConfig.verticalSpacing[1]) + layoutConfig.subtreeSpacing;
      if (standardCategories.length === 0) {
        itemYOffset = -(rows * layoutConfig.verticalSpacing[1]) / 2;
      }
      
      items.forEach((item: any, index: number) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const colOffset = (col - (itemsPerRow - 1) / 2) * layoutConfig.horizontalSpacing[1] / 1.5;
        const nodeId = `root-item-${index}`;
        
        nodes.push({
          id: nodeId,
          type: 'mindMapItem',
          data: { label: item, depth: 1 },
          position: { 
            x: layoutConfig.horizontalSpacing[1] * layoutConfig.depthMultiplier + colOffset, 
            y: itemYOffset + (row * layoutConfig.verticalSpacing[1]) 
          },
          style: { zIndex: 900 }
        });
        
        edges.push({
          id: `e-root-${nodeId}`,
          source: 'root',
          target: nodeId,
          animated: true,
          style: { stroke: getColorByDepth(1) }
        });
      });
    }
  }
  
  // Finally, process the 'undefined' object if it exists (special handling)
  if (hasUndefined && obj.undefined && typeof obj.undefined === 'object') {
    const subCategories = Object.keys(obj.undefined).filter(k => k !== 'items');
    
    // Determine starting Y position for the undefined section
    let undefinedYOffset = yOffset;
    if (standardCategories.length > 0) {
      undefinedYOffset += (standardCategories.length * layoutConfig.verticalSpacing[1]) + layoutConfig.subtreeSpacing;
    }
    if (hasItems && obj.items && obj.items.length > 1) {
      const itemsPerRow = Math.min(obj.items.length - 1, 4);
      const rows = Math.ceil((obj.items.length - 1) / itemsPerRow);
      undefinedYOffset += (rows * layoutConfig.verticalSpacing[1]) + layoutConfig.subtreeSpacing;
    }
    
    // Process each subcategory in the undefined object
    subCategories.forEach((subCategory, idx) => {
      const categoryNodeId = `category-${subCategory}`;
      const yPos = undefinedYOffset + (idx * (layoutConfig.verticalSpacing[1] + layoutConfig.subtreeSpacing/2));
      
      // Add category node
      nodes.push({
        id: categoryNodeId,
        type: 'mindMapNode',
        data: { label: subCategory, depth: 1 },
        position: { x: layoutConfig.horizontalSpacing[1], y: yPos },
        style: { zIndex: 900 }
      });
      
      // Connect to root
      edges.push({
        id: `e-root-${categoryNodeId}`,
        source: 'root',
        target: categoryNodeId,
        animated: true,
        style: { stroke: getColorByDepth(1) }
      });
      
      // Process subcategory items
      processSubcategory(obj.undefined[subCategory], categoryNodeId, 2, nodes, edges);
    });
  }
  
  return { nodes, edges };
};

// Get main categories from parsed YAML
const getMainCategories = (obj: any): string[] => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj);
};

// Get the root label from items or first key
const getRootLabel = (obj: any): string => {
  if (obj && obj.items && obj.items.length > 0) {
    return obj.items[0];
  }
  
  const keys = Object.keys(obj).filter(k => k !== 'items' && k !== 'undefined' && k !== '_lastKey');
  if (keys.length > 0) {
    return keys[0];
  }
  
  return 'Mind Map';
};

// Process subcategory and its children with left-to-right positioning
const processSubcategory = (obj: any, parentId: string, depth: number, nodes: any[], edges: any[]): void => {
  if (!obj || typeof obj !== 'object') return;
  
  const horizontalSpacing = (layoutConfig.horizontalSpacing as any)[depth] || layoutConfig.horizontalSpacing.default;
  const verticalSpacing = (layoutConfig.verticalSpacing as any)[depth] || layoutConfig.verticalSpacing.default;
  
  // First, process items in the object, if any
  if (obj.items && Array.isArray(obj.items) && obj.items.length > 0) {
    const items = obj.items;
    const totalItems = items.length;
    
    // Calculate the vertical space needed for items
    const itemsPerRow = depth > 2 ? 2 : 1; // For deeper levels, arrange items in multiple rows
    const rows = Math.ceil(totalItems / itemsPerRow);
    let yOffset = -(rows * verticalSpacing) / 2;
    
    items.forEach((item: any, index: number) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const colOffset = (col - (itemsPerRow - 1) / 2) * horizontalSpacing / 2;
      const nodeId = `${parentId}-item-${index}`;
      
      nodes.push({
        id: nodeId,
        type: 'mindMapItem',
        data: { label: item, depth },
        position: { 
          x: horizontalSpacing, 
          y: yOffset + (row * verticalSpacing) 
        },
        style: { zIndex: 1000 - depth }
      });
      
      edges.push({
        id: `e-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        animated: depth <= 2,
        style: { stroke: getColorByDepth(depth) }
      });
    });
  }
  
  // Process other keys (nested objects)
  const keys = Object.keys(obj).filter(k => k !== 'items' && k !== '_lastKey');
  if (keys.length === 0) return;
  
  // Calculate the vertical space needed for subcategories
  const subYStep = verticalSpacing + (depth < 3 ? layoutConfig.subtreeSpacing / 2 : layoutConfig.verticalSpacing.default);
  let subYOffset = -(keys.length * subYStep) / 2;
  
  // If we have items already, adjust the starting position for subcategories
  if (obj.items && Array.isArray(obj.items) && obj.items.length > 0) {
    const items = obj.items;
    const itemsPerRow = depth > 2 ? 2 : 1;
    const rows = Math.ceil(items.length / itemsPerRow);
    subYOffset = (rows * verticalSpacing) + layoutConfig.verticalSpacing.default;
  }
  
  // Process each subcategory
  keys.forEach((key, index) => {
    const nodeId = `${parentId}-${key}`;
    const yPos = subYOffset + (index * subYStep);
    
    nodes.push({
      id: nodeId,
      type: 'mindMapNode',
      data: { label: key, depth },
      position: { x: horizontalSpacing, y: yPos },
      style: { zIndex: 1000 - depth }
    });
    
    edges.push({
      id: `e-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      animated: depth <= 2,
      style: { stroke: getColorByDepth(depth) }
    });
    
    // Process children recursively
    processSubcategory(obj[key], nodeId, depth + 1, nodes, edges);
  });
};

// Get color based on depth level with improved contrast
const getColorByDepth = (depth: number): string => {
  const colors = ['#9b87f5', '#d946ef', '#8b5cf6', '#6366f1', '#4f46e5'];
  return colors[depth % colors.length];
};

// Parse YAML string to get a simple object
export const parseYaml = (yamlString: string): any => {
  try {
    return YAML.parse(yamlString);
  } catch (error) {
    console.error('Error parsing YAML:', error);
    return {};
  }
};

// Build layout specifically for procedure YAML with steps
const buildProcedureLayout = (procedureData: any): MindMapData => {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  // Create root node with procedure name
  const procedureName = procedureData.procedure_name || procedureData.name || 'Procedure';
  nodes.push({
    id: 'root',
    type: 'mindMapNode',
    data: { 
      label: procedureName,
      description: procedureData.purpose || 'Medical procedure flowchart',
      depth: 0,
      metadata: {
        type: 'procedure_root',
        purpose: procedureData.purpose,
        goals: procedureData.goals || [],
        considerations: procedureData.considerations || {}
      }
    },
    position: { x: 0, y: 0 },
    style: { zIndex: 1000 }
  });
  
  const steps = procedureData.steps || [];
  if (steps.length === 0) {
    return { nodes, edges };
  }
  
  // Build adjacency list and in-degree map for topological sorting
  const adj: { [key: string]: string[] } = {};
  const inDegree: { [key: string]: number } = {};
  const allNodeIds = new Set<string>();
  
  // Initialize adjacency list and in-degree map
  steps.forEach((step: any) => {
    const stepId = step.id || `step_${steps.indexOf(step) + 1}`;
    allNodeIds.add(stepId);
    adj[stepId] = [];
    inDegree[stepId] = 0;
  });
  
  // Build connections
  steps.forEach((step: any) => {
    const stepId = step.id || `step_${steps.indexOf(step) + 1}`;
    const targets: string[] = [];
    
    // Add regular next step
    if (step.next && allNodeIds.has(step.next)) {
      targets.push(step.next);
    }
    
    // Add decision option targets
    if (step.options && Array.isArray(step.options)) {
      step.options.forEach((opt: any) => {
        if (opt.next && allNodeIds.has(opt.next)) {
          targets.push(opt.next);
        }
      });
    }
    
    // Update adjacency list and in-degree
    targets.forEach(target => {
      if (!adj[stepId].includes(target)) {
        adj[stepId].push(target);
        inDegree[target] = (inDegree[target] || 0) + 1;
      }
    });
  });
  
  // Topological sort to determine depths (levels)
  const queue: string[] = [];
  const nodeDepths = new Map<string, number>();
  const nodesAtDepth: { [key: number]: string[] } = {};
  
  // Find starting nodes (no incoming edges)
  steps.forEach((step: any) => {
    const stepId = step.id || `step_${steps.indexOf(step) + 1}`;
    if (inDegree[stepId] === 0) {
      queue.push(stepId);
      nodeDepths.set(stepId, 1); // Start at depth 1 (root is 0)
      if (!nodesAtDepth[1]) nodesAtDepth[1] = [];
      nodesAtDepth[1].push(stepId);
    }
  });
  
  // If no starting nodes found, use the first step
  if (queue.length === 0 && steps.length > 0) {
    const firstStepId = steps[0].id || 'step_1';
    queue.push(firstStepId);
    nodeDepths.set(firstStepId, 1);
    if (!nodesAtDepth[1]) nodesAtDepth[1] = [];
    nodesAtDepth[1].push(firstStepId);
  }
  
  // Process queue for topological sorting
  let head = 0;
  while (head < queue.length) {
    const currentStepId = queue[head++];
    const currentDepth = nodeDepths.get(currentStepId) || 1;
    
    (adj[currentStepId] || []).forEach(targetStepId => {
      inDegree[targetStepId]--;
      if (inDegree[targetStepId] === 0) {
        const newDepth = currentDepth + 1;
        nodeDepths.set(targetStepId, newDepth);
        if (!nodesAtDepth[newDepth]) nodesAtDepth[newDepth] = [];
        nodesAtDepth[newDepth].push(targetStepId);
        queue.push(targetStepId);
      }
    });
  }
  
  // Position nodes based on depth and order within depth
  Object.keys(nodesAtDepth).sort((a, b) => Number(a) - Number(b)).forEach(depthKey => {
    const depth = Number(depthKey);
    const nodesInLevel = nodesAtDepth[depth];
    
    // Calculate spacing based on node types at this level
    const decisionNodesCount = nodesInLevel.filter(stepId => {
      const step = steps.find((s: any) => (s.id || `step_${steps.indexOf(s) + 1}`) === stepId);
      return step && step.decision_point && step.options && step.options.length > 0;
    }).length;
    
    // Increase spacing if there are decision nodes
    const baseSpacing = layoutConfig.horizontalSpacing[Math.min(depth, 3) as keyof typeof layoutConfig.horizontalSpacing] || layoutConfig.horizontalSpacing.default;
    const nodeSpacing = layoutConfig.verticalSpacing[Math.min(depth, 3) as keyof typeof layoutConfig.verticalSpacing] || layoutConfig.verticalSpacing.default;
    const extraSpacing = decisionNodesCount > 0 ? 50 : 0;
    
    const levelHeight = nodesInLevel.length * (nodeSpacing + extraSpacing) - extraSpacing;
    let startY = -levelHeight / 2;
    
    nodesInLevel.forEach((stepId, index) => {
      const step = steps.find((s: any) => (s.id || `step_${steps.indexOf(s) + 1}`) === stepId);
      if (!step) return;
      
      const isDecision = step.decision_point === true;
      const isTerminal = step.is_terminal === true;
      const stepTitle = step.title || `Step ${steps.indexOf(step) + 1}`;
      const stepDescription = step.description || '';
      
      // Calculate position
      const x = baseSpacing * depth;
      const y = startY + index * (nodeSpacing + extraSpacing);
      
      // Create comprehensive step node
      nodes.push({
        id: stepId,
        type: 'mindMapNode',
        data: { 
          label: stepTitle,
          description: stepDescription,
          depth: depth,
          isDecision: isDecision,
          isTerminal: isTerminal,
          hasChildren: adj[stepId] && adj[stepId].length > 0,
          decisionOptions: isDecision && step.options ? step.options.map((opt: any) => ({
            label: opt.choice || 'Option',
            description: opt.condition || 'Decision path',
            nodeId: opt.next
          })) : [],
          metadata: {
            type: isDecision ? 'decision_step' : (isTerminal ? 'terminal_step' : 'regular_step'),
            stepId: stepId,
            hasNext: !!step.next,
            nextStep: step.next,
            options: step.options || [],
            originalStep: step
          }
        },
        position: { x, y },
        style: { zIndex: 1000 - depth }
      });
    });
  });
  
  // Connect root to first steps
  if (nodesAtDepth[1] && nodesAtDepth[1].length > 0) {
    nodesAtDepth[1].forEach(stepId => {
      edges.push({
        id: `e-root-${stepId}`,
        source: 'root',
        target: stepId,
        animated: true,
        style: { stroke: getColorByDepth(1), strokeWidth: 2 },
        data: { label: 'Start', isInitialEdge: true }
      });
    });
  }
  
  // Create comprehensive edges between steps
  steps.forEach((step: any) => {
    const stepId = step.id || `step_${steps.indexOf(step) + 1}`;
    const isDecision = step.decision_point === true;
    
    // Handle regular next edge (non-decision or fallback)
    if (step.next && allNodeIds.has(step.next) && (!isDecision || !step.options || step.options.length === 0)) {
      edges.push({
        id: `e-${stepId}-to-${step.next}`,
        source: stepId,
        target: step.next,
        type: 'decisionEdge',
        animated: false,
        style: { 
          stroke: '#3b82f6', 
          strokeWidth: 2,
        },
        data: {
          label: 'Next',
          isDecisionEdge: false
        }
      });
    }
    
    // Handle decision point edges
    if (isDecision && step.options && Array.isArray(step.options) && step.options.length > 0) {
      step.options.forEach((option: any, index: number) => {
        if (option.next && allNodeIds.has(option.next)) {
          const choiceLabel = option.choice || `Option ${index + 1}`;
          
          // Determine if this is a yes/no decision
          const isYesNo = step.options.length === 2 && 
            step.options.some((opt: any) => (opt.choice || '').toLowerCase().includes('yes')) &&
            step.options.some((opt: any) => (opt.choice || '').toLowerCase().includes('no'));
          
          const isYesOption = isYesNo && (
            choiceLabel.toLowerCase().includes('yes') || 
            choiceLabel.toLowerCase().includes('true') ||
            choiceLabel.toLowerCase().includes('proceed') ||
            choiceLabel.toLowerCase().includes('continue') ||
            choiceLabel.toLowerCase().includes('normal')
          );
          
          const isNoOption = isYesNo && (
            choiceLabel.toLowerCase().includes('no') || 
            choiceLabel.toLowerCase().includes('false') ||
            choiceLabel.toLowerCase().includes('stop') ||
            choiceLabel.toLowerCase().includes('abort') ||
            choiceLabel.toLowerCase().includes('elevated') ||
            choiceLabel.toLowerCase().includes('severe')
          );
          
          edges.push({
            id: `e-${stepId}-option-${index}-to-${option.next}`,
            source: stepId,
            target: option.next,
            type: 'decisionEdge',
            animated: false,
            style: { 
              stroke: isYesOption ? '#10b981' : (isNoOption ? '#ef4444' : '#f59e0b'),
              strokeWidth: 2,
              strokeDasharray: isYesNo ? '5,5' : '8,4',
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
        const optionTargets = step.options.map((opt: any) => opt.next).filter(Boolean);
        if (!optionTargets.includes(step.next)) {
          edges.push({
            id: `e-${stepId}-fallback-to-${step.next}`,
            source: stepId,
            target: step.next,
            type: 'decisionEdge',
            animated: false,
            style: { 
              stroke: '#9ca3af', 
              strokeWidth: 1,
              strokeDasharray: '10,5',
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
  
  // Add comprehensive metadata nodes
  const maxDepth = Math.max(...Object.keys(nodesAtDepth).map(Number));
  const metadataX = layoutConfig.horizontalSpacing[Math.min(maxDepth + 1, 3) as keyof typeof layoutConfig.horizontalSpacing] || layoutConfig.horizontalSpacing.default;
  let metadataY = -200;
  
  // Add considerations node
  if (procedureData.considerations) {
    const considerationsId = 'considerations';
    nodes.push({
      id: considerationsId,
      type: 'mindMapNode',
      data: {
        label: 'Considerations',
        description: 'Pre, intra, and post-operative considerations',
        depth: maxDepth + 1,
        metadata: {
          type: 'considerations',
          data: procedureData.considerations,
          preOperative: procedureData.considerations['pre-operative'] || [],
          intraOperative: procedureData.considerations['intra-operative'] || [],
          postOperative: procedureData.considerations['post-operative'] || []
        }
      },
      position: { x: metadataX, y: metadataY },
      style: { zIndex: 700 }
    });
    
    edges.push({
      id: `e-root-${considerationsId}`,
      source: 'root',
      target: considerationsId,
      animated: true,
      style: { stroke: '#6b7280', strokeDasharray: '3,3', strokeWidth: 1 },
      data: { label: 'Info', isMetadataEdge: true }
    });
    
    metadataY += layoutConfig.verticalSpacing[1];
  }
  
  // Add goals node
  if (procedureData.goals && Array.isArray(procedureData.goals) && procedureData.goals.length > 0) {
    const goalsId = 'goals';
    nodes.push({
      id: goalsId,
      type: 'mindMapNode',
      data: {
        label: 'Goals',
        description: `${procedureData.goals.length} primary objectives`,
        depth: maxDepth + 1,
        metadata: {
          type: 'goals',
          data: procedureData.goals,
          objectives: procedureData.goals
        }
      },
      position: { x: metadataX, y: metadataY },
      style: { zIndex: 700 }
    });
    
    edges.push({
      id: `e-root-${goalsId}`,
      source: 'root',
      target: goalsId,
      animated: true,
      style: { stroke: '#6b7280', strokeDasharray: '3,3', strokeWidth: 1 },
      data: { label: 'Info', isMetadataEdge: true }
    });
  }
  
  return { nodes, edges };
}; 