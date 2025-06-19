// Assuming a DeepSeek SDK similar to OpenAI's, e.g., 'deepseek-sdk'
// You might need to install it: npm install deepseek-sdk
// And adjust the import and client instantiation below.

// Define Step interface for clarity, matching what components use
interface Step {
  id: string;
  content: string;
  comments: string[];
}

/**
 * Generate steps from transcript using DeepSeek API
 */
export async function generateStepsFromTranscript(transcript: string): Promise<string[]> {
  try {
    const response = await fetch('/api/deepseek/generate-steps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate steps from transcript via DeepSeek');
    }

    const data = await response.json();
    return data.steps;
  } catch (error) {
    console.error('Error generating steps from transcript (DeepSeek):', error);
    throw error;
  }
}

/**
 * Generate YAML from steps using DeepSeek API
 */
export async function generateYamlFromSteps(steps: Step[], procedureName: string): Promise<string> {
  try {
    const response = await fetch('/api/deepseek/generate-yaml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ steps, procedureName }), // Pass full steps and procedureName
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate YAML from steps via DeepSeek');
    }

    const data = await response.json();
    return data.yaml;
  } catch (error) {
    console.error('Error generating YAML from steps (DeepSeek):', error);
    throw error;
  }
}

/**
 * Generate smart objects from YAML using DeepSeek API
 */
export async function generateObjectsFromYaml(yamlContent: string, procedureName?: string): Promise<any[]> {
  try {
    const response = await fetch('/api/deepseek/generate-objects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ yamlContent, procedureName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate objects from YAML via DeepSeek');
    }

    const data = await response.json();
    return data.objects || [];
  } catch (error) {
    console.error('Error generating objects from YAML (DeepSeek):', error);
    throw error;
  }
}

/**
 * Generate scenario steps from YAML using DeepSeek API
 */
export async function generateScenariosFromYaml(yamlContent: string, objects?: any[]): Promise<any[]> {
  try {
    const response = await fetch('/api/deepseek/generate-scenarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ yamlContent, objects }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate scenarios from YAML via DeepSeek');
    }

    const data = await response.json();
    return data.scenarios || [];
  } catch (error) {
    console.error('Error generating scenarios from YAML (DeepSeek):', error);
    throw error;
  }
}

/**
 * Generate triggers from YAML using DeepSeek API
 */
export async function generateTriggersFromYaml(yamlContent: string, objects?: any[], scenarios?: any[]): Promise<any[]> {
  try {
    const response = await fetch('/api/deepseek/generate-triggers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ yamlContent, objects, scenarios }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate triggers from YAML via DeepSeek');
    }

    const data = await response.json();
    return data.triggers || [];
  } catch (error) {
    console.error('Error generating triggers from YAML (DeepSeek):', error);
    throw error;
  }
} 