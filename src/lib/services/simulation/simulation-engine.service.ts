import { v4 as uuidv4 } from 'uuid';
import {
  SimulationScenario,
  EnhancedSimulationSettings,
  SimulationState,
  SimulationAction,
  ScenarioTemplate
} from '@/types/simulation';
import { TriggerHandlerService } from './trigger-handler.service';
import { ObjectManagerService } from './object-manager.service';

export class SimulationEngineService {
  private state: SimulationState | null = null;
  private settings: EnhancedSimulationSettings | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  
  private triggerHandler: TriggerHandlerService;
  private objectManager: ObjectManagerService;

  constructor() {
    this.triggerHandler = new TriggerHandlerService();
    this.objectManager = new ObjectManagerService();
  }

  // Initialize simulation with settings
  async initializeSimulation(settings: EnhancedSimulationSettings): Promise<SimulationState> {
    this.settings = settings;
    
    this.state = {
      id: uuidv4(),
      sessionId: uuidv4(),
      currentStepId: settings.steps?.[0]?.id || '',
      activeObjects: this.objectManager.initializeObjects(settings.objects),
      activeTriggers: settings.triggers.filter(t => t.isActive).map(t => t.id),
      scenarioProgress: {},
      userActions: [],
      startTime: new Date(),
      currentTime: new Date(),
      score: 0,
      feedback: [],
      isComplete: false,
      isPaused: false
    };

    // Initialize scenario progress
    settings.scenarios.forEach(scenario => {
      this.state!.scenarioProgress[scenario.id] = 0;
    });
    
    // Set up context for services
    this.objectManager.setContext(this.state, settings, this.emit.bind(this));
    this.triggerHandler.setState(this.state);
    
    // Setup initial triggers
    this.setupTriggers();

    return this.state;
  }

  // Setup triggers using the trigger handler
  private setupTriggers(): void {
    if (!this.settings || !this.state) return;

    this.settings.triggers.forEach(trigger => {
      if (trigger.isActive && this.state!.activeTriggers.includes(trigger.id)) {
        this.triggerHandler.setupTriggerListener(trigger);
      }
    });
  }

  // Scenario Management
  async createScenario(scenarioData: Partial<SimulationScenario>): Promise<SimulationScenario> {
    const newScenario: SimulationScenario = {
      id: uuidv4(),
      name: scenarioData.name || 'New Scenario',
      description: scenarioData.description || '',
      objectives: scenarioData.objectives || [],
      difficulty: scenarioData.difficulty || 'beginner',
      estimatedDuration: scenarioData.estimatedDuration || 30,
      objects: scenarioData.objects || [],
      triggers: scenarioData.triggers || [],
      conditions: scenarioData.conditions || [],
      outcomes: scenarioData.outcomes || [],
      tags: scenarioData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.settings) {
      this.settings.scenarios.push(newScenario);
    }

    return newScenario;
  }

  // Activate a scenario
  async activateScenario(scenarioId: string): Promise<boolean> {
    if (!this.settings || !this.state) return false;

    const scenario = this.settings.scenarios.find(s => s.id === scenarioId);
    if (!scenario) return false;

    this.settings.activeScenarioId = scenarioId;
    this.state.scenarioProgress[scenarioId] = 0;

    // Activate scenario-specific triggers
    scenario.triggers.forEach(triggerId => {
      if (!this.state!.activeTriggers.includes(triggerId)) {
        this.state!.activeTriggers.push(triggerId);
      }
    });

    this.emit('scenario:activated', { scenarioId, scenario });
    return true;
  }

  // Object interaction delegated to ObjectManager
  async interactWithObject(objectId: string, interaction: string, data?: any): Promise<void> {
    await this.objectManager.interactWithObject(objectId, interaction, data);
  }

  // Step progression
  async advanceStep(stepId?: string): Promise<void> {
    if (!this.state || !this.settings) return;
    
    // Use provided stepId or find the next step
    const nextStepId = stepId || this.getNextStepId();
    if (!nextStepId) return;
    
    const currentStepId = this.state.currentStepId;
    this.state.currentStepId = nextStepId;
    
    // Record step advancement action
    this.recordAction({
      type: 'step_advance',
      targetId: nextStepId,
      data: { previousStep: currentStepId },
      success: true
    });
    
    // Emit step change event
    this.emit('step:change', { 
      previousStepId: currentStepId,
      newStepId: nextStepId
    });
    
    // Emit step start event (for triggers)
    this.emit('step:start', { stepId: nextStepId });
  }

  // Find next step ID in sequence
  private getNextStepId(): string | null {
    if (!this.state || !this.settings || !this.settings.steps) return null;
    
    const currentIndex = this.settings.steps.findIndex(s => s.id === this.state!.currentStepId);
    if (currentIndex === -1 || currentIndex === this.settings.steps.length - 1) return null;
    
    return this.settings.steps[currentIndex + 1].id;
  }

  // Record action in state
  private recordAction(actionData: Partial<SimulationAction>): void {
    if (!this.state) return;
    
    this.state.userActions.push({
      id: uuidv4(),
      timestamp: new Date(),
      ...actionData
    } as SimulationAction);
    
    // Update current time
    this.state.currentTime = new Date();
  }

  // Event system
  private on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }
  
  private emit(event: string, data: any): void {
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Create a scenario from template
  async createScenarioFromTemplate(template: ScenarioTemplate): Promise<SimulationScenario> {
    const newScenario: SimulationScenario = {
      id: uuidv4(),
      name: template.name,
      description: template.description,
      objectives: template.objectives,
      difficulty: template.difficulty,
      estimatedDuration: template.estimatedDuration,
      objects: [],
      triggers: [],
      conditions: template.conditions || [],
      outcomes: template.outcomes || [],
      tags: template.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return newScenario;
  }

  // Getters
  getState(): SimulationState | null {
    return this.state;
  }
  
  getSettings(): EnhancedSimulationSettings | null {
    return this.settings;
  }
  
  // Simulation control
  async pauseSimulation(): Promise<void> {
    if (this.state) {
      this.state.isPaused = true;
      this.emit('simulation:paused', {});
    }
  }
  
  async resumeSimulation(): Promise<void> {
    if (this.state) {
      this.state.isPaused = false;
      this.emit('simulation:resumed', {});
    }
  }
  
  async resetSimulation(): Promise<void> {
    if (!this.settings) return;
    
    // Clean up before reset
    this.triggerHandler.clearTimers();
    
    // Re-initialize with the same settings
    await this.initializeSimulation(this.settings);
    this.emit('simulation:reset', {});
  }
}

export const simulationEngine = new SimulationEngineService(); 