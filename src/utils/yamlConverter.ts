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