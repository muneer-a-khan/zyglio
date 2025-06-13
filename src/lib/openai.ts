import { generateYamlFromSteps } from './deepseek';

/**
 * OpenAI integration for generating procedure YAML from steps
 */

interface GenerateYamlResult {
  yaml: string;
  error?: string;
}

/**
 * Generate procedure YAML from steps using AI
 */
export async function generateProcedureYaml(steps: string[]): Promise<GenerateYamlResult> {
  try {
    // Validate input
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      console.warn('generateProcedureYaml: Invalid steps input, using fallback');
      return {
        yaml: generateFallbackYaml(steps || []),
        error: 'Invalid input: steps must be a non-empty array'
      };
    }

    // Filter out empty steps
    const validSteps = steps.filter(step => typeof step === 'string' && step.trim() !== '');
    
    if (validSteps.length === 0) {
      console.warn('generateProcedureYaml: No valid steps found, using fallback');
      return {
        yaml: generateFallbackYaml(steps),
        error: 'No valid steps provided'
      };
    }

    console.log('generateProcedureYaml: Calling DeepSeek API with steps:', validSteps);
    
    // Convert string steps to Step objects for DeepSeek API
    const stepObjects = validSteps.map((step, index) => ({
      id: `step_${index + 1}`,
      content: step.trim(),
      comments: []
    }));
    
    // Try to generate YAML using DeepSeek
    const yamlResult = await generateYamlFromSteps(stepObjects, 'AI-Generated Procedure');
    
    if (yamlResult && typeof yamlResult === 'string' && yamlResult.trim()) {
      console.log('generateProcedureYaml: Successfully generated YAML via DeepSeek');
      return { yaml: yamlResult };
    } else {
      console.warn('generateProcedureYaml: DeepSeek returned empty or invalid YAML, using fallback');
      return {
        yaml: generateFallbackYaml(validSteps),
        error: 'AI generated empty or invalid YAML'
      };
    }
  } catch (error: any) {
    console.error('generateProcedureYaml: Error calling DeepSeek API:', error);
    return {
      yaml: generateFallbackYaml(steps || []),
      error: `Failed to generate YAML: ${error.message}`
    };
  }
}

/**
 * Generate fallback YAML when AI generation fails
 */
function generateFallbackYaml(steps: string[]): string {
  console.log('generateFallbackYaml: Generating fallback YAML for steps:', steps);
  
  let yaml = "procedure_name: AI-Generated Procedure\n";
  yaml += "purpose: Structured procedure based on provided steps.\n";
  
  yaml += "stages:\n";
  if (steps && steps.length > 0) {
    const validSteps = steps.filter(step => typeof step === 'string' && step.trim() !== '');
    if (validSteps.length > 0) {
      validSteps.forEach((step, index) => {
        yaml += `    - Step ${index + 1}: ${step.trim()}\n`;
      });
    } else {
      yaml += "    - No valid steps provided\n";
    }
  } else {
    yaml += "    - No steps provided\n";
  }
  
  yaml += "considerations:\n";
  yaml += "    - pre-operative:\n";
  yaml += "        - Review all steps carefully.\n";
  yaml += "        - Ensure all equipment is ready.\n";
  yaml += "    - intra-operative:\n";
  yaml += "        - Follow each step methodically.\n";
  yaml += "        - Monitor progress continuously.\n";
  yaml += "    - post-operative:\n";
  yaml += "        - Review completed procedure.\n";
  yaml += "        - Document any variations.\n";
  
  yaml += "goals:\n";
  yaml += "    - Complete the procedure successfully.\n";
  yaml += "    - Ensure quality outcomes.\n";
  
  // Add internal steps section for flowchart
  yaml += "\n# Internal mapping for flowchart (not displayed)\n";
  yaml += "steps:\n";
  
  if (steps && steps.length > 0) {
    const validSteps = steps.filter(step => typeof step === 'string' && step.trim() !== '');
    if (validSteps.length > 0) {
      validSteps.forEach((step, index) => {
        const stepId = `step_${index + 1}`;
        const nextId = index < validSteps.length - 1 ? `step_${index + 2}` : undefined;
        const title = step.trim();
        
        yaml += `  - id: ${stepId}\n`;
        yaml += `    title: ${title}\n`;
        
        if (nextId) {
          yaml += `    next: ${nextId}\n`;
        } else {
          yaml += `    is_terminal: true\n`;
        }
      });
    } else {
      yaml += "  - id: start\n    title: Begin Procedure\n    is_terminal: true\n";
    }
  } else {
    yaml += "  - id: start\n    title: Begin Procedure\n    is_terminal: true\n";
  }
  
  return yaml;
} 