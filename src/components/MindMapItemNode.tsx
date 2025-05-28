import React from 'react';
import { Handle, Position } from 'reactflow';

interface MindMapItemNodeProps {
  data: {
    label: string;
  };
}

const MindMapItemNode: React.FC<MindMapItemNodeProps> = ({ data }) => {
  const { label } = data;

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-md p-2 min-w-[150px] max-w-[250px] hover:shadow-lg transition-shadow duration-200">
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      
      <div className="text-sm text-gray-700 break-words leading-tight">
        {label}
      </div>
    </div>
  );
};

export default MindMapItemNode; 