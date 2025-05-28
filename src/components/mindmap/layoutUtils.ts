import { Node, Edge } from 'reactflow';
import { HORIZONTAL_NODE_PADDING, VERTICAL_NODE_PADDING, PARENT_PADDING } from './nodeUtils';

export const recalculateLayout = (visibleNodes: Node[], visibleEdges: Edge[]) => {
  if (visibleNodes.length === 0) return visibleNodes;
  
  console.log("Recalculating layout for", visibleNodes.length, "nodes");
  
  // Find all root nodes
  const rootNodes = visibleNodes.filter(node => 
    node.data.depth === 0 || 
    !visibleEdges.some(edge => edge.target === node.id)
  );
  
  console.log("Root nodes found:", rootNodes.length);
  
  // Create a map of node positions
  const nodePositions = new Map<string, { x: number, y: number }>();
  
  // Helper function to position a node and its children
  const positionNode = (node: Node, startX: number, startY: number, level: number = 0) => {
    if (!node) return { width: 0, height: 0, childrenCount: 0 };
    
    // Store position for this node
    nodePositions.set(node.id, { x: startX, y: startY });
    
    // Find all child nodes
    const childEdges = visibleEdges.filter(edge => edge.source === node.id);
    const childNodes = childEdges.map(edge => 
      visibleNodes.find(n => n.id === edge.target)
    ).filter(Boolean) as Node[];
    
    if (childNodes.length === 0) {
      return { 
        width: 0, 
        height: 0,
        childrenCount: 0 
      };
    }
    
    // Position each child
    let currentY = startY;
    let maxChildWidth = 0;
    let totalHeight = 0;
    let totalChildrenCount = 0;
    
    childNodes.forEach((childNode, index) => {
      if (!childNode) return;
      
      // Increase horizontal spacing based on depth to prevent overlap
      const childX = startX + HORIZONTAL_NODE_PADDING + (level * PARENT_PADDING);
      const { width, height, childrenCount } = positionNode(
        childNode, 
        childX, 
        currentY, 
        level + 1
      );
      
      maxChildWidth = Math.max(maxChildWidth, width);
      totalHeight += height > 0 ? height : VERTICAL_NODE_PADDING;
      totalChildrenCount += childrenCount + 1;
      
      // Update Y for next child with padding
      // Add more space between groups to prevent co-mingling
      const verticalPadding = childrenCount > 0 ? 
        VERTICAL_NODE_PADDING + (childrenCount * 25) : // Further increased spacing between nodes with children
        VERTICAL_NODE_PADDING;
        
      currentY += Math.max(verticalPadding, height);
    });
    
    return { 
      width: HORIZONTAL_NODE_PADDING + maxChildWidth, 
      height: totalHeight,
      childrenCount: totalChildrenCount
    };
  };
  
  // Position each root node and its children
  let currentY = 0;
  rootNodes.forEach(rootNode => {
    const { height } = positionNode(rootNode, 0, currentY);
    currentY += Math.max(height, VERTICAL_NODE_PADDING * 2);
  });
  
  // Apply calculated positions to nodes
  return visibleNodes.map(node => {
    const position = nodePositions.get(node.id);
    if (position) {
      return {
        ...node,
        position
      };
    }
    return node;
  });
};

export const getVisibleElements = (nodes: Node[], edges: Edge[], expandedNodes: Set<string>) => {
  if (nodes.length === 0) return { visibleNodes: [], visibleEdges: [] };
  
  console.log("Total nodes:", nodes.length);
  console.log("Expanded nodes:", Array.from(expandedNodes));
  
  // First, identify all visible node IDs
  const visibleNodeIds = new Set<string>();
  
  // Helper function to check if a node should be visible
  const isNodeVisible = (nodeId: string): boolean => {
    // Find the node
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;
    
    // Root nodes are always visible
    if (node.data.depth === 0) return true;
    
    // Find parent edges (where this node is the target)
    const parentEdges = edges.filter(e => e.target === nodeId);
    
    // If no parents, it's a root-level node (visible)
    if (parentEdges.length === 0) return true;
    
    // Check if any parent is both visible and expanded
    for (const edge of parentEdges) {
      const parentId = edge.source;
      const parentExpanded = expandedNodes.has(parentId);
      
      // If parent is visible and expanded, this node is visible
      if (isNodeVisible(parentId) && parentExpanded) {
        return true;
      }
    }
    
    // No visible and expanded parent found
    return false;
  };
  
  // Evaluate visibility for each node
  nodes.forEach(node => {
    if (isNodeVisible(node.id)) {
      visibleNodeIds.add(node.id);
    }
  });
  
  console.log("Visible node count:", visibleNodeIds.size);
  
  // Filter nodes that are visible
  const visibleNodes = nodes.filter(node => visibleNodeIds.has(node.id));
  
  // Filter edges where both source and target are visible
  const visibleEdges = edges.filter(
    edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
  
  return { visibleNodes, visibleEdges };
}; 