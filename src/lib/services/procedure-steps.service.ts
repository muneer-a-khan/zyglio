/**
 * Procedure Steps Service
 * Handles saving and retrieving steps for procedures
 */

export interface Step {
  id: string;
  content: string;
  comments: string[];
}

export class ProcedureStepsService {
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
   * Gets steps for a procedure
   */
  async getSteps(procedureId: string): Promise<Step[]> {
    try {
      const response = await fetch(`/api/procedures/${procedureId}/steps`);
      if (!response.ok) {
        throw new Error('Failed to fetch steps');
      }

      const data = await response.json();
      return data.steps.map((step: any) => ({
        id: step.id,
        content: step.content,
        comments: step.notes ? step.notes.split('\n') : []
      }));
    } catch (error) {
      console.error('Error getting steps:', error);
      return [];
    }
  }
}

export const procedureStepsService = new ProcedureStepsService(); 