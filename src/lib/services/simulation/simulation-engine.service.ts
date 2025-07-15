import { v4 as uuidv4 } from 'uuid';
import {
  SimulationScenario,
  SimulationObject,
  SimulationTrigger,
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
      currentStep: 0,
      currentStepId: settings.steps?.[0]?.id || '',
      totalSteps: settings.steps?.length || 0,
      score: 0,
      isActive: true,
      isComplete: false,
      isPaused: false,
      startTime: new Date(),
      currentTime: new Date(),
      endTime: undefined,
      feedback: [],
      objects: settings.objects.reduce((acc: Record<string, any>, obj: any) => {
        acc[obj.id] = obj;
        return acc;
      }, {}),
      activeObjects: this.objectManager.initializeObjects(settings.objects),
      scenarios: settings.scenarios,
      triggers: settings.triggers,
      activeTriggers: settings.triggers.filter(t => t.isActive).map(t => t.id),
      completedSteps: [],
      scenarioProgress: {},
      userActions: [],
      interactions: []
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
      instruction: scenarioData.instruction || 'Complete the scenario',
      requiredObjects: scenarioData.requiredObjects || [],
      requiredActions: scenarioData.requiredActions || [],
      conditions: scenarioData.conditions || [],
      feedback: scenarioData.feedback || 'Scenario completed',
      position: scenarioData.position || { x: 0, y: 0 },
      stepIndex: scenarioData.stepIndex || 0,
      name: scenarioData.name || 'New Scenario',
      description: scenarioData.description || '',
      objectives: scenarioData.objectives || [],
      difficulty: scenarioData.difficulty || 'beginner',
      estimatedDuration: scenarioData.estimatedDuration || 30,
      objects: scenarioData.objects || [],
      triggers: scenarioData.triggers || [],
      outcomes: scenarioData.outcomes || [],
      simulationTags: scenarioData.simulationTags || [],
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
    scenario.triggers?.forEach(triggerId => {
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

  // Object management methods delegated to ObjectManager
  async createObject(objectData: Partial<SimulationObject>): Promise<SimulationObject> {
    return await this.objectManager.createObject(objectData);
  }

  async updateObject(objectId: string, updates: Partial<SimulationObject>): Promise<SimulationObject | null> {
    return await this.objectManager.updateObject(objectId, updates);
  }

  async deleteObject(objectId: string): Promise<boolean> {
    return await this.objectManager.deleteObject(objectId);
  }

  // Trigger management methods
  async createTrigger(triggerData: Partial<SimulationTrigger>): Promise<SimulationTrigger> {
    const newTrigger: SimulationTrigger = {
      id: uuidv4(),
      objectId: triggerData.objectId || '',
      signal: triggerData.signal || '',
      condition: triggerData.condition || '',
      action: triggerData.action || '',
      type: triggerData.type || 'event',
      priority: triggerData.priority || 'medium',
      isActive: triggerData.isActive ?? true,
      cooldown: triggerData.cooldown || 0,
      maxActivations: triggerData.maxActivations || -1,
      simulationTags: triggerData.simulationTags || [],
      createdAt: new Date(),
      ...triggerData
    };

    if (this.settings) {
      this.settings.triggers.push(newTrigger);
    }

    return newTrigger;
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
      instruction: template.template?.instruction || 'Complete the scenario',
      requiredObjects: template.template?.requiredObjects || [],
      requiredActions: template.template?.requiredActions || [],
      conditions: template.template?.conditions || [],
      feedback: template.template?.feedback || 'Scenario completed',
      position: template.template?.position || { x: 0, y: 0 },
      stepIndex: template.template?.stepIndex || 0,
      name: template.name,
      description: template.description,
      objectives: template.template?.objectives || [],
      difficulty: template.template?.difficulty || 'beginner',
      estimatedDuration: template.template?.estimatedDuration || 30,
      objects: [],
      triggers: [],
      outcomes: template.template?.outcomes || [],
      simulationTags: template.template?.simulationTags || [],
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