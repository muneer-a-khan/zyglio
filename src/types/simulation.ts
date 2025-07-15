import { SmartObject, ScenarioStep, Trigger } from './unified';

// Extend the base types with simulation-specific properties
export interface SimulationObject extends SmartObject {
  templateId?: string;
  templateVersion?: string;
  mediaUrl?: string;
  simulationTags?: string[]; // Renamed to avoid conflict with base type
  interactions?: Array<{
    name: string;
    type: string;
    effects?: Array<{
      property: string;
      value: any;
    }>;
    description?: string;
  }>;
}

// Define the condition type for simulation scenarios
export interface SimulationCondition {
  id: string;
  type: 'time' | 'action' | 'response' | 'object_state' | 'location';
  description: string;
  criteria: Record<string, any>;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
}

// Extend ScenarioStep with simulation-specific properties
export interface SimulationScenario extends Omit<ScenarioStep, 'conditions'> {
  name?: string; // Optional name property
  description?: string; // Optional description property
  estimatedDuration?: number; // Optional estimated duration in minutes
  objectives?: string[]; // Optional objectives array
  outcomes?: ScenarioOutcome[]; // Optional outcomes array
  objects?: string[]; // Optional objects array
  tags?: string[]; // Optional tags array
  triggers?: string[]; // Optional triggers array
  simulationTags?: string[]; // Renamed to avoid conflict with base type
  hints?: string[];
  timeLimit?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  conditions: string[]; // Keep as string[] to match base type
  simulationConditions?: SimulationCondition[]; // Add detailed conditions as a separate property
}

export interface SimulationTrigger extends Trigger {
  name?: string;
  description?: string;
  type?: 'event' | 'time' | 'action' | 'condition';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  event?: {
    type: string;
    target?: string;
    parameters?: Record<string, any>;
  };
  actions?: TriggerAction[];
  simulationTags?: string[]; // Renamed to avoid conflict with base type
  cooldown?: number;
  maxActivations?: number;
  updatedAt?: Date;
}

export interface SimulationSettings {
  enabled: boolean;
  mode: 'guided' | 'freeform';
  timeLimit: number;
  allowRetries: boolean;
  maxRetries: number;
  showHints: boolean;
  requireMediaConfirmation: boolean;
  feedbackDelay: number;
  difficulty: 'easy' | 'medium' | 'hard';
  name: string;
  enableVoiceInput: boolean;
  enableTextInput: boolean;
  feedbackLevel: 'minimal' | 'moderate' | 'detailed';
  enableScoring: boolean;
  steps: Array<{
    id: string;
    content: string;
    isCheckpoint: boolean;
    expectedResponses: string[];
  }>;
  objects: SimulationObject[];
  scenarios: SimulationScenario[];
  triggers: SimulationTrigger[];
}

export interface SimulationState {
  id: string;
  sessionId: string;
  currentStep: number;
  currentStepId: string;
  totalSteps: number;
  score: number;
  isActive: boolean;
  isComplete: boolean;
  isPaused: boolean;
  startTime: Date;
  currentTime: Date;
  endTime?: Date;
  feedback: string[];
  objects: Record<string, SimulationObject>;
  activeObjects: Record<string, any>;
  scenarios: SimulationScenario[];
  triggers: SimulationTrigger[];
  activeTriggers: string[];
  completedSteps: string[];
  scenarioProgress: Record<string, any>;
  userActions: Array<{
    id: string;
    type: string;
    targetId: string;
    action: string;
    timestamp: Date;
    data?: any;
    details?: any;
    success?: boolean;
  }>;
  interactions: Array<{
    timestamp: Date;
    type: string;
    details: any;
  }>;
}

export interface SimulationSession {
  id: string;
  settings: SimulationSettings;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  score?: number;
  feedback?: string[];
  interactions: Array<{
    timestamp: Date;
    type: string;
    details: any;
  }>;
}

export interface ScenarioOutcome {
  id: string;
  description: string;
  type: 'success' | 'failure' | 'partial';
  conditions?: string[];
  feedback?: string;
  score?: number;
}

export interface TriggerAction {
  id: string;
  type: 'show_message' | 'update_object' | 'change_scene' | 'play_sound' | 'play_audio' | 'highlight_object' | 'change_state' | 'branch_step' | 'end_simulation' | 'custom';
  description: string;
  parameters?: Record<string, any>;
  delay?: number;
}

export interface TriggerEvent {
  id: string;
  type: string;
  target?: string;
  parameters?: Record<string, any>;
  timestamp?: Date;
}

export interface GeneratedSimulationElements {
  objects: SimulationObject[];
  scenarios: SimulationScenario[];
  triggers: SimulationTrigger[];
}

export interface EnhancedSimulationSettings extends SimulationSettings {
  id?: string;
  title?: string;
  description?: string;
  duration?: number;
  metadata?: Record<string, any>;
  activeScenarioId?: string;
}

export interface SimulationAction {
  id: string;
  type: string;
  action: string;
  targetId: string;
  timestamp: Date;
  details: any;
  data?: any;
  success?: boolean;
}

export interface ObjectInteraction {
  id: string;
  objectId: string;
  userId: string;
  action: string;
  timestamp: Date;
  result: any;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  template: any;
} 