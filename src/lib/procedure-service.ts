import { supabase } from './supabase';

export interface TaskDefinition {
  id?: string;
  name: string;
  description: string;
  kpiTech: string[];
  kpiConcept: string[];
  presenter: string;
  affiliation: string;
  date: string;
}

export interface MediaItem {
  id?: string;
  procedureId: string;
  name: string;
  type: string;
  url: string;
  size: string;
}

export interface Step {
  id: string;
  procedureId: string;
  content: string;
  comments: string[];
  order: number;
}

export interface Procedure {
  id?: string;
  taskDefinition: TaskDefinition;
  mediaItems: MediaItem[];
  steps: Step[];
  transcript: string;
  yamlContent?: string;
  simulationSettings?: any;
}

// Create or update a procedure
export async function saveProcedure(procedure: Procedure): Promise<Procedure> {
  let procedureId = procedure.id;
  
  // If no ID exists, create a new procedure record
  if (!procedureId) {
    const { data, error } = await supabase
      .from('procedures')
      .insert({
        name: procedure.taskDefinition.name,
        description: procedure.taskDefinition.description,
        presenter: procedure.taskDefinition.presenter,
        affiliation: procedure.taskDefinition.affiliation,
        date: procedure.taskDefinition.date,
        kpi_tech: procedure.taskDefinition.kpiTech,
        kpi_concept: procedure.taskDefinition.kpiConcept,
        transcript: procedure.transcript,
        yaml_content: procedure.yamlContent,
        simulation_settings: procedure.simulationSettings
      })
      .select()
      .single();
      
    if (error) throw new Error(`Error creating procedure: ${error.message}`);
    procedureId = data.id;
  } else {
    // Update existing procedure
    const { error } = await supabase
      .from('procedures')
      .update({
        name: procedure.taskDefinition.name,
        description: procedure.taskDefinition.description,
        presenter: procedure.taskDefinition.presenter,
        affiliation: procedure.taskDefinition.affiliation,
        date: procedure.taskDefinition.date,
        kpi_tech: procedure.taskDefinition.kpiTech,
        kpi_concept: procedure.taskDefinition.kpiConcept,
        transcript: procedure.transcript,
        yaml_content: procedure.yamlContent,
        simulation_settings: procedure.simulationSettings
      })
      .eq('id', procedureId);
      
    if (error) throw new Error(`Error updating procedure: ${error.message}`);
  }
  
  // Save media items
  if (procedure.mediaItems.length > 0) {
    // Remove old media items to avoid duplication
    await supabase
      .from('media_items')
      .delete()
      .eq('procedure_id', procedureId);
    
    // Insert new media items
    const mediaItems = procedure.mediaItems.map(item => ({
      procedure_id: procedureId,
      name: item.name,
      type: item.type,
      url: item.url,
      size: item.size
    }));
    
    const { error: mediaError } = await supabase
      .from('media_items')
      .insert(mediaItems);
      
    if (mediaError) throw new Error(`Error saving media items: ${mediaError.message}`);
  }
  
  // Save steps
  if (procedure.steps.length > 0) {
    // Remove old steps to avoid duplication
    await supabase
      .from('steps')
      .delete()
      .eq('procedure_id', procedureId);
    
    // Insert new steps
    const steps = procedure.steps.map((step, index) => ({
      procedure_id: procedureId,
      id: step.id,
      content: step.content,
      comments: step.comments,
      order: index
    }));
    
    const { error: stepsError } = await supabase
      .from('steps')
      .insert(steps);
      
    if (stepsError) throw new Error(`Error saving steps: ${stepsError.message}`);
  }
  
  // Return the updated procedure with the new ID
  return {
    ...procedure,
    id: procedureId
  };
}

// Get a procedure by ID
export async function getProcedureById(id: string): Promise<Procedure | null> {
  // Get the main procedure record
  const { data, error } = await supabase
    .from('procedures')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    console.error(`Error fetching procedure: ${error.message}`);
    return null;
  }
  
  if (!data) return null;
  
  // Get media items
  const { data: mediaItems, error: mediaError } = await supabase
    .from('media_items')
    .select('*')
    .eq('procedure_id', id);
    
  if (mediaError) {
    console.error(`Error fetching media items: ${mediaError.message}`);
  }
  
  // Get steps
  const { data: steps, error: stepsError } = await supabase
    .from('steps')
    .select('*')
    .eq('procedure_id', id)
    .order('order', { ascending: true });
    
  if (stepsError) {
    console.error(`Error fetching steps: ${stepsError.message}`);
  }
  
  // Construct and return the procedure object
  return {
    id: data.id,
    taskDefinition: {
      name: data.name,
      description: data.description,
      presenter: data.presenter,
      affiliation: data.affiliation,
      date: data.date,
      kpiTech: data.kpi_tech || [],
      kpiConcept: data.kpi_concept || []
    },
    mediaItems: mediaItems || [],
    steps: steps || [],
    transcript: data.transcript || '',
    yamlContent: data.yaml_content,
    simulationSettings: data.simulation_settings
  };
}

// Get a list of all procedures
export async function getAllProcedures(): Promise<{ id: string, name: string, description: string, date: string }[]> {
  const { data, error } = await supabase
    .from('procedures')
    .select('id, name, description, date')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error(`Error fetching procedures: ${error.message}`);
    return [];
  }
  
  return data || [];
}

// Delete a procedure
export async function deleteProcedure(id: string): Promise<boolean> {
  // Delete the procedure (cascade delete should handle related records)
  const { error } = await supabase
    .from('procedures')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error(`Error deleting procedure: ${error.message}`);
    return false;
  }
  
  return true;
} 