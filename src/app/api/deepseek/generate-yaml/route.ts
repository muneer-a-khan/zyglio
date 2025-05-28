import { NextResponse } from 'next/server';
import OpenAI from 'openai'; // Using OpenAI SDK for DeepSeek
import * as yaml from 'js-yaml';

// Define Step interface for clarity if not already centrally available
// This should match the structure sent from the client
interface Step {
  id: string;
  content: string; // e.g., "Step Title: Step description."
  comments: string[];
}

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error('DEEPSEEK_API_KEY is not defined in environment variables.');
}

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1', // Make sure this is the correct DeepSeek API base URL
  apiKey: apiKey,
});

export async function POST(request: Request) {
  try {
    console.log('DeepSeek generate-yaml API route called.');
    const { steps, procedureName } = await request.json(); // Expecting steps array and procedureName

    if (!procedureName || typeof procedureName !== 'string' || procedureName.trim() === '') {
      return NextResponse.json(
        { error: 'procedureName is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'Steps array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate structure of each step minimally (e.g., has content)
    for (const step of steps) {
      if (typeof step !== 'object' || step === null || typeof step.content !== 'string' || step.content.trim() === '') {
        return NextResponse.json(
          { error: 'Each step in the steps array must be an object with a non-empty content string.' },
          { status: 400 }
        );
      }
    }

    const sampleYaml = `procedure_name: ${procedureName} # THIS WILL BE REPLACED BY THE PROVIDED procedureName
purpose: A concise statement explaining the overall objective of the procedure.
steps:
  - id: step_1
    title: "First Step Title"
    description: "Detailed description of the first action"
    next: step_2
  - id: step_2
    title: "Decision Point Example"
    description: "A step that requires a decision"
    decision_point: true
    options:
      - choice: "Yes - Continue"
        next: step_3
        condition: "If conditions are met"
      - choice: "No - Alternative"
        next: step_4
        condition: "If conditions are not met"
  - id: step_3
    title: "Positive Path Step"
    description: "Action taken if yes was chosen"
    next: step_5
  - id: step_4
    title: "Alternative Path Step"
    description: "Action taken if no was chosen"
    next: step_5
  - id: step_5
    title: "Final Step"
    description: "Concluding action"
    is_terminal: true
considerations:
    - pre-operative:
        - Detail 1: Specific check or preparation before starting.
    - intra-operative:
        - Detail 1: Important factor to monitor or manage during the procedure.
    - post-operative:
        - Detail 1: Follow-up action or observation after completion.
goals:
    - Goal 1: A specific, measurable outcome of the procedure.
    # Optional sections based on inference
# complications:
#     - Potential issue 1
# conditionals:
#     - if X then Y: description`;

    // Extract just the content for the prompt, as the AI will format it into "Title: Description"
    const formattedStepsForPrompt = steps.map((step: Step, index: number) => {
      // The step.content is expected to be in "Title: Description" format already from step generation AI
      // Or, if not, the AI for YAML generation needs to infer Title and Description from step.content
      return `${index + 1}. ${step.content}`;
    }).join('\n');

    const prompt = `Given the procedure name "${procedureName}" and the following list of procedure steps, generate a comprehensive YAML document for a decision tree flowchart. The YAML must strictly adhere to the provided format template.

Format Template (use this structure):
\`\`\`yaml
procedure_name: "${procedureName}" # Use this exact procedure name
purpose: A concise statement explaining the overall objective of the procedure.
steps:
  - id: step_1
    title: "Step Title"
    description: "Detailed description"
    next: step_2  # Next step ID
  - id: step_2
    title: "Decision Point Title"
    description: "Description of the decision"
    decision_point: true
    options:
      - choice: "Option 1"
        next: step_3
        condition: "When this condition is met"
      - choice: "Option 2"  
        next: step_4
        condition: "When this condition is met"
  - id: step_3
    title: "Outcome Step"
    description: "Result of choice 1"
    next: step_5
  # Continue with more steps...
  - id: final_step
    title: "Final Step"
    description: "Concluding action"
    is_terminal: true
considerations:
    pre-operative:
        - Detail 1
    intra-operative:
        - Detail 1  
    post-operative:
        - Detail 1
goals:
    - Goal 1
\`\`\`

Procedure Name:
${procedureName}

Procedure Steps to incorporate into the YAML:
${formattedStepsForPrompt}

Detailed Instructions for YAML generation:
1.  **procedure_name**: This field MUST be exactly: "${procedureName}". Do not change or generate this.
2.  **purpose**: Write a clear, brief statement explaining the overall objective of this procedure.
3.  **steps**: Convert each provided step into a structured step object with:
    *   **id**: Unique identifier (step_1, step_2, etc.)
    *   **title**: Short, descriptive title for the step
    *   **description**: Detailed description of what needs to be done
    *   **next**: ID of the next step (for linear flow)
    *   **decision_point**: Set to true if this step requires a decision
    *   **options**: Array of choices for decision points, each with:
        - **choice**: The decision option text
        - **next**: ID of the step to go to if this choice is selected
        - **condition**: Description of when this choice applies
    *   **is_terminal**: Set to true for the final step
4.  **Create decision points**: Where logical in the procedure, create decision points with 2-3 options each. Look for steps that naturally involve choices, conditions, or branching paths.
5.  **considerations**: Based on the steps, provide relevant pre-operative, intra-operative, and post-operative considerations.
6.  **goals**: Define at least two primary goals this procedure aims to achieve.

Ensure all step IDs are unique and properly referenced in 'next' fields. Create a logical flow with appropriate decision points for a meaningful flowchart.

Your response must be ONLY the YAML content, starting directly with "procedure_name:". Ensure perfect YAML syntax with correct indentation.`;

    console.log('Sending request to DeepSeek for YAML generation with procedureName:', procedureName);
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat", // Use the appropriate DeepSeek model
      messages: [
        {
          role: "system",
          content: "You are an expert in medical and technical procedure documentation. Your task is to generate a highly structured YAML document from a list of procedure steps, strictly following the provided format and instructions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more deterministic YAML output
      max_tokens: 2048 // Allow more tokens for potentially long YAML
    });

    let generatedYaml = completion.choices[0]?.message?.content || '';
    console.log('Raw response from DeepSeek (YAML):', generatedYaml);

    // Basic cleanup - remove potential markdown fences if DeepSeek adds them
    generatedYaml = generatedYaml.replace(/^```yaml\n/, '').replace(/\n```$/, '').trim();

    // Validate the YAML structure
    try {
      const parsedYaml = yaml.load(generatedYaml);
      if (typeof parsedYaml !== 'object' || parsedYaml === null) {
        throw new Error('Generated YAML is not a valid object.');
      }
      
      // Force the procedure_name to match exactly what was passed in
      if (typeof parsedYaml === 'object' && parsedYaml !== null) {
        const yamlObj = parsedYaml as any;
        if (yamlObj.procedure_name !== procedureName) {
          console.log(`Correcting procedure_name in YAML from "${yamlObj.procedure_name}" to "${procedureName}"`);
          
          // Replace the procedure_name in the raw YAML text to preserve formatting
          const nameRegex = /procedure_name:\s*["']?(.*?)["']?$/m;
          generatedYaml = generatedYaml.replace(
            nameRegex, 
            `procedure_name: "${procedureName}"`
          );
          
          // Re-parse to ensure our edit worked
          const recheck = yaml.load(generatedYaml) as any;
          if (recheck.procedure_name !== procedureName) {
            console.warn('Failed to update procedure_name in YAML string');
          }
        }
      }
      
      // Add more specific checks if needed, e.g., presence of procedure_name, stages, etc.
      if (!('procedure_name' in parsedYaml) || !('steps' in parsedYaml) || !('purpose' in parsedYaml) || !('considerations' in parsedYaml) || !('goals' in parsedYaml)) {
         console.error('Generated YAML missing required fields. Content:', generatedYaml);
         throw new Error('Generated YAML is missing one or more required fields (procedure_name, purpose, steps, considerations, goals).');
      }

      console.log('Successfully generated and validated YAML.');
      return NextResponse.json({ yaml: generatedYaml });

    } catch (validationError) {
      console.error('Generated YAML failed validation:', validationError);
      console.error('Problematic YAML content from DeepSeek:', generatedYaml);
      return NextResponse.json(
        { 
          error: 'DeepSeek generated invalid YAML', 
          details: validationError instanceof Error ? validationError.message : 'YAML validation failed',
          yaml_content: generatedYaml // Send back the problematic YAML for debugging
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in DeepSeek generate-yaml API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown DeepSeek API error';
    return NextResponse.json(
      { error: 'Failed to generate YAML with DeepSeek', details: errorMessage },
      { status: 500 }
    );
  }
} 