import { NextRequest, NextResponse } from 'next/server';
import { generateProcedureYaml } from '@/lib/openai';

export async function POST(req: NextRequest) {
  console.log('[API /api/yaml] Received POST request');
  try {
    const data = await req.json();
    const { steps } = data;
    console.log('[API /api/yaml] Request body steps:', steps);
    
    if (!steps || !Array.isArray(steps) || steps.length === 0 || steps.every(s => typeof s !== 'string' || s.trim() === '')) {
      console.error('[API /api/yaml] Invalid request: steps must be a non-empty array of strings.');
      return NextResponse.json(
        { error: 'Invalid request: steps must be a non-empty array of strings.', yaml: generateFallbackYaml([]) },
        { status: 400 }
      );
    }
    
    console.log('[API /api/yaml] Calling generateProcedureYaml with steps:', steps);
    const result = await generateProcedureYaml(steps);
    
    console.log('[API /api/yaml] Result from generateProcedureYaml:', JSON.stringify(result, null, 2));

    if (result.error) {
      console.warn('[API /api/yaml] generateProcedureYaml returned an error message:', result.error);
      // Still return the YAML from result, as it might be a fallback YAML from openai.ts
      return NextResponse.json(result, { status: 200 }); // Or decide on a different status if error is critical
    }
    
    console.log('[API /api/yaml] Successfully generated YAML. Sending response.');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API /api/yaml] CRITICAL ERROR in POST handler:', error.message, error.stack);
    // Ensure steps are available for fallback, even if body parsing failed, pass empty array
    let requestSteps: string[] = [];
    try {
        // Attempt to re-parse or get steps if possible, otherwise default to empty
        const requestBody = await req.json(); 
        if(requestBody && Array.isArray(requestBody.steps)) {
            requestSteps = requestBody.steps;
        }
    } catch (parseError) {
        console.error('[API /api/yaml] Error parsing request body in catch block:', parseError);
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate YAML due to a server error.', 
        yaml: generateFallbackYaml(requestSteps) 
      },
      { status: 500 }
    );
  }
}

// Fallback YAML for server-side errors
function generateFallbackYaml(steps: string[]): string {
  console.log('[API /api/yaml] Generating fallback YAML for steps:', steps);
  let yaml = "procedure_name: Fallback Procedure (Server Error)\n";
  yaml += "purpose: To provide a basic structure when AI generation failed.\n";
  
  yaml += "stages:\n";
  if (steps && steps.length > 0) {
    steps.forEach((step, index) => {
      yaml += `    - Step ${index + 1}: ${step || `Fallback operation ${index + 1}`}\n`;
    });
  } else {
    yaml += "    - No specific steps were provided to the fallback generator.\n";
  }
  
  yaml += "considerations:\n";
  yaml += "    - pre-operative:\n";
  yaml += "        - Check server logs for error details.\n";
  yaml += "    - intra-operative:\n";
  yaml += "        - AI processing failed.\n";
  yaml += "    - post-operative:\n";
  yaml += "        - Review input and try again.\n";
  
  yaml += "goals:\n";
  yaml += "    - Identify the cause of the AI generation failure.\n";
  
  // Add internal steps section for flowchart
  yaml += "\n# Internal mapping for flowchart (not displayed)\n";
  yaml += "steps:\n";
  
  if (steps && steps.length > 0) {
    steps.forEach((step, index) => {
      const stepId = `fallback_step_${index + 1}`;
      const nextId = index < steps.length - 1 ? `fallback_step_${index + 2}` : undefined;
      const title = step || `Fallback Step ${index + 1}`;
      
      yaml += `  - id: ${stepId}\n`;
      yaml += `    title: ${title}\n`;
      
      if (nextId) {
        yaml += `    next: ${nextId}\n`;
      } else {
        yaml += `    is_terminal: true\n`;
      }
    });
  } else {
    yaml += "  - id: fallback_start\n    title: Fallback Start\n    is_terminal: true\n";
  }
  
  return yaml;
} 