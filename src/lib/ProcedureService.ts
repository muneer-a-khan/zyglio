import { createClient } from '@supabase/supabase-js';

// Import Prisma only in non-browser environments
let prisma: any = null;
if (typeof window === 'undefined') {
  // We're in a Node.js environment
  prisma = require('./prisma').default;
}

// For storing procedure data during the session
let procedureCache: Record<string, any> = {};

// Create a Supabase client for client-side operations when Prisma isn't available
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
  filePath?: string;
  createdAt?: string | Date;
  presenter?: string;
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

// Define database record types that match Prisma schema
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
  private isServer: boolean;

  constructor() {
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Creates a new procedure with basic information
   */
  async createProcedure(taskDefinition: TaskDefinition): Promise<string> {
    try {
      if (!this.currentProcedureId) {
        console.log('Creating new procedure with task definition:', taskDefinition);
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
        console.log('Procedure creation response:', data);
        
        if (!data.success || !data.data?.procedureId || !data.data?.taskId) {
          throw new Error('Failed to create procedure - missing IDs');
        }
        
        this.currentProcedureId = data.data.procedureId;
        this.currentTaskId = data.data.taskId;
        console.log('Set current IDs:', { procedureId: this.currentProcedureId, taskId: this.currentTaskId });
        
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
  async saveSteps(procedureId: string, steps: Step[]): Promise<boolean> {
    try {
      const response = await fetch('/api/procedures/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureId,
          steps: steps.map((step, index) => ({
            content: step.content,
            notes: step.comments?.join('\n'),
            index
          }))
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save steps');
      }

      return true;
    } catch (error) {
      console.error('Error saving steps:', error);
      return false;
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

      // Get the current procedure
      const procedure = await prisma.procedure.findFirst({
        where: { taskId: this.currentTaskId }
      });
      
      if (!procedure) {
        throw new Error('No procedure found for the current task');
      }

      console.log(`Saving ${mediaItems.length} media items for procedure ${procedure.id}`);
      
      // Delete existing media items for this procedure
      await prisma.mediaItem.deleteMany({
        where: { procedureId: procedure.id }
      });
      
      // Create new media items
      if (mediaItems.length > 0) {
        // Map MediaType enum values
        const mapMediaType = (type: string) => {
          switch (type) {
            case 'IMAGE': return 'IMAGE';
            case 'VIDEO': return 'VIDEO';
            case 'AUDIO': return 'AUDIO';
            case 'PDF': return 'PDF';
            default: return 'IMAGE';
          }
        };
        
        // Create media items
        await Promise.all(mediaItems.map(async (item) => {
          await prisma.mediaItem.create({
            data: {
              id: item.id,
              type: mapMediaType(item.type),
              caption: item.caption || null,
              url: item.url,
              taskId: this.currentTaskId as string,
              procedureId: procedure.id
            }
          });
        }));
      }
      
      console.log('Media items saved successfully');
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
      console.log('Saving transcript. Current state:', { 
        currentTaskId: this.currentTaskId, 
        currentProcedureId: this.currentProcedureId,
        transcriptLength: transcript.length
      });

      // Validate inputs
      if (!transcript.trim()) {
        console.log('Empty transcript, skipping save');
        return;
      }

      // If we don't have a task ID, try to get it from the current procedure
      if (!this.currentTaskId && this.currentProcedureId) {
        console.log('No task ID found, attempting to recover from procedure:', this.currentProcedureId);
        const procedure = await prisma.procedure.findUnique({
          where: { id: this.currentProcedureId }
        });
        
        if (procedure) {
          this.currentTaskId = procedure.taskId;
          console.log('Recovered task ID:', this.currentTaskId);
        } else {
          console.log('No procedure found:', this.currentProcedureId);
        }
      }

      if (!this.currentTaskId) {
        console.error('No task ID available for saving transcript');
        return;
      }
      
      console.log('Sending transcript save request with task ID:', this.currentTaskId);
      const response = await fetch('/api/procedures/dictation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          transcript: transcript.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Transcript save failed:', errorData);
        throw new Error(errorData.message || 'Failed to save transcript');
      }

      console.log('Transcript saved successfully');
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  }

  /**
   * Saves YAML content for the procedure
   * This is the method that seems to be called when navigating tabs.
   */
  async saveYaml(yamlContent: string): Promise<void> {
    try {
      // Try to recover task ID if missing
      if (!this.currentTaskId && this.currentProcedureId) {
        console.log('No task ID found for YAML save, attempting to recover from procedure:', this.currentProcedureId);
        await this.recoverTaskId();
      }
      
      if (!this.currentTaskId) {
        console.warn('No active task (currentTaskId) to save YAML for. This might be normal if procedure creation is not complete.');
        // Depending on UX, you might not want to throw an error here if it's an intermediate save
        // and the task ID isn't finalized yet.
        return; 
      }
      
      console.log(`ProcedureService: Attempting to save YAML for taskId: ${this.currentTaskId}`);
      const response = await fetch('/api/procedures/yaml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          yamlContent: yamlContent, // Ensure this key matches what the API route expects
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response from /api/procedures/yaml"}));
        console.error("ProcedureService: Failed to save YAML content. Status:", response.status, "Error data:", errorData);
        throw new Error(errorData.message || 'Failed to save YAML content via ProcedureService');
      }
      console.log("ProcedureService: YAML content saved successfully.");
    } catch (error) {
      console.error('ProcedureService: Error in saveYaml:', error);
      throw error;
    }
  }

  /**
   * Saves the YAML content for the procedure
   * This method is similar to saveYaml. Consolidating or ensuring they are distinct if intended.
   * For now, making it identical to saveYaml for consistency as the API expects 'yamlContent'.
   */
  async saveYamlContent(yamlContent: string): Promise<void> {
    try {
      // Try to recover task ID if missing
      if (!this.currentTaskId && this.currentProcedureId) {
        console.log('No task ID found for YAML content save, attempting to recover from procedure:', this.currentProcedureId);
        await this.recoverTaskId();
      }
      
      if (!this.currentTaskId) {
        console.warn('No active task (currentTaskId) to save YAML content for.');
        return; 
      }
      
      console.log(`ProcedureService: Attempting to save YAML (via saveYamlContent) for taskId: ${this.currentTaskId}`);
      const response = await fetch('/api/procedures/yaml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: this.currentTaskId,
          yamlContent: yamlContent, // Key matches API expectation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response from /api/procedures/yaml (called by saveYamlContent)"}));;
        console.error("ProcedureService: Failed to save YAML (via saveYamlContent). Status:", response.status, "Error data:", errorData);
        throw new Error(errorData.message || 'Failed to save YAML content (via saveYamlContent) via ProcedureService');
      }
      console.log("ProcedureService: YAML content saved successfully (via saveYamlContent).");
    } catch (error) {
      console.error('ProcedureService: Error in saveYamlContent:', error);
      throw error;
    }
  }

  /**
   * Saves flowchart code for the procedure
   */
  async saveFlowchart(flowchartCode: string): Promise<void> {
    try {
      // Try to recover task ID if missing
      if (!this.currentTaskId && this.currentProcedureId) {
        console.log('No task ID found, attempting to recover from procedure:', this.currentProcedureId);
        await this.recoverTaskId();
      }
      
      if (!this.currentTaskId) {
        throw new Error('No active task to save flowchart for. Please create or select a procedure first.');
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
  async saveSimulationSettings(settings: SimulationSettings): Promise<boolean> {
    try {
      if (!this.currentProcedureId) {
        console.error('No active procedure ID for saving simulation settings');
        return false;
      }

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
        throw new Error(`Failed to save simulation settings: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error saving simulation settings:', error);
      return false;
    }
  }

  /**
   * Loads a procedure by ID
   */
  async getProcedure(id?: string): Promise<Procedure | null> {
    try {
      // Check if we're on the create page
      if (!this.isServer && typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        // If we're on the create page, return null immediately
        if (pathname === '/create' || pathname === '/create/') {
          console.log('On create page, not loading any existing procedure');
          return null;
        }
      }

      const procedureId = id || this.currentProcedureId;
      
      if (!procedureId) {
        console.log('No procedure ID provided and no current procedure ID set');
        return null;
      }

      console.log('Attempting to load procedure with ID:', procedureId);
      
      // In browser, fetch via API
      if (!this.isServer) {
        console.log('Running in browser, using API to fetch procedure');
        const procedure = await this.getProcedureViaApi(procedureId);
        if (procedure) {
          this.currentProcedureId = procedureId;
          // Set the task ID from the procedure data
          const task = await prisma.learningTask.findFirst({
            where: { procedureId: procedureId }
          });
          if (task) {
            this.currentTaskId = task.id;
          }
        }
        return procedure;
      }
      
      // On server, use Prisma directly
      if (!prisma) {
        console.error('Prisma client is not available');
        return null;
      }
      
      // Get procedure data using Prisma (server-side only)
      const procedureData = await prisma.procedure.findUnique({
        where: { id: procedureId }
      });

      if (!procedureData) {
        console.error('No procedure data found for ID:', procedureId);
        return null;
      }

      // Set the current IDs
      this.currentProcedureId = procedureId;
      this.currentTaskId = procedureData.taskId;

      // Get procedure steps using Prisma
      const stepsData = await prisma.procedureStep.findMany({
        where: { procedureId: procedureId },
        orderBy: { index: 'asc' }
      });

      // Get media items using Prisma
      const mediaData = await prisma.mediaItem.findMany({
        where: { procedureId: procedureId }
      });

      // Format steps
      const steps = stepsData ? stepsData.map((step: any) => ({
        id: step.id,
        content: step.content,
        comments: step.notes ? [step.notes] : []
      })) : [];

      // Format media items
      const mediaItems = mediaData ? mediaData.map((media: any) => ({
        id: media.id,
        type: media.type.toString(),
        caption: media.caption || undefined,
        url: media.url,
        filePath: media.filePath || undefined
      })) : [];

      // Get the learning task associated with this procedure
      const task = await prisma.learningTask.findFirst({
        where: { id: procedureData.taskId }
      });

      return {
        id: procedureData.id,
        title: procedureData.title,
        description: procedureData.title, // Assuming no separate description field
        presenter: task?.presenter || '',
        affiliation: task?.affiliation || '',
        kpiTech: task?.kpiTech ? [task.kpiTech] : [],
        kpiConcept: task?.kpiConcept ? [task.kpiConcept] : [],
        date: task?.date?.toISOString() || new Date().toISOString(),
        steps,
        mediaItems,
        transcript: '', // Need to check where transcript is stored
        yamlContent: '', // Need to check where YAML is stored
        flowchartCode: '' // Need to check where flowchart is stored
      };
    } catch (error) {
      console.error('Error loading procedure:', error);
      
      // Try API fallback if we're on the client side or if Prisma fails
      if ((id || this.currentProcedureId) && (!this.isServer || !prisma)) {
        return this.getProcedureViaApi(id || this.currentProcedureId!);
      }
      return null;
    }
  }

  /**
   * Gets a procedure via API when Prisma is not available (client-side)
   */
  private async getProcedureViaApi(procedureId: string): Promise<Procedure | null> {
    try {
      // Check cache first
      if (procedureCache[procedureId]) {
        console.log('Returning cached procedure data');
        return procedureCache[procedureId];
      }
      
      console.log('Fetching procedure via API:', procedureId);
      const response = await fetch(`/api/procedures/${procedureId}`);
      
      // If the procedure doesn't exist, return null instead of throwing
      if (response.status === 404) {
        console.log('Procedure not found, returning null');
        return null;
      }
      
      // For other errors, handle gracefully
      if (!response.ok) {
        console.error(`API error (${response.status}): ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.procedure) {
        // Cache the result
        procedureCache[procedureId] = data.procedure;
        return data.procedure;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching procedure via API:', error);
      return null;
    }
  }

  /**
   * Gets all procedures
   */
  async getAllProcedures(): Promise<Procedure[]> {
    try {
      // On client side, use API
      if (!this.isServer) {
        return this.getAllProceduresViaApi();
      }
      
      // On server, use Prisma
      if (!prisma) {
        console.error('Prisma client is not available');
        return [];
      }
      
      // Get procedures with non-null simulationSettings using Prisma
      const procedures = await prisma.procedure.findMany({
        orderBy: { id: 'desc' }
        // No filter for simulationSettings anymore to get all procedures
      });

      if (!procedures.length) return [];

      // Get the associated learning tasks for all procedures
      const taskIds = procedures.map((p: any) => p.taskId).filter(Boolean);
      const learningTasks = await prisma.learningTask.findMany({
        where: {
          id: { in: taskIds }
          // No userId filter
        }
      });
      
      // Create a map for quick lookups
      const taskMap = new Map();
      learningTasks.forEach((task: any) => {
        taskMap.set(task.id, task);
      });

      return procedures
        .filter((proc: any) => taskMap.has(proc.taskId)) // Only include procedures with matching tasks
        .map((proc: any) => {
          const task = taskMap.get(proc.taskId);
          
          // Split kpiTech and kpiConcept strings into arrays if they exist
          const kpiTech = task?.kpiTech ? 
            task.kpiTech.split(',').map((tag: string) => tag.trim()).filter(Boolean) : 
            [];
            
          const kpiConcept = task?.kpiConcept ? 
            task.kpiConcept.split(',').map((tag: string) => tag.trim()).filter(Boolean) : 
            [];
            
          return {
            id: proc.id,
            title: proc.title || task?.title || 'Untitled Procedure',
            description: proc.title || task?.title || 'No description available',
            presenter: task?.presenter || '',
            affiliation: task?.affiliation || '',
            kpiTech: kpiTech,
            kpiConcept: kpiConcept,
            date: task?.date?.toISOString() || '',
            steps: [],
            mediaItems: [],
            simulationSettings: proc.simulationSettings
          };
        });
    } catch (error) {
      console.error('Error getting all procedures:', error);
      
      // Try API fallback if we're on the client side or if Prisma fails
      if (!this.isServer || !prisma) {
        return this.getAllProceduresViaApi();
      }
      return [];
    }
  }
  
  /**
   * Gets all procedures via API when Prisma is not available
   */
  private async getAllProceduresViaApi(): Promise<Procedure[]> {
    try {
      console.log('Fetching all procedures via API');
      const response = await fetch('/api/procedures');
      
      // Handle errors gracefully
      if (!response.ok) {
        console.error(`API error (${response.status}): ${response.statusText}`);
        return []; // Return empty array instead of throwing
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.procedures)) {
        // Ensure all fields are properly formatted
        return data.procedures.map((proc: any) => ({
          id: proc.id,
          title: proc.title || 'Untitled Procedure',
          description: proc.description || proc.title || 'No description available',
          presenter: proc.presenter || '',
          affiliation: proc.affiliation || '',
          kpiTech: Array.isArray(proc.kpiTech) ? proc.kpiTech : [],
          kpiConcept: Array.isArray(proc.kpiConcept) ? proc.kpiConcept : [],
          date: proc.date || new Date().toISOString(),
          steps: Array.isArray(proc.steps) ? proc.steps : [],
          mediaItems: Array.isArray(proc.mediaItems) ? proc.mediaItems : [],
          simulationSettings: proc.simulationSettings || null
        }));
      }
      
      console.warn('API returned unexpected format:', data);
      return []; // Return empty array for unexpected format
    } catch (error) {
      console.error('Error fetching all procedures via API:', error);
      return []; // Always return empty array on error
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

      // Client-side: use API
      if (!this.isServer) {
        const response = await fetch(`/api/procedures/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            procedureId: this.currentProcedureId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to publish procedure');
        }

        this.currentProcedureId = null;
        this.currentTaskId = null;
        
        return true;
      }
      
      // Server-side: use Prisma directly
      if (!prisma) {
        console.error('Prisma client is not available');
        return false;
      }

      // Update the procedure using Prisma
      await prisma.procedure.update({
        where: { id: this.currentProcedureId },
        data: {}  // Just touch the record to update timestamps
      });

      this.currentProcedureId = null;
      this.currentTaskId = null;
      
      return true;
    } catch (error) {
      console.error('Error publishing procedure:', error);
      return false;
    }
  }

  /**
   * Attempts to recover the task ID from the current procedure ID
   */
  private async recoverTaskId(): Promise<void> {
    if (!this.currentProcedureId) {
      console.log('No procedure ID available for task ID recovery');
      return;
    }

    try {
      if (!this.isServer && typeof window !== 'undefined') {
        // Client-side: Use API
        const response = await fetch(`/api/procedures/${this.currentProcedureId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.taskId) {
            this.currentTaskId = data.taskId;
            console.log('Recovered task ID via API:', this.currentTaskId);
          }
        }
      } else if (prisma) {
        // Server-side: Use Prisma directly
        const procedure = await prisma.procedure.findUnique({
          where: { id: this.currentProcedureId }
        });
        
        if (procedure && procedure.taskId) {
          this.currentTaskId = procedure.taskId;
          console.log('Recovered task ID via Prisma:', this.currentTaskId);
        }
      }
    } catch (error) {
      console.error('Error recovering task ID:', error);
    }
  }

  /**
   * Get the current task ID
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  /**
   * Get the current procedure ID
   */
  getCurrentProcedureId(): string | null {
    return this.currentProcedureId;
  }

  /**
   * Clear the current procedure and task data
   */
  clearCurrentProcedure(): void {
    this.currentProcedureId = null;
    this.currentTaskId = null;
  }
}

// Export as a singleton instance
export const procedureService = new ProcedureService(); 