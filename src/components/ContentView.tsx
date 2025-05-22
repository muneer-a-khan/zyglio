import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Edit } from 'lucide-react';

interface ContentViewProps {
  selectedNode: {
    id: string;
    data: {
      label: string;
      metadata?: Record<string, string>;
      [key: string]: any;
    };
  } | null;
  onClose: () => void;
  onSaveNodeData: (nodeId: string, updatedData: any) => void;
}

const ContentView: React.FC<ContentViewProps> = ({ selectedNode, onClose, onSaveNodeData }) => {
  if (!selectedNode) {
    return (
      <div className="p-4 h-full bg-gray-50">
        <div className="text-gray-500 text-center">No node selected</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <div className="p-3 bg-gray-50 rounded-md border">
              {selectedNode.data.label}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Node ID
            </label>
            <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600">
              {selectedNode.id}
            </div>
          </div>
          
          {selectedNode.data.metadata && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metadata
              </label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(selectedNode.data.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <Button 
          className="w-full" 
          onClick={() => {
            // Placeholder for edit functionality
            console.log('Edit button clicked for node:', selectedNode.id);
          }}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Node
        </Button>
      </div>
    </div>
  );
};

export default ContentView; 