import { supabase } from '@/integrations/supabase/client';
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
}

// Define database record types that match Supabase schema
interface ProcedureRecord {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  presenter?: string;
  affiliation?: string;
  kpi_tech?: string[];
  kpi_concept?: string[];
  date?: string;
  transcript?: string;
  yaml_content?: string;
  flowchart_code?: string;
  published?: boolean;
  published_at?: string;
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
        
        const { error } = await supabase
          .from('procedures')
          .insert({
            id: procedureId,
            title: taskDefinition.name,
            description: taskDefinition.description,
            presenter: taskDefinition.presenter,
            affiliation: taskDefinition.affiliation,
            kpi_tech: taskDefinition.kpiTech,
            kpi_concept: taskDefinition.kpiConcept,
            date: taskDefinition.date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        
        // Store procedure ID in local storage
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_procedure_id', procedureId);
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

      // Map from Procedure interface to database field names
      const dbData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (procedureData.title) dbData.title = procedureData.title;
      if (procedureData.description) dbData.description = procedureData.description;
      if (procedureData.presenter) dbData.presenter = procedureData.presenter;
      if (procedureData.affiliation) dbData.affiliation = procedureData.affiliation;
      if (procedureData.kpiTech) dbData.kpi_tech = procedureData.kpiTech;
      if (procedureData.kpiConcept) dbData.kpi_concept = procedureData.kpiConcept;
      if (procedureData.date) dbData.date = procedureData.date;
      if (procedureData.transcript) dbData.transcript = procedureData.transcript;
      if (procedureData.yamlContent) dbData.yaml_content = procedureData.yamlContent;
      if (procedureData.flowchartCode) dbData.flowchart_code = procedureData.flowchartCode;

      const { error } = await supabase
        .from('procedures')
        .update(dbData)
        .eq('id', this.currentProcedureId);

      if (error) throw error;
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

      // First, delete existing steps for this procedure to avoid duplicates
      const { error: deleteError } = await supabase
        .from('procedure_steps')
        .delete()
        .eq('procedure_id', this.currentProcedureId);

      if (deleteError) throw deleteError;

      // Insert new steps
      const stepsToInsert = steps.map((step, index) => ({
        id: step.id,
        procedure_id: this.currentProcedureId as string,
        title: `Step ${index + 1}`,
        description: step.content,
        step_number: index + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      if (stepsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('procedure_steps')
          .insert(stepsToInsert);

        if (insertError) throw insertError;
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
      if (!this.currentProcedureId) {
        throw new Error('No active procedure to update media for');
      }

      // First, delete existing media for this procedure to avoid duplicates
      const { error: deleteError } = await supabase
        .from('mentor_media')
        .delete()
        .eq('step_id', this.currentProcedureId);

      if (deleteError) throw deleteError;

      // Insert new media items
      const mediaToInsert = mediaItems.map(item => ({
        id: item.id,
        step_id: this.currentProcedureId as string,
        title: item.caption || 'Media',
        description: item.caption || null,
        media_type: item.type,
        media_url: item.url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      if (mediaToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('mentor_media')
          .insert(mediaToInsert);

        if (insertError) throw insertError;
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
      await this.updateProcedure({ transcript });
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
      await this.updateProcedure({ yamlContent });
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
      await this.updateProcedure({ flowchartCode });
    } catch (error) {
      console.error('Error saving flowchart code:', error);
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
      const steps = stepsData.map(step => ({
        id: step.id,
        content: step.description,
        comments: []
      }));

      // Format media items
      const mediaItems = mediaData.map(media => ({
        id: media.id,
        type: media.media_type,
        caption: media.description || undefined,
        url: media.media_url
      }));

      return {
        id: record.id,
        title: record.title,
        description: record.description,
        presenter: record.presenter || '',
        affiliation: record.affiliation || '',
        kpiTech: record.kpi_tech || [],
        kpiConcept: record.kpi_concept || [],
        date: record.date || new Date().toISOString(),
        steps,
        mediaItems,
        transcript: record.transcript,
        yamlContent: record.yaml_content,
        flowchartCode: record.flowchart_code
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
        presenter: item.presenter || '',
        affiliation: item.affiliation || '',
        kpiTech: item.kpi_tech || [],
        kpiConcept: item.kpi_concept || [],
        date: item.date || '',
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

      const { error } = await supabase
        .from('procedures')
        .update({
          published: true,
          published_at: new Date().toISOString(),
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