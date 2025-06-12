// Core simulation object types
export interface SimulationObject {
  id: string;
  name: string;
  type: "equipment" | "material" | "environment" | "person" | "document";
  description: string;
  properties: Record<string, any>;
  interactions: string[];
  mediaUrl?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Scenario types
export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDuration: number; // in minutes
  objects: string[]; // Object IDs required for this scenario
  triggers: string[]; // Trigger IDs that activate in this scenario
  conditions: ScenarioCondition[];
  outcomes: ScenarioOutcome[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioCondition {
  id: string;
  type: "time" | "action" | "response" | "object_state" | "location";
  description: string;
  criteria: Record<string, any>;
  operator: "equals" | "greater_than" | "less_than" | "contains" | "exists";
  value: any;
}

export interface ScenarioOutcome {
  id: string;
  type: "success" | "failure" | "warning" | "information";
  title: string;
  description: string;
  score?: number;
  feedback: string;
  nextAction?: string;
}

// Trigger types
export interface SimulationTrigger {
  id: string;
  name: string;
  description: string;
  type: "event" | "condition" | "timer" | "user_action" | "system_state";
  event: TriggerEvent;
  conditions: TriggerCondition[];
  actions: TriggerAction[];
  priority: "low" | "medium" | "high" | "critical";
  isActive: boolean;
  cooldown?: number; // seconds before trigger can fire again
  maxActivations?: number; // maximum times this trigger can fire
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerEvent {
  type: "step_start" | "step_complete" | "timer_elapsed" | "object_interaction" | "voice_command" | "text_input";
  target?: string; // Target object, step, or element ID
  parameters: Record<string, any>;
}

export interface TriggerCondition {
  id: string;
  type: "object_state" | "user_progress" | "time_elapsed" | "score_threshold" | "custom";
  description: string;
  logic: "AND" | "OR" | "NOT";
  criteria: Record<string, any>;
}

export interface TriggerAction {
  id: string;
  type: "show_message" | "play_audio" | "highlight_object" | "change_state" | "branch_step" | "end_simulation";
  description: string;
  parameters: Record<string, any>;
  delay?: number; // milliseconds to wait before executing
}

// Extended simulation settings to include new features
export interface EnhancedSimulationSettings {
  // Existing settings
  enabled: boolean;
  mode: "guided" | "freeform" | "scenario_based";
  timeLimit?: number;
  allowRetries: boolean;
  maxRetries?: number;
  showHints: boolean;
  requireMediaConfirmation: boolean;
  feedbackDelay: number;
  difficulty: "easy" | "medium" | "hard";
  name?: string;
  enableVoiceInput?: boolean;
  enableTextInput?: boolean;
  feedbackLevel?: string;
  enableScoring?: boolean;
  steps?: any[];
  
  // New features
  objects: SimulationObject[];
  scenarios: SimulationScenario[];
  triggers: SimulationTrigger[];
  activeScenarioId?: string;
  enableObjectInteractions: boolean;
  enableDynamicScenarios: boolean;
  enableAdvancedTriggers: boolean;
  environmentType: "laboratory" | "clinical" | "field" | "virtual" | "hybrid";
  realtimeMonitoring: boolean;
  adaptiveDifficulty: boolean;
}

// Simulation runtime state
export interface SimulationState {
  id: string;
  sessionId: string;
  currentStepId: string;
  activeObjects: Record<string, any>; // Object ID -> current state
  activeTriggers: string[]; // Active trigger IDs
  scenarioProgress: Record<string, number>; // Scenario ID -> progress percentage
  userActions: SimulationAction[];
  startTime: Date;
  currentTime: Date;
  score: number;
  feedback: string[];
  isComplete: boolean;
  isPaused: boolean;
}

export interface SimulationAction {
  id: string;
  type: "step_advance" | "object_interact" | "voice_input" | "text_input" | "trigger_fire";
  timestamp: Date;
  data: Record<string, any>;
  result?: string;
  score?: number;
}

// Template types for easy scenario creation
export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  category: "medical" | "technical" | "safety" | "emergency" | "training";
  defaultObjects: Partial<SimulationObject>[];
  defaultTriggers: Partial<SimulationTrigger>[];
  templateSteps: any[];
  estimatedSetupTime: number; // minutes
} 