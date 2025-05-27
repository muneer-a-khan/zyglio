import React from 'react';
import { Handle, Position } from 'reactflow';
import { ChevronDown, ChevronRight, Edit, Eye } from 'lucide-react';

interface MindMapNodeProps {
  data: {
    label: string;
    hasChildren?: boolean;
    expanded?: boolean;
    isDecision?: boolean;
    onToggleExpand?: () => void;
    onNodeClick?: () => void;
    onEditNode?: () => void;
  };
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ data }) => {
  const {
    label,
    hasChildren,
    expanded,
    isDecision,
    onToggleExpand,
    onNodeClick,
    onEditNode
  } = data;

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[300px]
      ${isDecision ? 'border-purple-400 bg-purple-50' : 'border-blue-400 bg-blue-50'}
      hover:shadow-xl transition-all duration-200
    `}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 break-words leading-tight">
              {label}
            </p>
          </div>
        </div>
        
        <div className="flex gap-1 flex-shrink-0 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.();
            }}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
            title="View details"
          >
            <Eye className="w-3 h-3 text-blue-600" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditNode?.();
            }}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
            title="Edit node"
          >
            <Edit className="w-3 h-3 text-blue-600" />
          </button>
        </div>
      </div>
      
      {hasChildren && (
        <Handle type="source" position={Position.Right} className="w-3 h-3" />
      )}
    </div>
  );
};

export default MindMapNode; 