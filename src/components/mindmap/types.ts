import { Node, Edge } from 'reactflow';

export interface Content {
  type: 'text' | 'image' | 'video' | 'llm';
  data: string;
  title?: string;
  metadata?: Record<string, string>;
}

export interface DecisionOption {
  label: string;
  description: string;
  nodeId?: string;
  features?: string[];  // List of features instead of benefits
}

export interface MindMapNodeData {
  id?: string;
  label: string;
  depth: number;
  expanded?: boolean;
  hasChildren?: boolean;
  isDecision?: boolean;
  decisionText?: string;
  decisionOptions?: DecisionOption[];
  content?: Content;
  metadata?: Record<string, string>;
  onToggleExpand?: () => void;
  onNodeClick?: () => void;
  onEditNode?: () => void;
  [key: string]: unknown;
}

export interface MindMapProps {
  nodes: Node[];
  edges: Edge[];
  onSaveNodeData?: (nodeId: string, updatedData: Partial<MindMapNodeData>) => void;
} 