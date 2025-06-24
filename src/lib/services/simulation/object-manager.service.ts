import { v4 as uuidv4 } from 'uuid';
import { 
  SimulationObject, 
  SimulationState, 
  EnhancedSimulationSettings,
  ObjectInteraction 
} from '@/types/simulation';

export class ObjectManagerService {
  private state: SimulationState | null = null;
  private settings: EnhancedSimulationSettings | null = null;
  private eventEmitter: (event: string, data: any) => void = () => {};
  
  /**
   * Sets the current simulation state and settings
   */
  setContext(state: SimulationState, settings: EnhancedSimulationSettings, emitter: (event: string, data: any) => void) {
    this.state = state;
    this.settings = settings;
    this.eventEmitter = emitter;
  }
  
  /**
   * Initialize simulation objects from settings
   */
  initializeObjects(objects: SimulationObject[]): Record<string, any> {
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

  /**
   * Creates a new object
   */
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

  /**
   * Updates an existing object
   */
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

  /**
   * Deletes an object
   */
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
  
  /**
   * Handles interaction with an object
   */
  async interactWithObject(objectId: string, interaction: string, data?: any): Promise<void> {
    if (!this.state || !this.settings) return;
    
    const objectInState = this.state.activeObjects[objectId];
    if (!objectInState) return;
    
    // Find the object definition
    const objectDef = this.settings.objects.find(obj => obj.id === objectId);
    if (!objectDef) return;
    
    // Find the specific interaction
    const interactionDef = objectDef.interactions.find(i => i.name === interaction);
    if (!interactionDef) return;
    
    // Update the object state based on interaction effects
    if (interactionDef.effects) {
      interactionDef.effects.forEach(effect => {
        objectInState[effect.property] = effect.value;
      });
    }
    
    // Record interaction in metadata
    objectInState._meta.lastInteraction = {
      type: interaction,
      timestamp: new Date(),
      data
    };
    
    // Emit an event for the interaction
    this.eventEmitter('object:interaction', { 
      objectId, 
      interaction, 
      data,
      timestamp: new Date()
    });
    
    // Record action in simulation state
    if (this.state) {
      this.state.userActions.push({
        id: uuidv4(),
        type: 'object_interaction',
        targetId: objectId,
        action: interaction,
        data,
        timestamp: new Date(),
        success: true
      });
    }
  }
} 