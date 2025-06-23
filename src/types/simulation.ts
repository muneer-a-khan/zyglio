import { SmartObject, ScenarioStep, Trigger } from './unified';

// Extend the base types with simulation-specific properties
export interface SimulationObject extends SmartObject {
  templateId?: string;
  templateVersion?: string;
  mediaUrl?: string;
  simulationTags?: string[]; // Renamed to avoid conflict with base type
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
  simulationTags?: string[]; // Renamed to avoid conflict with base type
  hints?: string[];
  timeLimit?: number;
  conditions: string[]; // Keep as string[] to match base type
  simulationConditions?: SimulationCondition[]; // Add detailed conditions as a separate property
}

export interface SimulationTrigger extends Trigger {
  simulationTags?: string[]; // Renamed to avoid conflict with base type
  cooldown?: number;
  maxActivations?: number;
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

export interface GeneratedSimulationElements {
  objects: SimulationObject[];
  scenarios: SimulationScenario[];
  triggers: SimulationTrigger[];
}

// Remove all duplicate type definitions below this line
// ... existing code ... 