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
    // Check if we have DeepSeek API available
    const response = await fetch('/api/deepseek/generate-yaml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        steps: steps.map((step, index) => ({
          id: `step_${index + 1}`,
          content: step,
          comments: []
        })),
        procedureName: 'Generated Procedure'
      }),
    });

    if (!response.ok) {
      console.warn('DeepSeek API failed, using fallback YAML generation');
      return {
        yaml: generateFallbackYaml(steps),
        error: 'AI generation failed, using fallback YAML'
      };
    }

    const data = await response.json();
    return {
      yaml: data.yaml
    };
  } catch (error) {
    console.error('Error in generateProcedureYaml:', error);
    return {
      yaml: generateFallbackYaml(steps),
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate fallback YAML when AI generation fails
 */
function generateFallbackYaml(steps: string[]): string {
  let yaml = "procedure_name: Generated Procedure\n";
  yaml += "purpose: Procedure generated from provided steps.\n";
  
  yaml += "stages:\n";
  if (steps && steps.length > 0) {
    steps.forEach((step, index) => {
      yaml += `    - Step ${index + 1}: ${step || `Operation ${index + 1}`}\n`;
    });
  } else {
    yaml += "    - No steps provided\n";
  }
  
  yaml += "considerations:\n";
  yaml += "    - pre-operative:\n";
  yaml += "        - Review procedure requirements\n";
  yaml += "    - intra-operative:\n";
  yaml += "        - Follow each step carefully\n";
  yaml += "    - post-operative:\n";
  yaml += "        - Verify completion\n";
  
  yaml += "goals:\n";
  yaml += "    - Complete procedure successfully\n";
  
  // Add internal steps section for flowchart
  yaml += "\n# Internal mapping for flowchart\n";
  yaml += "steps:\n";
  
  if (steps && steps.length > 0) {
    steps.forEach((step, index) => {
      const stepId = `step_${index + 1}`;
      const nextId = index < steps.length - 1 ? `step_${index + 2}` : undefined;
      
      yaml += `  - id: ${stepId}\n`;
      yaml += `    title: ${step || `Step ${index + 1}`}\n`;
      
      if (nextId) {
        yaml += `    next: ${nextId}\n`;
      } else {
        yaml += `    is_terminal: true\n`;
      }
    });
  } else {
    yaml += "  - id: start\n    title: Start\n    is_terminal: true\n";
  }
  
  return yaml;
} 