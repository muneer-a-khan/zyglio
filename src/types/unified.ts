// Unified Types for Zyglio + Objects-Scenarios Platform

// ============================================================================
// SMART OBJECTS SYSTEM (from Objects-Scenarios)
// ============================================================================

export interface SmartObject {
  id: string;
  name: string;
  category: 'Ingredient' | 'Tool' | 'Equipment' | 'Person' | 'Location';
  description?: string;
  attributes: Record<string, any>;
  states: string[];
  behaviors: string[];
  signals: string[];
  currentState?: string;
  taskId?: string; // Link to learning task
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScenarioStep {
  id: string;
  instruction: string;
  requiredObjects: string[]; // SmartObject IDs
  requiredActions: string[];
  conditions: string[];
  feedback: string;
  position: { x: number; y: number };
  stepIndex: number;
  isCheckpoint?: boolean;
  expectedResponses?: string[];
  voiceRecordingUrl?: string; // Integration with Zyglio voice system
  transcript?: string; // Integration with Zyglio transcription
  procedureId?: string; // Link to procedure
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Trigger {
  id: string;
  objectId: string; // SmartObject ID
  signal: string;
  condition: string;
  action: string;
  scenarioId?: string; // Link to scenario/procedure
  isActive?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  category?: 'INTERACTION' | 'STATE_CHANGE' | 'TIME_BASED' | 'CONDITION' | 'SYSTEM';
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// ENHANCED LEARNING TASKS (Extended from Zyglio)
// ============================================================================

export interface EnhancedLearningTask {
  id: string;
  title: string;
  description?: string;
  kpiTech?: string;
  kpiConcept?: string;
  presenter: string;
  affiliation?: string;
  date: Date;
  userId: string;
  // Enhanced with Objects-Scenarios integration
  smartObjects?: SmartObject[];
  scenarios?: EnhancedProcedure[];
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// ENHANCED PROCEDURES (Extended from Zyglio)
// ============================================================================

export interface EnhancedProcedure {
  id: string;
  title: string;
  taskId: string;
  simulationSettings?: Record<string, any>;
  // Enhanced with Objects-Scenarios integration
  scenarioSteps?: ScenarioStep[];
  triggers?: Trigger[];
  isScenarioBased?: boolean; // Flag to indicate if this uses scenario building
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// SIMULATION SYSTEM (Enhanced)
// ============================================================================

export interface EnhancedSimulation {
  id: string;
  name: string;
  taskId: string;
  settings: Record<string, any>;
  isVoiceEnabled: boolean;
  // Object-aware simulation features
  involvedObjects: string[]; // SmartObject IDs
  triggerRules: Trigger[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface SimulationSession {
  id: string;
  simulationId: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  performanceData: Record<string, any>;
  // Object interaction tracking
  objectInteractions: ObjectInteraction[];
  createdAt: Date;
}

export interface ObjectInteraction {
  id: string;
  sessionId: string;
  objectId: string;
  action: string;
  timestamp: Date;
  result: 'success' | 'failure' | 'partial';
  feedback?: string;
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

export interface ScenarioBuilderState {
  currentTask: EnhancedLearningTask | null;
  currentScenario: EnhancedProcedure | null;
  objects: SmartObject[];
  scenarioSteps: ScenarioStep[];
  triggers: Trigger[];
  isPreviewMode: boolean;
  selectedObjects: string[];
  canvasViewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface SmartObjectFormData {
  name: string;
  category: SmartObject['category'];
  attributes: Record<string, any>;
  states: string[];
  behaviors: string[];
  signals: string[];
  currentState?: string;
}

export interface ScenarioStepFormData {
  instruction: string;
  requiredObjects: string[];
  requiredActions: string[];
  conditions: string[];
  feedback: string;
  isCheckpoint: boolean;
  expectedResponses: string[];
}

export interface TriggerFormData {
  objectId: string;
  signal: string;
  condition: string;
  action: string;
  isActive: boolean;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface ObjectDefinitionPanelProps {
  onAddObject: (object: SmartObject) => void;
  objects?: SmartObject[];
  currentTaskId?: string;
}

export interface ObjectLibraryProps {
  objects: SmartObject[];
  onUpdateObject: (id: string, updates: Partial<SmartObject>) => void;
  onDeleteObject: (id: string) => void;
  onSelectObject?: (id: string) => void;
  selectedObjects?: string[];
}

export interface ScenarioFlowBuilderProps {
  objects: SmartObject[];
  scenarioSteps: ScenarioStep[];
  onAddStep: (step: ScenarioStep) => void;
  onUpdateStep: (id: string, updates: Partial<ScenarioStep>) => void;
  onDeleteStep?: (id: string) => void;
  currentProcedureId?: string;
}

export interface TriggerLogicEditorProps {
  objects: SmartObject[];
  triggers: Trigger[];
  onAddTrigger: (trigger: Trigger) => void;
  onUpdateTrigger?: (id: string, updates: Partial<Trigger>) => void;
  onDeleteTrigger?: (id: string) => void;
  currentScenarioId?: string;
}

export interface PreviewModeProps {
  objects: SmartObject[];
  scenarioSteps: ScenarioStep[];
  triggers: Trigger[];
  onObjectInteraction?: (interaction: ObjectInteraction) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ObjectCategory = SmartObject['category'];
export type TriggerCondition = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
export type ActionType = 'change_state' | 'emit_signal' | 'show_feedback' | 'complete_step' | 'fail_step';

// ============================================================================
// CONSTANTS
// ============================================================================

export const OBJECT_CATEGORIES: ObjectCategory[] = [
  'Ingredient',
  'Tool', 
  'Equipment',
  'Person',
  'Location'
];

export const TRIGGER_CONDITIONS: TriggerCondition[] = [
  'equals',
  'not_equals', 
  'contains',
  'greater_than',
  'less_than',
  'exists',
  'not_exists'
];

export const ACTION_TYPES: ActionType[] = [
  'change_state',
  'emit_signal',
  'show_feedback',
  'complete_step',
  'fail_step'
]; 