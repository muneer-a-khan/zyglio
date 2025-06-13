import { v4 as uuidv4 } from 'uuid';
import {
  SimulationObject,
  SimulationScenario,
  SimulationTrigger,
  EnhancedSimulationSettings,
  SimulationState,
  SimulationAction,
  ScenarioTemplate,
  TriggerEvent,
  TriggerAction
} from '@/types/simulation';

class SimulationEngine {
  private state: SimulationState | null = null;
  private settings: EnhancedSimulationSettings | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  // Initialize simulation with settings
  async initializeSimulation(settings: EnhancedSimulationSettings): Promise<SimulationState> {
    this.settings = settings;
    
    this.state = {
      id: uuidv4(),
      sessionId: uuidv4(),
      currentStepId: settings.steps?.[0]?.id || '',
      activeObjects: this.initializeObjects(settings.objects),
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

    // Setup initial triggers
    this.setupTriggers();

    return this.state;
  }

  // Object Management
  private initializeObjects(objects: SimulationObject[]): Record<string, any> {
    const activeObjects: Record<string, any> = {};
    
    objects.forEach(obj => {
      activeObjects[obj.id] = {
        ...obj.properties,
        _meta: {
          id: obj.id,
          name: obj.name,
          type: obj.type,
          isVisible: true,
          isInteractable: true,
          lastInteraction: null
        }
      };
    });

    return activeObjects;
  }

  async createObject(objectData: Partial<SimulationObject>): Promise<SimulationObject> {
    const newObject: SimulationObject = {
      id: uuidv4(),
      name: objectData.name || 'Unnamed Object',
      type: objectData.type || 'equipment',
      description: objectData.description || '',
      properties: objectData.properties || {},
      interactions: objectData.interactions || [],
      mediaUrl: objectData.mediaUrl,
      tags: objectData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.settings) {
      this.settings.objects.push(newObject);
    }

    return newObject;
  }

  async updateObject(objectId: string, updates: Partial<SimulationObject>): Promise<SimulationObject | null> {
    if (!this.settings) return null;

    const objectIndex = this.settings.objects.findIndex(obj => obj.id === objectId);
    if (objectIndex === -1) return null;

    this.settings.objects[objectIndex] = {
      ...this.settings.objects[objectIndex],
      ...updates,
      updatedAt: new Date()
    };

    return this.settings.objects[objectIndex];
  }

  async deleteObject(objectId: string): Promise<boolean> {
    if (!this.settings) return false;

    const objectIndex = this.settings.objects.findIndex(obj => obj.id === objectId);
    if (objectIndex === -1) return false;

    this.settings.objects.splice(objectIndex, 1);

    // Remove object from active objects if simulation is running
    if (this.state && this.state.activeObjects[objectId]) {
      delete this.state.activeObjects[objectId];
    }

    return true;
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

  // Trigger Management
  async createTrigger(triggerData: Partial<SimulationTrigger>): Promise<SimulationTrigger> {
    const newTrigger: SimulationTrigger = {
      id: uuidv4(),
      name: triggerData.name || 'New Trigger',
      description: triggerData.description || '',
      type: triggerData.type || 'event',
      event: triggerData.event || { type: 'step_start', parameters: {} },
      conditions: triggerData.conditions || [],
      actions: triggerData.actions || [],
      priority: triggerData.priority || 'medium',
      isActive: triggerData.isActive ?? true,
      cooldown: triggerData.cooldown,
      maxActivations: triggerData.maxActivations,
      tags: triggerData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.settings) {
      this.settings.triggers.push(newTrigger);
    }

    return newTrigger;
  }

  private setupTriggers(): void {
    if (!this.settings || !this.state) return;

    this.settings.triggers.forEach(trigger => {
      if (trigger.isActive && this.state!.activeTriggers.includes(trigger.id)) {
        this.setupTriggerListener(trigger);
      }
    });
  }

  private setupTriggerListener(trigger: SimulationTrigger): void {
    const eventType = trigger.event.type;
    
    this.on(eventType, (eventData: any) => {
      this.evaluateTrigger(trigger, eventData);
    });

    // Setup timer-based triggers
    if (trigger.type === 'timer' && trigger.event.parameters.interval) {
      const interval = parseInt(trigger.event.parameters.interval) * 1000; // Convert to ms
      const timer = setInterval(() => {
        this.evaluateTrigger(trigger, { type: 'timer_elapsed' });
      }, interval);
      
      this.activeTimers.set(trigger.id, timer);
    }
  }

  private async evaluateTrigger(trigger: SimulationTrigger, eventData: any): Promise<void> {
    if (!this.state) return;

    // Check cooldown
    const lastActivation = this.state.userActions
      .filter(action => action.type === 'trigger_fire' && action.data.triggerId === trigger.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (lastActivation && trigger.cooldown) {
      const timeSinceLastActivation = (Date.now() - lastActivation.timestamp.getTime()) / 1000;
      if (timeSinceLastActivation < trigger.cooldown) {
        return;
      }
    }

    // Check max activations
    if (trigger.maxActivations) {
      const activationCount = this.state.userActions
        .filter(action => action.type === 'trigger_fire' && action.data.triggerId === trigger.id)
        .length;
      
      if (activationCount >= trigger.maxActivations) {
        return;
      }
    }

    // Evaluate conditions
    const conditionsMet = await this.evaluateTriggerConditions(trigger, eventData);
    if (!conditionsMet) return;

    // Execute trigger actions
    await this.executeTriggerActions(trigger);

    // Record trigger activation
    this.recordAction({
      type: 'trigger_fire',
      data: { triggerId: trigger.id, eventData }
    });

    this.emit('trigger:fired', { trigger, eventData });
  }

  private async evaluateTriggerConditions(trigger: SimulationTrigger, eventData: any): Promise<boolean> {
    if (trigger.conditions.length === 0) return true;

    // Simple condition evaluation - can be expanded for complex logic
    for (const condition of trigger.conditions) {
      const conditionMet = await this.evaluateCondition(condition, eventData);
      
      // For now, all conditions must be met (AND logic)
      if (!conditionMet) return false;
    }

    return true;
  }

  private async evaluateCondition(condition: any, eventData: any): Promise<boolean> {
    switch (condition.type) {
      case 'object_state':
        return this.evaluateObjectStateCondition(condition);
      case 'user_progress':
        return this.evaluateProgressCondition(condition);
      case 'time_elapsed':
        return this.evaluateTimeCondition(condition);
      case 'score_threshold':
        return this.evaluateScoreCondition(condition);
      default:
        return true;
    }
  }

  private evaluateObjectStateCondition(condition: any): boolean {
    if (!this.state) return false;
    
    const objectId = condition.criteria.objectId;
    const property = condition.criteria.property;
    const expectedValue = condition.criteria.value;
    
    const objectState = this.state.activeObjects[objectId];
    if (!objectState) return false;
    
    const actualValue = objectState[property];
    
    switch (condition.criteria.operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'greater_than':
        return actualValue > expectedValue;
      case 'less_than':
        return actualValue < expectedValue;
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      default:
        return false;
    }
  }

  private evaluateProgressCondition(condition: any): boolean {
    if (!this.state) return false;
    
    const scenarioId = condition.criteria.scenarioId;
    const threshold = condition.criteria.threshold;
    
    const progress = this.state.scenarioProgress[scenarioId] || 0;
    return progress >= threshold;
  }

  private evaluateTimeCondition(condition: any): boolean {
    if (!this.state) return false;
    
    const elapsedTime = (Date.now() - this.state.startTime.getTime()) / 1000;
    const threshold = condition.criteria.seconds;
    
    return elapsedTime >= threshold;
  }

  private evaluateScoreCondition(condition: any): boolean {
    if (!this.state) return false;
    
    const threshold = condition.criteria.threshold;
    return this.state.score >= threshold;
  }

  private async executeTriggerActions(trigger: SimulationTrigger): Promise<void> {
    for (const action of trigger.actions) {
      if (action.delay) {
        setTimeout(() => this.executeAction(action), action.delay);
      } else {
        await this.executeAction(action);
      }
    }
  }

  private async executeAction(action: TriggerAction): Promise<void> {
    switch (action.type) {
      case 'show_message':
        this.emit('action:message', action.parameters);
        break;
      case 'play_audio':
        this.emit('action:audio', action.parameters);
        break;
      case 'highlight_object':
        this.emit('action:highlight', action.parameters);
        break;
      case 'change_state':
        await this.changeObjectState(action.parameters);
        break;
      case 'branch_step':
        await this.branchToStep(action.parameters);
        break;
      case 'end_simulation':
        await this.endSimulation(action.parameters);
        break;
    }
  }

  private async changeObjectState(parameters: any): Promise<void> {
    if (!this.state) return;
    
    const { objectId, property, value } = parameters;
    if (this.state.activeObjects[objectId]) {
      this.state.activeObjects[objectId][property] = value;
      this.emit('object:state_changed', { objectId, property, value });
    }
  }

  private async branchToStep(parameters: any): Promise<void> {
    if (!this.state) return;
    
    const { stepId } = parameters;
    this.state.currentStepId = stepId;
    this.emit('simulation:step_changed', { stepId });
  }

  private async endSimulation(parameters: any): Promise<void> {
    if (!this.state) return;
    
    this.state.isComplete = true;
    this.state.currentTime = new Date();
    
    // Clear all timers
    this.activeTimers.forEach(timer => clearInterval(timer));
    this.activeTimers.clear();
    
    this.emit('simulation:ended', { reason: parameters.reason || 'trigger_action' });
  }

  // Utility methods
  async interactWithObject(objectId: string, interaction: string, data?: any): Promise<void> {
    if (!this.state) return;

    const objectState = this.state.activeObjects[objectId];
    if (!objectState || !objectState._meta.isInteractable) return;

    // Update last interaction
    objectState._meta.lastInteraction = new Date();

    // Record the interaction
    this.recordAction({
      type: 'object_interact',
      data: { objectId, interaction, ...data }
    });

    // Emit interaction event for triggers
    this.emit('object_interaction', { objectId, interaction, data });
  }

  async advanceStep(stepId?: string): Promise<void> {
    if (!this.state) return;

    const newStepId = stepId || this.getNextStepId();
    if (newStepId) {
      this.state.currentStepId = newStepId;
      this.recordAction({
        type: 'step_advance',
        data: { fromStep: this.state.currentStepId, toStep: newStepId }
      });

      this.emit('step_start', { stepId: newStepId });
    }
  }

  private getNextStepId(): string | null {
    if (!this.settings || !this.state) return null;
    
    const currentIndex = this.settings.steps?.findIndex(step => step.id === this.state!.currentStepId) || -1;
    const nextStep = this.settings.steps?.[currentIndex + 1];
    
    return nextStep?.id || null;
  }

  private recordAction(actionData: Partial<SimulationAction>): void {
    if (!this.state) return;

    const action: SimulationAction = {
      id: uuidv4(),
      type: actionData.type || 'step_advance',
      timestamp: new Date(),
      data: actionData.data || {},
      result: actionData.result,
      score: actionData.score
    };

    this.state.userActions.push(action);
  }

  // Event system
  private on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Template management
  async createScenarioFromTemplate(template: ScenarioTemplate): Promise<SimulationScenario> {
    const objects = await Promise.all(
      template.defaultObjects.map(objData => this.createObject(objData))
    );

    const triggers = await Promise.all(
      template.defaultTriggers.map(triggerData => this.createTrigger(triggerData))
    );

    return this.createScenario({
      name: template.name,
      description: template.description,
      objects: objects.map(obj => obj.id),
      triggers: triggers.map(trigger => trigger.id),
      difficulty: 'beginner'
    });
  }

  // State management
  getState(): SimulationState | null {
    return this.state;
  }

  getSettings(): EnhancedSimulationSettings | null {
    return this.settings;
  }

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
    // Clear timers
    this.activeTimers.forEach(timer => clearInterval(timer));
    this.activeTimers.clear();

    // Clear event listeners
    this.eventListeners.clear();

    // Reset state
    if (this.settings) {
      await this.initializeSimulation(this.settings);
    }
  }
}

// Export singleton instance
export const simulationEngine = new SimulationEngine();
export default simulationEngine; 