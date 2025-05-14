import { supabase } from '@/integrations/supabase/client';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export interface TaskDefinition {
  name: string;
  description: string;
  kpiTech: string[];
  kpiConcept: string[];
  presenter: string;
  affiliation: string;
  date: string;
}

export interface Step {
  id: string;
  content: string;
  comments: string[];
}

export interface MediaItem {
  id: string;
  type: string;
  caption?: string;
  url: string;
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

// Define database record types that match Supabase schema
interface ProcedureRecord {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

class ProcedureService {
  private currentProcedureId: string | null = null;
  private currentTaskId: string | null = null;

  constructor() {
    // Initialize with IDs from local storage/session
    if (typeof window !== 'undefined') {
      this.currentProcedureId = localStorage.getItem('current_procedure_id') || null;
      this.currentTaskId = localStorage.getItem('current_task_id') || null;
    }
  }

  /**
   * Creates a new procedure with basic information
   */
  async createProcedure(taskDefinition: TaskDefinition): Promise<string> {
    try {
      if (!this.currentProcedureId) {
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
        
        if (!data.success || !data.data?.procedureId) {
          throw new Error('Failed to create procedure');
        }
        
        // Store IDs in local storage
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_procedure_id', data.data.procedureId);
          localStorage.setItem('current_task_id', data.data.taskId);
        }
        
        this.currentProcedureId = data.data.procedureId;
        this.currentTaskId = data.data.taskId;
        
        return data.data.procedureId;
      }
      
      return this.currentProcedureId;
    } catch (error) {
      console.error('Error creating procedure:', error);
      throw error;
    }
  }

  /**
   * Updates an existing procedure with new data
   */
  async updateProcedure(procedureData: Partial<Procedure>): Promise<void> {
    try {
      if (!this.currentProcedureId) {
        throw new Error('No active procedure to update');
      }

      const response = await fetch('/api/procedures', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId: this.currentProcedureId,
          ...procedureData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update procedure');
      }
    } catch (error) {
      console.error('Error updating procedure:', error);
      throw error;
    }
  }

  /**
   * Saves steps for a procedure
   */
  async saveSteps(steps: Step[]): Promise<void> {
    try {
      if (!this.currentProcedureId) {
        throw new Error('No active procedure to update steps for');
      }

      const response = await fetch('/api/procedures/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId: this.currentProcedureId,
          steps,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save steps');
      }
    } catch (error) {
      console.error('Error saving steps:', error);
      throw error;
    }
  }

  /**
   * Saves media items for a procedure
   */
  async saveMediaItems(mediaItems: MediaItem[]): Promise<void> {
    try {
      if (!this.currentTaskId) {
        throw new Error('No active task to update media for');
      }

      const response = await fetch('/api/procedures/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          mediaItems,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save media items');
      }
    } catch (error) {
      console.error('Error saving media items:', error);
      throw error;
    }
  }

  /**
   * Saves the transcript for the procedure
   */
  async saveTranscript(transcript: string): Promise<void> {
    try {
      if (!this.currentTaskId) {
        throw new Error('No active task to save transcript for');
      }
      
      const response = await fetch('/api/procedures/dictation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          transcript,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save transcript');
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  }

  /**
   * Saves YAML content for the procedure
   */
  async saveYaml(yamlContent: string): Promise<void> {
    try {
      if (!this.currentTaskId) {
        throw new Error('No active task to save YAML for');
      }
      
      const response = await fetch('/api/procedures/yaml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          content: yamlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save YAML content');
      }
    } catch (error) {
      console.error('Error saving YAML content:', error);
      throw error;
    }
  }

  /**
   * Saves flowchart code for the procedure
   */
  async saveFlowchart(flowchartCode: string): Promise<void> {
    try {
      if (!this.currentTaskId) {
        throw new Error('No active task to save flowchart for');
      }
      
      const response = await fetch('/api/procedures/flowchart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          mermaid: flowchartCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save flowchart');
      }
    } catch (error) {
      console.error('Error saving flowchart:', error);
      throw error;
    }
  }

  /**
   * Saves simulation settings for the procedure
   */
  async saveSimulationSettings(simulationSettings: SimulationSettings): Promise<void> {
    try {
      // The simulation_settings field doesn't exist in the procedures table
      // For now, we'll store it in memory only
      console.warn('saveSimulationSettings: simulation_settings field does not exist in procedures table');
      // await this.updateProcedure({ simulationSettings });
    } catch (error) {
      console.error('Error saving simulation settings:', error);
      throw error;
    }
  }

  /**
   * Loads a procedure by ID
   */
  async getProcedure(id?: string): Promise<Procedure | null> {
    try {
      const procedureId = id || this.currentProcedureId;
      
      if (!procedureId) {
        return null;
      }

      // Get procedure data
      const { data: procedureData, error: procedureError } = await supabase
        .from('procedures')
        .select('*')
        .eq('id', procedureId)
        .single();

      if (procedureError) throw procedureError;

      const record = procedureData as ProcedureRecord;

      // Get procedure steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('procedure_steps')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Get media items
      const { data: mediaData, error: mediaError } = await supabase
        .from('mentor_media')
        .select('*')
        .eq('step_id', procedureId);

      if (mediaError) throw mediaError;

      // Format steps
      const steps = stepsData ? stepsData.map(step => ({
        id: step.id,
        content: step.description,
        comments: []
      })) : [];

      // Format media items
      const mediaItems = mediaData ? mediaData.map(media => ({
        id: media.id,
        type: media.media_type,
        caption: media.description || undefined,
        url: media.media_url
      })) : [];

      return {
        id: record.id,
        title: record.title,
        description: record.description,
        presenter: '',
        affiliation: '',
        kpiTech: [],
        kpiConcept: [],
        date: new Date().toISOString(),
        steps,
        mediaItems,
        transcript: '',
        yamlContent: '',
        flowchartCode: ''
      };
    } catch (error) {
      console.error('Error loading procedure:', error);
      return null;
    }
  }

  /**
   * Gets all procedures
   */
  async getAllProcedures(): Promise<Procedure[]> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data) return [];

      return data.map((item: ProcedureRecord) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        presenter: '',
        affiliation: '',
        kpiTech: [],
        kpiConcept: [],
        date: '',
        steps: [],
        mediaItems: []
      }));
    } catch (error) {
      console.error('Error getting all procedures:', error);
      return [];
    }
  }

  /**
   * Finalizes and publishes a procedure
   */
  async publishProcedure(): Promise<boolean> {
    try {
      if (!this.currentProcedureId) {
        throw new Error('No active procedure to publish');
      }

      // The published and published_at fields don't exist in the schema
      // Just update the timestamp to indicate it was modified
      const { error } = await supabase
        .from('procedures')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentProcedureId);

      if (error) throw error;

      // Clear the current procedure ID from local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('current_procedure_id');
      }
      this.currentProcedureId = null;
      
      return true;
    } catch (error) {
      console.error('Error publishing procedure:', error);
      return false;
    }
  }

  /**
   * Clears the current procedure context
   */
  clearCurrentProcedure(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_procedure_id');
    }
    this.currentProcedureId = null;
  }
}

// Export as a singleton instance
export const procedureService = new ProcedureService(); 