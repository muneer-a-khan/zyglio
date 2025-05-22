import { Node, Edge, MarkerType } from 'reactflow';
import { MindMapNodeData } from './types';

// Constants for layout
export const HORIZONTAL_NODE_PADDING = 350;
export const VERTICAL_NODE_PADDING = 150;
export const PARENT_PADDING = 250;

export const processNodes = (
  nodes: Node[],
  edges: Edge[],
  expandedNodes: Set<string>,
  setExpandedNodes: React.Dispatch<React.SetStateAction<Set<string>>>,
  setSelectedNode: React.Dispatch<React.SetStateAction<Node<MindMapNodeData> | null>>,
  setShowSidePanel: React.Dispatch<React.SetStateAction<boolean>>,
  setEditingMode: React.Dispatch<React.SetStateAction<'view' | 'edit'>>
) => {
  // First pass: identify nodes that have children
  const nodesWithChildren = new Set<string>();
  
  edges.forEach(edge => {
    nodesWithChildren.add(edge.source);
  });
  
  console.log('Nodes with children:', Array.from(nodesWithChildren));
  
  // Second pass: identify decision nodes (nodes with multiple outgoing connections)
  const outgoingConnectionsCount = new Map<string, number>();
  
  edges.forEach(edge => {
    const count = outgoingConnectionsCount.get(edge.source) || 0;
    outgoingConnectionsCount.set(edge.source, count + 1);
  });
  
  // Find decision options for each node
  const decisionOptionsMap = new Map<string, Array<{
    label: string;
    description: string;
    nodeId?: string;
  }>>();
  
  // Extract decision options from edges for nodes that have multiple outgoing connections
  edges.forEach(edge => {
    // Skip if edge has no data
    if (!edge.data) return;
    
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return;
    
    // If this is a source node with multiple connections, it's a decision node
    const outgoingEdges = edges.filter(e => e.source === edge.source);
    if (outgoingEdges.length > 1) {
      // Create or update decision options for this source node
      const currentOptions = decisionOptionsMap.get(edge.source) || [];
      
      // Add this target as an option if we have label information
      currentOptions.push({
        label: edge.data?.isYes ? 'Yes' : (edge.data?.isNo ? 'No' : targetNode.data?.label?.toString() || 'Option'),
        description: edge.data?.label ? String(edge.data.label) : (edge.data?.isYes ? 'Yes path' : (edge.data?.isNo ? 'No path' : 'Choose this path')),
        nodeId: edge.target
      });
      
      decisionOptionsMap.set(edge.source, currentOptions);
    }
  });
  
  // Third pass: add expansion properties and click handlers to nodes
  return nodes.map(node => {
    // Check if this node has children by looking for edges where this node is the source
    const hasChildren = nodesWithChildren.has(node.id);
    const isExpanded = expandedNodes.has(node.id);
    const isDecision = outgoingConnectionsCount.get(node.id) && outgoingConnectionsCount.get(node.id)! > 1;
    const decisionOptions = decisionOptionsMap.get(node.id) || [];
    
    // Extract any metadata from node.data
    const nodeData = node.data as MindMapNodeData;
    const metadata: Record<string, string> = {
      ...(nodeData.metadata || {}),
      id: node.id,
      type: String(node.type || ''),
      depth: String(nodeData.depth || '0'),
      hasChildren: String(hasChildren)
    };
    
    return {
      ...node,
      data: {
        ...node.data,
        hasChildren,
        isDecision,
        decisionOptions,
        metadata,
        expanded: isExpanded,
        onToggleExpand: hasChildren ? () => {
          console.log(`Toggle expansion for node ${node.id} - current state: ${isExpanded ? 'expanded' : 'collapsed'}`);
          setExpandedNodes(prev => {
            // Create a new Set from the previous state
            const newSet = new Set(prev);
            if (newSet.has(node.id)) {
              console.log(`Removing node ${node.id} from expanded nodes`);
              newSet.delete(node.id);
            } else {
              console.log(`Adding node ${node.id} to expanded nodes`);
              newSet.add(node.id);
            }
            return newSet;
          });
        } : undefined,
        onNodeClick: () => {
          // Fix the type casting by properly asserting the node type
          const typedNode = node as Node<MindMapNodeData>;
          console.log(`Content view clicked for node ${node.id}`);
          setSelectedNode(typedNode);
          setShowSidePanel(true);
          setEditingMode('view');
        },
        onEditNode: () => {
          const typedNode = node as Node<MindMapNodeData>;
          console.log(`Edit mode clicked for node ${node.id}`);
          setSelectedNode(typedNode);
          setShowSidePanel(true);
          setEditingMode('edit');
        }
      }
    };
  });
};

export const processEdges = (edges: Edge[]) => {
  return edges.map(edge => {
    // Check if this is a decision edge (source node has multiple outgoing connections)
    const sourceHasMultipleConnections = edges.filter(e => e.source === edge.source).length > 1;
    
    if (sourceHasMultipleConnections) {
      // Determine if this is a "yes" or "no" branch based on edge data
      const isYesBranch = edge.data?.isYes === true;
      const isNoBranch = edge.data?.isNo === true;
      
      return {
        ...edge,
        type: 'decisionEdge',
        animated: false,
        style: {
          stroke: isYesBranch ? '#10b981' : (isNoBranch ? '#ef4444' : '#64748b'),
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isYesBranch ? '#10b981' : (isNoBranch ? '#ef4444' : '#64748b'),
        },
        data: {
          ...edge.data,
          isDecisionEdge: true,
          isYes: isYesBranch,
          isNo: isNoBranch
        }
      };
    }
    
    // Regular edge
    return {
      ...edge,
      animated: false,
      style: {
        stroke: '#64748b',
        strokeWidth: 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      }
    };
  });
};

export const calculateExpansionSpace = (nodes: Node[]) => {
  // Find the maximum x position
  let maxX = 0;
  nodes.forEach(node => {
    if (node.position.x > maxX) {
      maxX = node.position.x;
    }
  });
  return maxX;
};

export const shiftNodesLeft = (nodes: Node[]) => {
  // Calculate shift amount based on max position
  const maxX = Math.max(...nodes.map(node => node.position.x), 0);
  const shiftAmount = maxX * 0.2; // Reduced from 0.25 to 0.2 for better spacing
  
  return nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x - shiftAmount,
      y: node.position.y
    }
  }));
}; 