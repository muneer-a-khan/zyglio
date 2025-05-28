import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Diamond, Target, GitBranch } from 'lucide-react';

interface NodeEditorProps {
  node: {
    id: string;
    data: {
      label: string;
      description?: string;
      content?: any;
      [key: string]: any;
    };
  };
  onSave: (nodeId: string, updatedData: any) => void;
  onClose: () => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onSave, onClose }) => {
  const [label, setLabel] = useState(node.data.label || '');
  const [description, setDescription] = useState(node.data.description || node.data.content?.data || '');

  const handleSave = () => {
    const updatedData = {
      ...node.data, // Preserve all existing data
      label,
      description,
      // Update content if it exists, otherwise preserve structure
      content: description ? {
        type: 'text',
        data: description,
        title: label
      } : node.data.content
    };
    
    onSave(node.id, updatedData);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Edit Node</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Node Type Indicators */}
          {(node.data.isDecision || node.data.isTerminal) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Node Type
              </label>
              <div className="flex flex-wrap gap-2">
                {node.data.isDecision && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center gap-1">
                    <Diamond className="w-3 h-3" />
                    Decision Point
                  </span>
                )}
                {node.data.isTerminal && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Terminal Step
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter node title..."
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter node description..."
              className="w-full h-32"
              rows={4}
            />
          </div>

          {/* Decision Options (read-only display) */}
          {node.data.isDecision && node.data.decisionOptions && node.data.decisionOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision Options ({node.data.decisionOptions.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {node.data.decisionOptions.map((option: any, index: number) => (
                  <div key={index} className="p-2 bg-purple-50 border border-purple-200 rounded text-sm">
                    <div className="font-medium text-purple-900">
                      {option.label}
                    </div>
                    {option.description && option.description !== option.label && (
                      <div className="text-purple-700 text-xs mt-0.5">
                        {option.description}
                      </div>
                    )}
                    {option.nodeId && (
                      <div className="text-purple-600 text-xs mt-0.5 font-mono">
                        → {option.nodeId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Decision options are managed through the procedure configuration
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node ID
            </label>
            <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600 font-mono">
              {node.id}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button 
          className="w-full" 
          onClick={handleSave}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default NodeEditor; 