import { 
  SimulationTrigger, 
  TriggerEvent, 
  TriggerAction, 
  SimulationState 
} from '@/types/simulation';

export class TriggerHandlerService {
  private state: SimulationState | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Sets the current simulation state
   */
  setState(state: SimulationState) {
    this.state = state;
  }
  
  /**
   * Sets up a trigger listener
   */
  setupTriggerListener(trigger: SimulationTrigger): void {
    // Set up different listener types based on trigger event
    if (trigger.event.type === 'object_interaction') {
      this.on('object:interaction', (eventData: any) => {
        if (eventData.objectId === trigger.event.parameters.objectId) {
          this.evaluateTrigger(trigger, eventData);
        }
      });
    } else if (trigger.event.type === 'step_start') {
      this.on('step:start', (eventData: any) => {
        this.evaluateTrigger(trigger, eventData);
      });
    } else if (trigger.event.type === 'timer') {
      // Set timer based on parameters
      const timeout = setTimeout(() => {
        this.evaluateTrigger(trigger, {});
      }, (trigger.event.parameters.seconds || 10) * 1000);
      
      this.activeTimers.set(trigger.id, timeout);
    }
  }
  
  /**
   * Evaluates a trigger and its conditions
   */
  async evaluateTrigger(trigger: SimulationTrigger, eventData: any): Promise<void> {
    // Skip if simulation is not active or state is missing
    if (!this.state) return;
    
    // Check if trigger conditions are met
    const conditionsMet = await this.evaluateTriggerConditions(trigger, eventData);
    
    if (conditionsMet) {
      // Execute actions if conditions are met
      await this.executeTriggerActions(trigger);
      
      // Emit event for trigger activation
      this.emit('trigger:activated', { 
        triggerId: trigger.id, 
        triggerName: trigger.name 
      });
    }
  }
  
  /**
   * Evaluates all conditions for a trigger
   */
  async evaluateTriggerConditions(trigger: SimulationTrigger, eventData: any): Promise<boolean> {
    // If no conditions, trigger is always valid
    if (!trigger.conditions || trigger.conditions.length === 0) {
      return true;
    }
    
    // All conditions must be met (AND logic)
    for (const condition of trigger.conditions) {
      const conditionMet = await this.evaluateCondition(condition, eventData);
      if (!conditionMet) return false; // If any condition fails, return false
    }
    
    return true;
  }
  
  /**
   * Evaluates a single condition
   */
  async evaluateCondition(condition: any, eventData: any): Promise<boolean> {
    switch (condition.type) {
      case 'object_state':
        return this.evaluateObjectStateCondition(condition);
      case 'progress':
        return this.evaluateProgressCondition(condition);
      case 'time':
        return this.evaluateTimeCondition(condition);
      case 'score':
        return this.evaluateScoreCondition(condition);
      default:
        return true;
    }
  }
  
  /**
   * Evaluates an object state condition
   */
  private evaluateObjectStateCondition(condition: any): boolean {
    if (!this.state) return false;
    
    const object = this.state.activeObjects[condition.objectId];
    if (!object) return false;
    
    // Check property value using condition operator
    const propertyValue = object[condition.property];
    const targetValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return propertyValue === targetValue;
      case 'not_equals':
        return propertyValue !== targetValue;
      case 'greater_than':
        return propertyValue > targetValue;
      case 'less_than':
        return propertyValue < targetValue;
      case 'contains':
        return String(propertyValue).includes(String(targetValue));
      default:
        return false;
    }
  }
  
  /**
   * Evaluates a progress condition
   */
  private evaluateProgressCondition(condition: any): boolean {
    if (!this.state || !condition.scenarioId) return false;
    
    const progress = this.state.scenarioProgress[condition.scenarioId] || 0;
    const targetProgress = condition.progress || 0;
    
    return progress >= targetProgress;
  }
  
  /**
   * Evaluates a time condition
   */
  private evaluateTimeCondition(condition: any): boolean {
    if (!this.state) return false;
    
    const elapsedTime = (new Date().getTime() - this.state.startTime.getTime()) / 1000;
    return elapsedTime >= (condition.seconds || 0);
  }
  
  /**
   * Evaluates a score condition
   */
  private evaluateScoreCondition(condition: any): boolean {
    if (!this.state) return false;
    
    return this.state.score >= (condition.score || 0);
  }
  
  /**
   * Executes all actions for a trigger
   */
  async executeTriggerActions(trigger: SimulationTrigger): Promise<void> {
    if (!trigger.actions || !Array.isArray(trigger.actions)) return;
    
    for (const action of trigger.actions) {
      await this.executeAction(action);
    }
  }
  
  /**
   * Executes a single action
   */
  async executeAction(action: TriggerAction): Promise<void> {
    if (!this.state) return;
    
    switch (action.type) {
      case 'change_object_state':
        await this.changeObjectState(action.parameters);
        break;
      case 'branch_to_step':
        await this.branchToStep(action.parameters);
        break;
      case 'end_simulation':
        await this.endSimulation(action.parameters);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
    
    // Emit event for action execution
    this.emit('action:executed', { 
      actionType: action.type, 
      parameters: action.parameters 
    });
  }
  
  /**
   * Changes object state
   */
  private async changeObjectState(parameters: any): Promise<void> {
    if (!this.state || !parameters.objectId) return;
    
    const object = this.state.activeObjects[parameters.objectId];
    if (!object) return;
    
    // Update the object property
    object[parameters.property] = parameters.value;
  }
  
  /**
   * Branches to a different step
   */
  private async branchToStep(parameters: any): Promise<void> {
    if (!this.state || !parameters.stepId) return;
    
    this.state.currentStepId = parameters.stepId;
  }
  
  /**
   * Ends the simulation
   */
  private async endSimulation(parameters: any): Promise<void> {
    if (!this.state) return;
    
    this.state.isComplete = true;
    
    // Clear any active timers
    this.activeTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.activeTimers.clear();
    
    // Include outcome data if provided
    if (parameters.outcome) {
      this.state.outcome = parameters.outcome;
    }
  }
  
  /**
   * Registers an event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }
  
  /**
   * Emits an event
   */
  emit(event: string, data: any): void {
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  /**
   * Clears all active timers
   */
  clearTimers(): void {
    this.activeTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.activeTimers.clear();
  }
} 