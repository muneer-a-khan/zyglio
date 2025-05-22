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

const MindMapContent: React.FC<MindMapProps> = ({ nodes, edges, onSaveNodeData }) => {
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
      // Find root nodes (depth 0 nodes) and also include depth 1 nodes (categories)
      const initialExpandNodes = nodes
        .filter(node => node.data.depth === 0 || node.data.depth === 1)
        .map(node => node.id);
      
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
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.5 });
      }, 300);
    }
  }, [mindMapNodes, reactFlowInstance]);

  // Handle closing the side panel
  const handleCloseSidePanel = useCallback(() => {
    setShowSidePanel(false);
    setSelectedNode(null);
  }, []);

  // Fixed the error by properly typing the onInit callback
  const onInit: OnInit = useCallback((instance) => {
    console.log("ReactFlow initialized");
    setTimeout(() => {
      instance.fitView({ padding: 0.5 });
    }, 300);
  }, []);

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
    
    // Then call the parent's onSaveNodeData if provided
    if (onSaveNodeData) {
      onSaveNodeData(nodeId, updatedData);
    }
    
    setEditingMode('view');
    toast({
      title: "Node updated",
      description: "Your node changes have been saved successfully.",
    });
    
    setIsEditing(false);
  }, [setNodes, toast, onSaveNodeData, setIsEditing]);

  // Handle opening the editor
  const handleEditClick = () => {
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
            fitViewOptions={{ padding: 0.7 }} 
            attributionPosition="bottom-right"
            className="border-2 border-gray-100"
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            nodesDraggable={true}
            elementsSelectable={true}
            zoomOnScroll={true}
            panOnScroll={false}
            panOnDrag={true}
            defaultViewport={{ x: 0, y: 0, zoom: 0.4 }} // Adjusted default zoom for better overview
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
            />
          )}
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
};

export default MindMapContent; 