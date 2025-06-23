// Assuming a DeepSeek SDK similar to OpenAI's, e.g., 'deepseek-sdk'
// You might need to install it: npm install deepseek-sdk
// And adjust the import and client instantiation below.
import OpenAI from 'openai';

// Initialize the DeepSeek client (using OpenAI's SDK which works with DeepSeek's API)
const apiKey = process.env.DEEPSEEK_API_KEY;

// Export the DeepSeek API client for use in other files
export const deepseekApi = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: apiKey,
});

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