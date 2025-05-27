import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Save } from 'lucide-react';

interface NodeEditorProps {
  node: {
    id: string;
    data: {
      label: string;
      content?: any;
      [key: string]: any;
    };
  };
  onSave: (nodeId: string, updatedData: any) => void;
  onClose: () => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onSave, onClose }) => {
  const [label, setLabel] = useState(node.data.label || '');
  const [description, setDescription] = useState(node.data.content?.data || '');

  const handleSave = () => {
    const updatedData = {
      label,
      content: description ? {
        type: 'text',
        data: description,
        title: label
      } : undefined
    };
    
    onSave(node.id, updatedData);
    onClose();
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
        <div className="space-y-4">
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Node ID
            </label>
            <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600">
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