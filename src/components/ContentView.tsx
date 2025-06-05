import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Edit, Tag, Info, GitBranch, Target } from 'lucide-react';

interface ContentViewProps {
  selectedNode: {
    id: string;
    data: {
      label: string;
      description?: string;
      metadata?: Record<string, any>;
      isDecision?: boolean;
      isTerminal?: boolean;
      decisionOptions?: Array<{
        label: string;
        description: string;
        nodeId?: string;
      }>;
      [key: string]: any;
    };
  } | null;
  onClose: () => void;
  onSaveNodeData: (nodeId: string, updatedData: any) => void;
  onEdit?: () => void;
}

const ContentView: React.FC<ContentViewProps> = ({ selectedNode, onClose, onSaveNodeData, onEdit }) => {
  if (!selectedNode) {
    return (
      <div className="p-4 h-full bg-gray-50">
        <div className="text-gray-500 text-center">No node selected</div>
      </div>
    );
  }

  const renderMetadataValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Not set</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">None</span>;
      }
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
              <span className="text-sm">{typeof item === 'object' ? JSON.stringify(item) : String(item)}</span>
            </div>
          ))}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div className="space-y-2">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="flex flex-col">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
              <div className="mt-1">
                {renderMetadataValue(subKey, subValue)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return <span className="text-sm">{String(value)}</span>;
  };

  const getMetadataIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case 'type':
        return <Tag className="w-4 h-4" />;
      case 'depth':
        return <Target className="w-4 h-4" />;
      case 'haschildren':
        return <GitBranch className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Node Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <div className="p-3 bg-gray-50 rounded-md border">
              {selectedNode.data.label}
            </div>
          </div>

          {/* Node Description */}
          {selectedNode.data.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <div className="p-3 bg-gray-50 rounded-md border">
                {selectedNode.data.description}
              </div>
            </div>
          )}

          {/* Node Type Indicators */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node Type
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedNode.data.isDecision && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Decision Point
                </span>
              )}
              {selectedNode.data.isTerminal && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Terminal Step
                </span>
              )}
              {!selectedNode.data.isDecision && !selectedNode.data.isTerminal && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Regular Step
                </span>
              )}
            </div>
          </div>

          {/* Decision Options */}
          {selectedNode.data.isDecision && selectedNode.data.decisionOptions && selectedNode.data.decisionOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision Options ({selectedNode.data.decisionOptions.length})
              </label>
              <div className="space-y-3">
                {selectedNode.data.decisionOptions.map((option, index) => (
                  <div key={index} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="font-medium text-purple-900 text-sm mb-1">
                      {option.label}
                    </div>
                    {option.description && option.description !== option.label && (
                      <div className="text-purple-700 text-xs">
                        {option.description}
                      </div>
                    )}
                    {option.nodeId && (
                      <div className="text-purple-600 text-xs mt-1 font-mono">
                        → {option.nodeId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Node ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node ID
            </label>
            <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600 font-mono">
              {selectedNode.id}
            </div>
          </div>
          
          {/* Metadata */}
          {selectedNode.data.metadata && Object.keys(selectedNode.data.metadata).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Technical Metadata
              </label>
              <div className="space-y-4">
                {Object.entries(selectedNode.data.metadata).map(([key, value]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {getMetadataIcon(key)}
                      <span className="font-medium text-gray-700 text-sm">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                    <div className="ml-6">
                      {renderMetadataValue(key, value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <Button 
          className="w-full" 
          onClick={onEdit}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Node
        </Button>
      </div>
    </div>
  );
};

export default ContentView; 