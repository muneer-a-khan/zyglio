import React from 'react';
import { Handle, Position } from 'reactflow';
import { ChevronDown, ChevronRight, Edit, Eye, Diamond, GitBranch, Target } from 'lucide-react';

interface MindMapNodeProps {
  data: {
    label: string;
    description?: string;
    hasChildren?: boolean;
    expanded?: boolean;
    isDecision?: boolean;
    isTerminal?: boolean;
    decisionOptions?: Array<{
      label: string;
      description: string;
      nodeId?: string;
    }>;
    metadata?: Record<string, any>;
    onToggleExpand?: () => void;
    onNodeClick?: () => void;
    onEditNode?: () => void;
    [key: string]: any;
  };
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ data }) => {
  const {
    label,
    hasChildren,
    expanded,
    isDecision,
    isTerminal,
    decisionOptions,
    onToggleExpand,
    onNodeClick,
    onEditNode
  } = data;

  const getNodeClasses = () => {
    if (isTerminal) {
      return `
        bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 
        rounded-lg shadow-lg p-3 min-w-[220px] max-w-[320px]
        hover:shadow-xl transition-all duration-200 relative
        before:absolute before:inset-0 before:bg-gradient-to-br before:from-green-100 before:to-emerald-100 
        before:rounded-lg before:opacity-0 before:transition-opacity before:duration-200
        hover:before:opacity-50
      `;
    }
    if (isDecision) {
      return `
        bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-400 
        rounded-lg shadow-lg p-3 min-w-[220px] max-w-[320px]
        hover:shadow-xl transition-all duration-200 relative
        before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-100 before:to-pink-100 
        before:rounded-lg before:opacity-0 before:transition-opacity before:duration-200
        hover:before:opacity-50
      `;
    }
    return `
      bg-white border-2 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[300px]
      border-blue-400 bg-blue-50
      hover:shadow-xl transition-all duration-200
    `;
  };

  return (
    <div className={getNodeClasses()}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 flex-1">
          {isTerminal && (
            <div className="flex-shrink-0 p-1 bg-green-100 rounded-full">
              <Target className="w-4 h-4 text-green-600" />
            </div>
          )}
          
          {isDecision && !isTerminal && (
            <div className="flex-shrink-0 p-1 bg-purple-100 rounded-full">
              <Diamond className="w-4 h-4 text-purple-600" />
            </div>
          )}
          
          {hasChildren && !isDecision && !isTerminal && (
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
            <p className={`text-sm font-medium break-words leading-tight ${
              isTerminal ? 'text-green-900' : (isDecision ? 'text-purple-900' : 'text-gray-900')
            }`}>
              {label}
            </p>
            {isDecision && decisionOptions && decisionOptions.length > 0 && (
              <p className="text-xs text-purple-700 mt-1 flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {decisionOptions.length} option{decisionOptions.length !== 1 ? 's' : ''}
              </p>
            )}
            {isTerminal && (
              <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Final step
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-1 flex-shrink-0 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.();
            }}
            className={`p-1 rounded transition-colors ${
              isTerminal 
                ? 'hover:bg-green-100' 
                : (isDecision ? 'hover:bg-purple-100' : 'hover:bg-blue-100')
            }`}
            title="View details"
          >
            <Eye className={`w-3 h-3 ${
              isTerminal ? 'text-green-600' : (isDecision ? 'text-purple-600' : 'text-blue-600')
            }`} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditNode?.();
            }}
            className={`p-1 rounded transition-colors ${
              isTerminal 
                ? 'hover:bg-green-100' 
                : (isDecision ? 'hover:bg-purple-100' : 'hover:bg-blue-100')
            }`}
            title="Edit node"
          >
            <Edit className={`w-3 h-3 ${
              isTerminal ? 'text-green-600' : (isDecision ? 'text-purple-600' : 'text-blue-600')
            }`} />
          </button>
        </div>
      </div>
      
      {/* Show decision options preview */}
      {isDecision && decisionOptions && decisionOptions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-purple-200 relative z-10">
          <div className="text-xs text-purple-600 space-y-1 max-h-32 overflow-y-auto">
            {decisionOptions.map((option, index) => (
              <div key={index} className="flex items-start gap-1 py-0.5">
                <span className="w-1 h-1 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-purple-700 break-words leading-tight">
                    {option.label}
                  </div>
                  {option.description && option.description !== option.label && (
                    <div className="text-purple-500 text-xs mt-0.5 break-words leading-tight">
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {hasChildren && (
        <Handle type="source" position={Position.Right} className="w-3 h-3" />
      )}
    </div>
  );
};

export default MindMapNode; 