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

  constructor() {
    // Initialize with a new ID or get from local storage/session
    if (typeof window !== 'undefined') {
      this.currentProcedureId = localStorage.getItem('current_procedure_id') || null;
    }
  }

  /**
   * Creates a new procedure with basic information
   */
  async createProcedure(taskDefinition: TaskDefinition): Promise<string> {
    try {
      if (!this.currentProcedureId) {
        const procedureId = uuidv4();
        const taskId = uuidv4();
        
        // Get the current user ID from the session
        let userId = '';
        try {
          const response = await fetch('/api/auth/session');
          const session = await response.json();
          userId = session?.user?.id || '';
          
          if (!userId) {
            throw new Error('User ID not found in session');
          }
        } catch (error) {
          console.error('Error getting user ID:', error);
          throw new Error('Failed to get user ID from session');
        }
        
        // Create a learning task and procedure in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // First, create the learning task
          const task = await tx.learningTask.create({
            data: {
              id: taskId,
              title: taskDefinition.name,
              kpiTech: taskDefinition.kpiTech?.join(', ') || null,
              kpiConcept: taskDefinition.kpiConcept?.join(', ') || null,
              presenter: taskDefinition.presenter,
              affiliation: taskDefinition.affiliation,
              date: new Date(taskDefinition.date),
              userId: userId,
            }
          });
          
          // Then create the procedure linked to the task
          const procedure = await tx.procedure.create({
            data: {
              id: procedureId,
              title: taskDefinition.name,
              taskId: task.id,
            }
          });
          
          return { taskId: task.id, procedureId: procedure.id };
        });

        // Store procedure ID in local storage
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_procedure_id', procedureId);
          localStorage.setItem('current_task_id', result.taskId);
        }
        this.currentProcedureId = procedureId;
        
        return procedureId;
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

      // Use Prisma instead of Supabase
      await prisma.procedure.update({
        where: { id: this.currentProcedureId },
        data: {
          title: procedureData.title,
          // Other fields as needed
        }
      });
      
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

      // Use Prisma transaction to delete existing steps and create new ones
      await prisma.$transaction(async (tx) => {
        // Delete existing steps
        await tx.procedureStep.deleteMany({
          where: { procedureId: this.currentProcedureId as string }
        });

        // Create new steps
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await tx.procedureStep.create({
            data: {
              id: step.id,
              procedureId: this.currentProcedureId as string,
              index: i,
              content: step.content,
              // Map any other fields from your Step type to the ProcedureStep model
            }
          });
        }
      });
      
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
      if (!this.currentProcedureId) {
        throw new Error('No active procedure to update media for');
      }

      // Use Prisma transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing media for this procedure
        await tx.mediaItem.deleteMany({
          where: { taskId: this.currentProcedureId as string }
        });

        // Create new media items
        for (const item of mediaItems) {
          await tx.mediaItem.create({
            data: {
              id: item.id,
              taskId: this.currentProcedureId as string,
              type: item.type as any, // Convert to MediaType enum
              caption: item.caption || null,
              url: item.url,
              relevance: null,
              // Add any other required fields
            }
          });
        }
      });
      
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
      // For now, we'll store transcript in a Dictation record
      if (!this.currentProcedureId) {
        throw new Error('No active procedure to save transcript for');
      }
      
      // Find existing dictation or create a new one
      const existingDictation = await prisma.dictation.findFirst({
        where: { taskId: this.currentProcedureId }
      });
      
      if (existingDictation) {
        await prisma.dictation.update({
          where: { id: existingDictation.id },
          data: { transcript }
        });
      } else {
        await prisma.dictation.create({
          data: {
            id: uuidv4(),
            taskId: this.currentProcedureId,
            transcript,
            audioUrl: '', // Required field
          }
        });
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
      if (!this.currentProcedureId) {
        throw new Error('No active procedure to save YAML for');
      }
      
      // Find existing YAML output or create a new one
      const existingYaml = await prisma.yamlOutput.findFirst({
        where: { taskId: this.currentProcedureId }
      });
      
      if (existingYaml) {
        await prisma.yamlOutput.update({
          where: { id: existingYaml.id },
          data: { content: yamlContent }
        });
      } else {
        await prisma.yamlOutput.create({
          data: {
            id: uuidv4(),
            taskId: this.currentProcedureId,
            content: yamlContent
          }
        });
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
      // The flowchart_code field doesn't exist in the procedures table
      // For now, we'll store it in memory only
      console.warn('saveFlowchart: flowchart_code field does not exist in procedures table');
      // await this.updateProcedure({ flowchartCode });
    } catch (error) {
      console.error('Error saving flowchart code:', error);
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