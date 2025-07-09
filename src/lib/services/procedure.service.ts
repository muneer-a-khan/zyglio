import { Step, procedureStepsService } from './procedure-steps.service';
import { MediaItem, mediaItemsService } from './media-items.service';

export interface TaskDefinition {
  name: string;
  description: string;
  kpiTech: string[];
  kpiConcept: string[];
  presenter: string;
  affiliation: string;
  date: string;
}

export interface SimulationSettings {
  name: string;
  mode: string;
  enableVoiceInput: boolean;
  enableTextInput: boolean;
  feedbackLevel: string;
  enableScoring: boolean;
  timeLimit: string;
  steps: {
    id: string;
    content: string;
    isCheckpoint: boolean;
    expectedResponses: string[];
  }[];
}

export interface Procedure {
  id?: string;
  title: string;
  description: string;
  taskId?: string; // Include taskId for YAML saving
  presenter: string;
  affiliation: string;
  kpiTech: string[];
  kpiConcept: string[];
  date: string;
  steps: Step[];
  mediaItems: MediaItem[];
  transcript?: string;
  yamlContent?: string;
  flowchartCode?: string;
  simulationSettings?: SimulationSettings;
}

export class ProcedureService {
  private currentProcedureId: string | null = null;
  private currentTaskId: string | null = null;
  private procedureCache: Record<string, Procedure> = {};

  constructor() {
    // Initialize IDs from storage
    this.loadStoredIds();
  }

  // ID Management
  private loadStoredIds(): void {
    if (typeof window !== 'undefined') {
      this.currentProcedureId = localStorage.getItem('currentProcedureId') || sessionStorage.getItem('currentProcedureId');
      this.currentTaskId = localStorage.getItem('currentTaskId') || sessionStorage.getItem('currentTaskId');
    }
  }

  private saveIds(): void {
    if (typeof window !== 'undefined') {
      if (this.currentProcedureId) {
        localStorage.setItem('currentProcedureId', this.currentProcedureId);
        sessionStorage.setItem('currentProcedureId', this.currentProcedureId);
      }
      
      if (this.currentTaskId) {
        localStorage.setItem('currentTaskId', this.currentTaskId);
        sessionStorage.setItem('currentTaskId', this.currentTaskId);
      }
    }
  }

  clearCurrentProcedure(): void {
    this.currentProcedureId = null;
    this.currentTaskId = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentProcedureId');
      sessionStorage.removeItem('currentProcedureId');
      localStorage.removeItem('currentTaskId');
      sessionStorage.removeItem('currentTaskId');
    }
  }

  // Core API Methods
  async createProcedure(taskDefinition: TaskDefinition): Promise<string> {
    try {
      const response = await fetch('/api/procedures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskDefinition),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create procedure');
      }

      const data = await response.json();
      
      if (!data.success || !data.data?.procedureId || !data.data?.taskId) {
        throw new Error('Failed to create procedure - missing IDs');
      }
      
      this.currentProcedureId = data.data.procedureId;
      this.currentTaskId = data.data.taskId;
      this.saveIds();
      
      return data.data.procedureId;
    } catch (error) {
      console.error('Error creating procedure:', error);
      throw error;
    }
  }
  
  async getProcedure(id?: string): Promise<Procedure | null> {
    const procedureId = id || this.currentProcedureId;
    if (!procedureId) return null;

    // Check cache first
    if (this.procedureCache[procedureId]) {
      return this.procedureCache[procedureId];
    }
    
    try {
      const response = await fetch(`/api/procedures/${procedureId}`);
      
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Error fetching procedure: ${response.statusText}`);
      
      const data = await response.json();
      if (!data.success || !data.procedure) return null;
      
      // Cache the result
      this.procedureCache[procedureId] = data.procedure;
      return data.procedure;
    } catch (error) {
      console.error('Error fetching procedure:', error);
      return null;
    }
  }
  
  async getAllProcedures(): Promise<Procedure[]> {
    try {
      const response = await fetch('/api/procedures');
      
      if (!response.ok) {
        console.error(`API error (${response.status}): ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      // Check if data.procedures exists and is an array
      if (data?.procedures && Array.isArray(data.procedures)) {
        return data.procedures;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching all procedures:', error);
      return [];
    }
  }

  async getOwnedProcedures(): Promise<Procedure[]> {
    try {
      const response = await fetch('/api/procedures?owned=true');
      
      if (!response.ok) {
        console.error(`API error (${response.status}): ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      // Check if data.procedures exists and is an array
      if (data?.procedures && Array.isArray(data.procedures)) {
        return data.procedures;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching owned procedures:', error);
      return [];
    }
  }

  async deleteProcedure(procedureId: string): Promise<void> {
    try {
      const response = await fetch(`/api/procedures/${procedureId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete procedure');
      }

      // Remove from cache if it exists
      if (this.procedureCache[procedureId]) {
        delete this.procedureCache[procedureId];
      }

      // Clear current procedure if it's the one being deleted
      if (this.currentProcedureId === procedureId) {
        this.clearCurrentProcedure();
      }
    } catch (error) {
      console.error('Error deleting procedure:', error);
      throw error;
    }
  }

  // Saving specific data types
  async saveSteps(procedureId: string, steps: Step[]): Promise<boolean> {
    return procedureStepsService.saveSteps(procedureId, steps);
  }
  
  async saveMediaItems(mediaItems: MediaItem[]): Promise<void> {
    return mediaItemsService.saveMediaItems(mediaItems);
  }
  
  async saveTranscript(transcript: string): Promise<void> {
    if (!this.currentTaskId) {
      throw new Error('No task ID available for saving transcript');
    }

    try {
      const response = await fetch('/api/procedures/dictation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          transcript
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save transcript');
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  }
  
  async saveYamlContent(yamlContent: string, taskId?: string): Promise<void> {
    const targetTaskId = taskId || this.currentTaskId;
    
    if (!targetTaskId) {
      throw new Error('No task ID available for saving YAML content');
    }

    try {
      const response = await fetch('/api/procedures/yaml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: targetTaskId,
          content: yamlContent
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save YAML content');
      }
    } catch (error) {
      console.error('Error saving YAML content:', error);
      throw error;
    }
  }
  
  async saveFlowchart(flowchartCode: string): Promise<void> {
    if (!this.currentTaskId) {
      throw new Error('No task ID available for saving flowchart');
    }

    try {
      const response = await fetch('/api/procedures/flowchart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          mermaid: flowchartCode
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save flowchart');
      }
    } catch (error) {
      console.error('Error saving flowchart:', error);
      throw error;
    }
  }
  
  async saveSimulationSettings(settings: SimulationSettings): Promise<boolean> {
    if (!this.currentProcedureId) {
      console.error('No procedure ID available for saving simulation settings');
      return false;
    }

    try {
      const response = await fetch('/api/procedures/simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId: this.currentProcedureId,
          settings
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error saving simulation settings:', data.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving simulation settings:', error);
      return false;
    }
  }
  
  async publishProcedure(): Promise<boolean> {
    if (!this.currentProcedureId) {
      throw new Error('No procedure ID available for publishing');
    }

    try {
      const response = await fetch('/api/procedures/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId: this.currentProcedureId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to publish procedure');
      }

      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error publishing procedure:', error);
      return false;
    }
  }

  // Getters
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  getCurrentProcedureId(): string | null {
    return this.currentProcedureId;
  }
}

export const procedureService = new ProcedureService(); 