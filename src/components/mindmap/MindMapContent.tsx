import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  ReactFlow,
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  OnInit,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';

import MindMapNode from '../MindMapNode';
import MindMapItemNode from '../MindMapItemNode';
import ContentView from '../ContentView';
import NodeEditor from '../NodeEditor';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import DecisionEdge from './DecisionEdge';
import { MindMapProps, MindMapNodeData } from './types';
import { 
  processNodes, 
  processEdges, 
  calculateExpansionSpace, 
  shiftNodesLeft 
} from './nodeUtils';
import { recalculateLayout, getVisibleElements } from './layoutUtils';

// Node types
const nodeTypes = {
  mindMapNode: MindMapNode,
  mindMapItem: MindMapItemNode
};

const MindMapContent: React.FC<MindMapProps> = ({ nodes, edges, forceInitialCenter = false, onSaveNodeData }) => {
  // The key issue: we need to make sure expandedNodes is properly initialized and updated
  const [mindMapNodes, setNodes, onNodesChange] = useNodesState([]);
  const [mindMapEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<Node<MindMapNodeData> | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [editingMode, setEditingMode] = useState<'view' | 'edit'>('view');
  const [isEditing, setIsEditing] = useState(false);
  const reactFlowInstance = useReactFlow();
  const { toast } = useToast();
  
  // Debug: Log expanded nodes state change
  useEffect(() => {
    console.log("Expanded nodes updated:", Array.from(expandedNodes));
  }, [expandedNodes]);
  
  // Add custom edge type
  const edgeTypes = useMemo(() => ({
    decisionEdge: DecisionEdge
  }), []);
  
  // Initialize all root nodes AND category nodes as expanded on first load
  useEffect(() => {
    if (nodes.length > 0 && expandedNodes.size === 0) {
      // For procedure flowcharts, expand ALL nodes by default to show complete flow
      // Check if this looks like a procedure (has step nodes)
      const hasProcedureSteps = nodes.some(node => 
        node.data.metadata?.type === 'decision_step' || 
        node.data.metadata?.type === 'regular_step' || 
        node.data.metadata?.type === 'terminal_step' ||
        node.id.startsWith('step_')
      );
      
      let initialExpandNodes: string[];
      
      if (hasProcedureSteps) {
        // For procedures, expand ALL nodes to show complete workflow
        initialExpandNodes = nodes.map(node => node.id);
        console.log("Procedure detected: Expanding all nodes for complete workflow visibility");
      } else {
        // For mind maps, only expand root and category nodes
        initialExpandNodes = nodes
          .filter(node => node.data.depth === 0 || node.data.depth === 1)
          .map(node => node.id);
        console.log("Mind map detected: Expanding root and category nodes only");
      }
      
      console.log("Initializing nodes as expanded:", initialExpandNodes);
      setExpandedNodes(new Set(initialExpandNodes));
    }
  }, [nodes]);

  // Update the flow when nodes/edges change or expansion state changes
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const { visibleNodes, visibleEdges } = getVisibleElements(nodes, edges, expandedNodes);
    
    if (visibleNodes.length > 0) {
      // Process nodes for display properties
      const processedNodes = processNodes(
        visibleNodes, 
        edges, // Use all edges for node processing to detect children correctly 
        expandedNodes, 
        setExpandedNodes, 
        setSelectedNode, 
        setShowSidePanel, 
        setEditingMode
      );
      
      // Recalculate layout
      const layoutedNodes = recalculateLayout(processedNodes, visibleEdges);
      
      // Shift nodes to the left based on expansion
      const shiftedNodes = shiftNodesLeft(layoutedNodes);
      
      // Update nodes
      setNodes(shiftedNodes);
    } else {
      console.log("No visible nodes to display");
    }
    
    if (visibleEdges.length > 0) {
      // Process edges with decision properties
      const formattedEdges = processEdges(visibleEdges);
      setEdges(formattedEdges);
    } else {
      setEdges([]);
    }
  }, [nodes, edges, expandedNodes, setNodes, setEdges]);

  // Center the view on update
  useEffect(() => {
    if (mindMapNodes.length > 0 && reactFlowInstance) {
      // Use more aggressive timing for flowchart pages
      const timeouts = forceInitialCenter ? [50, 150, 300] : [100, 300, 600];
      
      timeouts.forEach((delay) => {
        setTimeout(() => {
          // For procedure flowcharts, focus on the beginning (top-left area)
          const hasProcedureSteps = mindMapNodes.some(node => 
            node.data.metadata?.type === 'decision_step' || 
            node.data.metadata?.type === 'regular_step' || 
            node.data.metadata?.type === 'terminal_step' ||
            node.id.startsWith('step_')
          );
          
          if (hasProcedureSteps) {
            // Find the first/root nodes (nodes with no incoming edges)
            const rootNodes = mindMapNodes.filter(node => 
              !mindMapEdges.some(edge => edge.target === node.id)
            );
            
            if (rootNodes.length > 0) {
              // Focus on the first root node area with better positioning
              const firstNode = rootNodes[0];
              console.log(`Centering on first node at delay ${delay}:`, firstNode.position);
              const zoomLevel = forceInitialCenter ? 0.9 : 0.85; // Higher zoom for flowchart pages
              reactFlowInstance.setCenter(
                firstNode.position.x + 200, 
                firstNode.position.y + 150, 
                { zoom: zoomLevel, duration: delay === timeouts[timeouts.length - 1] ? 800 : 0 }
              );
            } else {
              // Fallback to standard fit view with higher zoom
              reactFlowInstance.fitView({ 
                padding: forceInitialCenter ? 0.15 : 0.2, 
                minZoom: forceInitialCenter ? 0.85 : 0.8, 
                maxZoom: 1.2,
                duration: delay === timeouts[timeouts.length - 1] ? 800 : 0
              });
            }
          } else {
            // For mind maps, use standard fit view
            reactFlowInstance.fitView({ 
              padding: 0.5,
              duration: delay === timeouts[timeouts.length - 1] ? 800 : 0
            });
          }
        }, delay);
      });
    }
  }, [mindMapNodes, mindMapEdges, reactFlowInstance, forceInitialCenter]);

  // Handle closing the side panel
  const handleCloseSidePanel = useCallback(() => {
    setShowSidePanel(false);
    setSelectedNode(null);
  }, []);

  // Fixed the error by properly typing the onInit callback
  const onInit: OnInit = useCallback((instance) => {
    console.log("ReactFlow initialized");
    
    // Multiple attempts to ensure proper initial positioning
    const initTimeouts = forceInitialCenter ? [25, 100, 250, 500] : [50, 200, 500, 1000];
    
    initTimeouts.forEach((delay) => {
      setTimeout(() => {
        // Check if this is a procedure flowchart
        const hasProcedureSteps = mindMapNodes.some(node => 
          node.data.metadata?.type === 'decision_step' || 
          node.data.metadata?.type === 'regular_step' || 
          node.data.metadata?.type === 'terminal_step' ||
          node.id.startsWith('step_')
        );
        
        if (hasProcedureSteps && mindMapNodes.length > 0) {
          // Find the first/root nodes for procedure flowcharts
          const rootNodes = mindMapNodes.filter(node => 
            !mindMapEdges.some(edge => edge.target === node.id)
          );
          
          if (rootNodes.length > 0) {
            // Focus on the first root node area with better zoom
            const firstNode = rootNodes[0];
            console.log(`OnInit: Centering on first node at delay ${delay}:`, firstNode.position);
            const zoomLevel = forceInitialCenter ? 0.9 : 0.85;
            instance.setCenter(
              firstNode.position.x + 200, 
              firstNode.position.y + 150, 
              { zoom: zoomLevel, duration: delay === initTimeouts[initTimeouts.length - 1] ? 1000 : 0 }
            );
          } else {
            instance.fitView({ 
              padding: forceInitialCenter ? 0.15 : 0.2, 
              minZoom: forceInitialCenter ? 0.85 : 0.8, 
              maxZoom: 1.2,
              duration: delay === initTimeouts[initTimeouts.length - 1] ? 1000 : 0
            });
          }
        } else {
          // For mind maps, use standard fit view
          instance.fitView({ 
            padding: 0.5,
            duration: delay === initTimeouts[initTimeouts.length - 1] ? 1000 : 0
          });
        }
      }, delay);
    });
  }, [mindMapNodes, mindMapEdges, forceInitialCenter]);

  // Improved node click handler with better event handling
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // We don't need to do much here as we've moved the logic to the node components
    // This handler is still useful for centering the view on the clicked node
    console.log("Main node click handler:", node.id);
    
    // Center view on clicked node with animation
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ 
        nodes: [node],
        padding: 0.6,
        duration: 800
      });
    }
  }, [reactFlowInstance]);

  // Calculate panel size based on whether the side panel is showing
  const mainPanelSize = useMemo(() => showSidePanel ? 70 : 100, [showSidePanel]);

  // Handle saving node data
  const handleSaveNodeData = useCallback((nodeId: string, updatedData: Partial<MindMapNodeData>) => {
    console.log('Saving node data:', nodeId, updatedData);
    
    // First update local state
    setNodes((currentNodes) => {
      return currentNodes.map(node => {
        if (node.id === nodeId) {
          // Update node data
          return {
            ...node,
            data: {
              ...node.data,
              ...updatedData,
              // Preserve handlers
              onToggleExpand: node.data.onToggleExpand,
              onNodeClick: node.data.onNodeClick,
              onEditNode: node.data.onEditNode,
            }
          };
        }
        return node;
      });
    });
    
    // Update the selected node to reflect changes immediately
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prevNode => ({
        ...prevNode!,
        data: {
          ...prevNode!.data,
          ...updatedData
        }
      }));
    }
    
    // Then call the parent's onSaveNodeData if provided
    if (onSaveNodeData) {
      onSaveNodeData(nodeId, updatedData);
    }
    
    // Close edit mode and show success
    setEditingMode('view');
    setIsEditing(false);
    
    toast({
      title: "Node updated",
      description: "Your node changes have been saved successfully.",
    });
  }, [setNodes, toast, onSaveNodeData, selectedNode, setIsEditing]);

  // Handle opening the editor
  const handleEditClick = () => {
    setEditingMode('edit');
    setIsEditing(true);
  };

  if (isEditing && selectedNode) {
    const nodeWithId = {
      id: selectedNode.id,
      data: {
        ...selectedNode.data,
        id: selectedNode.id // Ensure id is passed to NodeEditor
      }
    };
    
    return (
      <NodeEditor 
        node={nodeWithId}
        onSave={handleSaveNodeData}
        onClose={() => setIsEditing(false)}
      />
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Main Mind Map Panel */}
      <ResizablePanel defaultSize={mainPanelSize} minSize={60}>
        <div className="h-full relative">
          <ReactFlow
            nodes={mindMapNodes}
            edges={mindMapEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={onInit}
            onNodeClick={onNodeClick}
            minZoom={0.05} // Allow zooming out further
            maxZoom={2} // Allow closer zoom
            fitView
            fitViewOptions={{ padding: 0.4, minZoom: 0.6, maxZoom: 1.5 }} // Improved fit view options
            attributionPosition="bottom-right"
            className="border-2 border-gray-100"
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            nodesDraggable={true}
            elementsSelectable={true}
            zoomOnScroll={true}
            panOnScroll={false}
            panOnDrag={true}
            defaultViewport={{ x: 0, y: 0, zoom: 0.75 }} // Increased from 0.6 to 0.75 for better initial zoom
          >
            <Background color="#94a3b8" gap={16} size={1} />
            <Controls className="bg-white shadow-md rounded border border-gray-200" />
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable
              pannable
              maskColor="rgba(248, 250, 252, 0.6)"
              className="border border-gray-200 shadow-md"
            />
            <Panel position="top-left" className="bg-white/90 p-3 rounded-md shadow-md border border-gray-200">
              <div className="text-xs font-medium text-gray-700">
                Mind Map Visualization 
                <span className="ml-2 text-xs text-gray-500">Click nodes to expand/collapse</span>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </ResizablePanel>
      
      {/* Resizable Handle */}
      {showSidePanel && <ResizableHandle withHandle />}
      
      {/* Side Panel for Node Details */}
      {showSidePanel && (
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          {editingMode === 'edit' && selectedNode ? (
            <NodeEditor 
              node={{
                id: selectedNode.id,
                data: {
                  ...selectedNode.data,
                  id: selectedNode.id // Ensure id is passed to NodeEditor
                }
              }}
              onSave={handleSaveNodeData}
              onClose={handleCloseSidePanel}
            />
          ) : (
            <ContentView 
              selectedNode={selectedNode ? {
                id: selectedNode.id,
                data: {
                  ...selectedNode.data,
                  id: selectedNode.id // Ensure id is passed to ContentView
                }
              } : null}
              onClose={handleCloseSidePanel}
              onSaveNodeData={handleSaveNodeData}
              onEdit={handleEditClick}
            />
          )}
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
};

export default MindMapContent; 