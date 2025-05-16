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
stages:
    - Step Title 1: Detailed description of the first action or phase.
    - Step Title 2: Detailed description of the second action or phase.
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

    const prompt = `Given the procedure name "${procedureName}" and the following list of procedure steps, generate a comprehensive YAML document. The YAML must strictly adhere to the provided format template.

Format Template (use this structure):
\`\`\`yaml
procedure_name: "${procedureName}" # Use this exact procedure name
purpose: A concise statement explaining the overall objective of the procedure.
stages:
    # Each item from 'Procedure Steps to incorporate' below should be a distinct item here, formatted as "- Title: Description".
    # Example: - Collect all necessary tools: Ensure all tools are sterile and accounted for.
considerations:
    pre-operative:
        - # Detail 1
    intra-operative:
        - # Detail 1
    post-operative:
        - # Detail 1
goals:
    - # Goal 1
complications: # (Optional: Include if inferable from steps)
    - # Potential issue 1
conditionals: # (Optional: Include if inferable from steps)
    - # if X then Y: description
\`\`\`

Procedure Name:
${procedureName}

Procedure Steps to incorporate into the YAML (interpret each line as a step, typically in "Title: Description" format):
${formattedStepsForPrompt}

Detailed Instructions for YAML generation:
1.  **procedure_name**: This field MUST be exactly: "${procedureName}". Do not change or generate this.
2.  **purpose**: Write a clear, brief statement explaining the overall objective of this procedure, based on the provided steps and name.
3.  **stages**: List each provided step from 'Procedure Steps to incorporate' under this section. 
    *   Each step from the input should be a distinct item in the YAML 'stages' list.
    *   The format for each stage item MUST be "- Title: Description". Parse or infer the Title and Description from each input step line.
    *   Example: If an input step is "Perform incision: Make a 2cm incision at the marked site.", the YAML stage should be "- Perform incision: Make a 2cm incision at the marked site."
4.  **considerations**: 
    *   Based on the nature of the steps, infer and detail relevant pre-operative, intra-operative, and post-operative considerations. 
    *   If the steps do not clearly indicate all three (pre, intra, post), include only those that are relevant. If none are directly inferable, provide general examples appropriate for a technical/medical procedure. 
    *   Provide at least one or two points for each applicable consideration subsection.
5.  **goals**: Define at least two primary goals that this procedure aims to achieve, based on the steps and their implied purpose.
6.  **complications (optional)**: If the steps or procedure nature suggest potential complications or risks, list them under a 'complications' key. Each complication should be a list item. If not applicable, this section can be omitted.
7.  **conditionals (optional)**: If the steps imply any decision points or conditional logic (e.g., "if X, then Y"), describe them under a 'conditionals' key. If not applicable, this section can be omitted.

Your response must be ONLY the YAML content, starting directly with "procedure_name:". Ensure perfect YAML syntax, including correct indentation (typically 2 spaces for lists/nested items). Do not include any extra text, explanations, or markdown formatting (like \`\`\`yaml) outside the YAML itself.
`;

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
      // Add more specific checks if needed, e.g., presence of procedure_name, stages, etc.
      if (!('procedure_name' in parsedYaml) || !('stages' in parsedYaml) || !('purpose' in parsedYaml) || !('considerations' in parsedYaml) || !('goals' in parsedYaml)) {
         console.error('Generated YAML missing required fields. Content:', generatedYaml);
         throw new Error('Generated YAML is missing one or more required fields (procedure_name, purpose, stages, considerations, goals).');
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