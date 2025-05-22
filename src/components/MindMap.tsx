import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import MindMapContent from './mindmap/MindMapContent';
import { MindMapProps } from './mindmap/types';

// Wrapper component that provides the ReactFlow context
const MindMap: React.FC<MindMapProps> = ({ nodes, edges, onSaveNodeData }) => {
  return (
    <div className="w-full h-full bg-gray-50 rounded-md overflow-hidden shadow-lg">
      <ReactFlowProvider>
        <MindMapContent nodes={nodes} edges={edges} onSaveNodeData={onSaveNodeData} />
      </ReactFlowProvider>
    </div>
  );
};

export default MindMap; 