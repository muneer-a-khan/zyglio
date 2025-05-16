import axios from 'axios';

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Use direct environment variable access for server components only
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Define the API URL for DeepSeek
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY; // Fallback to OpenAI key if DeepSeek not set

/**
 * Generate a detailed YAML structure for a procedure using OpenAI
 * Server-side only function
 */
export async function generateProcedureYaml(
  steps: string[],
  modelName: string = 'gpt-3.5-turbo'
): Promise<{ yaml: string; error?: string }> {
  console.log('[OpenAI] generateProcedureYaml called with steps:', steps);
  console.log('[OpenAI] API Key available?', !!OPENAI_API_KEY);
  
  try {
    if (!OPENAI_API_KEY) {
      console.error('[OpenAI] ERROR: API key is not defined');
      return { 
        yaml: generateFallbackYaml(steps),
        error: 'OpenAI API key is not defined'
      };
    }

    // Create a structured prompt with the sample YAML format
    const prompt = createPrompt(steps);
    console.log('[OpenAI] Generated prompt:', prompt.substring(0, 500) + '... (truncated)');

    console.log('[OpenAI] Making API request to OpenAI');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a medical procedure documentation expert who creates detailed YAML representations of procedures with descriptive steps, decision points, and proper structure.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI] API error:', response.status, response.statusText, errorText);
      return {
        yaml: generateFallbackYaml(steps),
        error: `OpenAI API error: ${response.status} ${response.statusText}`
      };
    }

    console.log('[OpenAI] Received successful response from OpenAI API');
    const data = await response.json() as OpenAIResponse;
    
    if (data.choices && data.choices.length > 0) {
      const generatedYaml = data.choices[0].message.content.trim();
      console.log('[OpenAI] Raw YAML from OpenAI:', generatedYaml.substring(0, 500) + '... (truncated)');
      
      // Add the hidden steps section for the flowchart
      const finalYaml = addFlowchartStepsToYaml(generatedYaml, steps);
      console.log('[OpenAI] Final processed YAML (with steps section):', finalYaml.substring(0, 500) + '... (truncated)');
      
      return { yaml: finalYaml };
    } else {
      console.error('[OpenAI] No choices in API response:', data);
      return {
        yaml: generateFallbackYaml(steps),
        error: 'No response from OpenAI API'
      };
    }
  } catch (error) {
    console.error('[OpenAI] Error in generateProcedureYaml:', error);
    return { 
      yaml: generateFallbackYaml(steps),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a prompt for the OpenAI API with instructions and sample format
 */
function createPrompt(steps: string[]): string {
  const sampleYaml = `procedure_name: Lumbar Spinal Fusion
purpose: To stabilize the spine, reduce pain and nerve irritation, prevent further degeneration, protect nerves from compression, and restore spinal strength, improving patient quality of life.
stages:
    - Incision: A midline or lateral incision is made over the affected vertebrae.
    - Exposure: Muscles and tissues are retracted to access the spine.
    - Disc Excision: The intervertebral disc is removed if necessary.
    - Graft Placement: Autograft, allograft, or synthetic bone graft material is placed between the vertebrae.
    - Stabilization: Vertebrae are secured with screws, rods, or cages to provide stability.
    - Closure: The incision is sutured in layers and dressed.
considerations:
    - pre-operative:
        - Confirm the source of instability, deformity, or pain with imaging (MRI, CT, X-ray).
        - Assess the patient's medical history and risks.
        - General anesthesia is administered.
    - intra-operative:
        - Minimize tissue damage during incision and muscle retraction.
        - Avoid excessive bone removal during disc excision.
        - Select the appropriate bone graft type.
        - Position implants carefully.
        - Verify proper screw placement with intraoperative imaging to avoid nerve or vessel injury.
        - Ensure adequate decompression of spinal nerves.
        - Control bleeding.
    - post-operative:
        - Monitor for complications such as bleeding, infection, or nerve damage.
        - Implement physical therapy and gradual activity resumption.
        - Monitor bone healing with periodic imaging.
goals:
    - Stabilize the spine.
    - Alleviate chronic back or leg pain.
    - Restore proper spinal alignment.
    - Halt the worsening of adjacent spinal structures.
    - Enhance mobility and quality of life.
    - Relieve pressure on spinal nerves.
    - Provide long-term structural support to the lower back.`;

  let prompt = `I need you to create a detailed YAML representation of a medical or technical procedure following this exact structure:

${sampleYaml}

I have the following steps that need to be formatted into this structure:

${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Please generate a well-structured YAML with:
1. An appropriate procedure_name based on the steps
2. A detailed purpose statement
3. The stages section should include each step with a descriptive title followed by a colon and explanation
4. Comprehensive pre-operative, intra-operative, and post-operative considerations
5. Relevant goals
6. Include at least one decision point if appropriate for the procedure

Your response should be ONLY the YAML, with no additional text, explanations, or markdown. Start directly with "procedure_name:".`;

  return prompt;
}

type MappedStep = {
  id: string;
  title: string;
  description: string;
  next: string | null | undefined;
  is_terminal: boolean;
};

/**
 * Add the hidden steps section to the generated YAML for the flowchart
 */
function addFlowchartStepsToYaml(yaml: string, originalSteps: string[]): string {
  // Extract stages from generated YAML
  const stagesMatch = yaml.match(/stages:\s*\n((?:\s*-.*\n)+)/);
  
  if (!stagesMatch || !stagesMatch[1]) {
    return yaml + generateStepsSection(originalSteps);
  }
  
  // Parse the stages
  const stagesLines = stagesMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
  const stages = stagesLines.map(line => {
    const trimmed = line.trim().substring(1).trim(); // Remove the dash and trim
    const parts = trimmed.split(':');
    return {
      title: parts[0].trim(),
      description: parts.length > 1 ? parts.slice(1).join(':').trim() : ''
    };
  });
  
  // Generate unique IDs for each stage
  const stepsWithIds: MappedStep[] = stages.map((stage, index): MappedStep => {
    // Create a slug-like ID from the title
    const id = stage.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `step${index + 1}`;
    
    return {
      id,
      title: stage.title,
      description: stage.description,
      next: null, // Initialize as null, type MappedStep allows string assignment later
      is_terminal: index === stages.length - 1
    };
  });
  
  // Set next links
  for (let i = 0; i < stepsWithIds.length - 1; i++) {
    if (stepsWithIds[i+1]) { // Check if the next element exists
        stepsWithIds[i].next = stepsWithIds[i + 1].id;
    }
  }
  
  // Generate steps section YAML
  let stepsYaml = '\n# Internal mapping for flowchart (not displayed)\nsteps:\n';
  
  stepsWithIds.forEach(step => {
    stepsYaml += `  - id: ${step.id}\n`;
    stepsYaml += `    title: ${step.title}\n`;
    if (step.description) {
      stepsYaml += `    description: ${step.description}\n`;
    }
    if (step.next) {
      stepsYaml += `    next: ${step.next}\n`;
    }
    if (step.is_terminal) {
      stepsYaml += `    is_terminal: true\n`;
    }
  });
  
  return yaml + stepsYaml;
}

/**
 * Generate a simple steps section for the flowchart if stage parsing fails
 */
function generateStepsSection(steps: string[]): string {
  let yaml = '\n# Internal mapping for flowchart (not displayed)\nsteps:\n';
  
  steps.forEach((step, index) => {
    const stepId = `step${index + 1}`;
    const nextId = index < steps.length - 1 ? `step${index + 2}` : undefined;
    
    yaml += `  - id: ${stepId}\n`;
    yaml += `    title: ${step || `Step ${index + 1}`}\n`;
    
    if (nextId) {
      yaml += `    next: ${nextId}\n`;
    } else {
      yaml += `    is_terminal: true\n`;
    }
  });
  
  return yaml;
}

/**
 * Generate fallback YAML when OpenAI API call fails
 */
function generateFallbackYaml(steps: string[]): string {
  let yaml = "procedure_name: Standard Procedure\n";
  yaml += "purpose: To perform a standardized sequence of steps to achieve a desired outcome efficiently and safely.\n";
  
  yaml += "stages:\n";
  steps.forEach((step, index) => {
    yaml += `    - Step ${index + 1}: ${step || `Perform operation ${index + 1}`}\n`;
  });
  
  yaml += "considerations:\n";
  yaml += "    - pre-operative:\n";
  yaml += "        - Review procedure details\n";
  yaml += "        - Prepare necessary equipment\n";
  yaml += "    - intra-operative:\n";
  yaml += "        - Monitor progress through steps\n";
  yaml += "        - Document any deviations\n";
  yaml += "    - post-operative:\n";
  yaml += "        - Review outcome\n";
  yaml += "        - Plan follow-up\n";
  
  yaml += "goals:\n";
  yaml += "    - Successfully complete the procedure\n";
  yaml += "    - Document all steps accurately\n";
  yaml += "    - Ensure quality control\n";
  
  // Add internal steps section for flowchart
  yaml += "\n# Internal mapping for flowchart (not displayed)\n";
  yaml += "steps:\n";
  
  steps.forEach((step, index) => {
    const stepId = `step${index + 1}`;
    const nextId = index < steps.length - 1 ? `step${index + 2}` : undefined;
    
    yaml += `  - id: ${stepId}\n`;
    yaml += `    title: ${step || `Step ${index + 1}`}\n`;
    
    if (nextId) {
      yaml += `    next: ${nextId}\n`;
    } else {
      yaml += `    is_terminal: true\n`;
    }
  });
  
  return yaml;
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
      throw new Error('Failed to generate steps from transcript');
    }

    const data = await response.json();
    return data.steps;
  } catch (error) {
    console.error('Error generating steps from transcript:', error);
    throw error;
  }
}

/**
 * Generate YAML from transcript using DeepSeek API
 */
export async function generateYamlFromTranscript(transcript: string): Promise<string> {
  try {
    const response = await fetch('/api/deepseek/generate-yaml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate YAML from transcript');
    }

    const data = await response.json();
    return data.yaml;
  } catch (error) {
    console.error('Error generating YAML from transcript:', error);
    throw error;
  }
}

/**
 * Makes a direct call to the DeepSeek API
 */
export async function callDeepSeekAPI(messages: any[], model: string = 'deepseek-chat'): Promise<string> {
  try {
    // This would typically be handled server-side to protect your API key
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('No response content from DeepSeek API');
    }
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw error;
  }
} 