import { NextRequest, NextResponse } from 'next/server';
import { generateProcedureYaml } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { steps } = data;
    
    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'Invalid request: steps must be an array' },
        { status: 400 }
      );
    }
    
    const result = await generateProcedureYaml(steps);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in YAML generation API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate YAML', 
        yaml: generateFallbackYaml(Array.isArray(req.body) ? req.body : []) 
      },
      { status: 500 }
    );
  }
}

// Fallback YAML for server-side errors
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