// Assuming a DeepSeek SDK similar to OpenAI's, e.g., 'deepseek-sdk'
// You might need to install it: npm install deepseek-sdk
// And adjust the import and client instantiation below.
import OpenAI from 'openai';

// Function to get DeepSeek API client (lazy initialization for server-side only)
export function getDeepSeekApi() {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    throw new Error('DeepSeek API client should only be used on the server side');
  }
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set. DeepSeek features will not work.');
  }

  // Store the original OPENAI_API_KEY if it exists
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  
  // Temporarily set a dummy OPENAI_API_KEY to bypass validation
  // The OpenAI SDK checks for this even when we're providing apiKey directly
  if (!originalOpenAIKey) {
    process.env.OPENAI_API_KEY = 'dummy-key-for-deepseek-initialization';
  }
  
  try {
    // Create the client with the DeepSeek API key and performance optimizations
    return new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: apiKey,
      timeout: 15000, // 15-second timeout
      maxRetries: 2,  // Retry failed requests
      defaultHeaders: {
        'Connection': 'keep-alive'
      }
    });
  } finally {
    // Restore the original environment or delete the dummy key
    if (!originalOpenAIKey) {
      delete process.env.OPENAI_API_KEY;
    }
  }
}

// For backward compatibility, keep the old export but make it conditional
export const deepseekApi = typeof window === 'undefined' ? (() => {
  try {
    // Don't call getDeepSeekApi() at import time to avoid 
    // initialization issues. Instead, return a proxy object
    // that calls getDeepSeekApi() only when methods are accessed.
    return new Proxy({}, {
      get: function(target, prop) {
        try {
          const api = getDeepSeekApi();
          // Handle method access - chat.completions.create, etc.
          if (prop === 'chat') {
            return api.chat;
          }
          // Handle any other property access
          return typeof api[prop] === 'function' 
            ? api[prop].bind(api) 
            : api[prop];
        } catch (error) {
          console.error('Error accessing DeepSeek API:', error);
          return undefined;
        }
      }
    });
  } catch {
    return null;
  }
})() : null;

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