import { NextResponse } from 'next/server';
import OpenAI from 'openai'; // Using OpenAI SDK for DeepSeek
import * as yaml from 'js-yaml';

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
    const { steps } = await request.json(); // Expecting steps array now

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'Steps array is required and must not be empty' },
        { status: 400 }
      );
    }

    const sampleYaml = `procedure_name: Example Procedure Name
purpose: A concise statement explaining the overall objective of the procedure.
stages:
    - Step Title 1: Detailed description of the first action or phase.
    - Step Title 2: Detailed description of the second action or phase.
considerations:
    - pre-operative:
        - Detail 1: Specific check or preparation before starting.
        - Detail 2: Another pre-start check or preparation.
    - intra-operative:
        - Detail 1: Important factor to monitor or manage during the procedure.
        - Detail 2: Another key point for during the procedure.
    - post-operative:
        - Detail 1: Follow-up action or observation after completion.
        - Detail 2: Another post-completion task.
goals:
    - Goal 1: A specific, measurable outcome of the procedure.
    - Goal 2: Another key objective to be achieved.`;

    const formattedSteps = steps.join('\n');

    const prompt = `Given the following list of procedure steps, generate a comprehensive YAML document. The YAML must strictly adhere to the provided format. 

Format Template:
${sampleYaml}

Procedure Steps to incorporate into the YAML:
${formattedSteps}

Instructions for YAML generation:
1.  **procedure_name**: Create a concise and descriptive name for the entire procedure based on the provided steps.
2.  **purpose**: Write a clear, brief statement explaining the overall objective of this procedure.
3.  **stages**: List each provided step under this section. Each step from the input should be a distinct item in the YAML 'stages' list, formatted as "- Step Title: Step Description". Ensure the title and description are accurately reflected from the input steps.
4.  **considerations**: 
    *   Based on the nature of the steps, infer and detail relevant pre-operative, intra-operative, and post-operative considerations. 
    *   If the steps do not clearly indicate all three (pre, intra, post), include only those that are relevant or can be reasonably inferred. If none are directly inferable, provide general examples appropriate for a technical/medical procedure.
    *   Include at least two to three points for each applicable consideration subsection (pre-operative, intra-operative, post-operative).
5.  **goals**: Define at least two to three primary goals that this procedure aims to achieve, based on the steps and their implied purpose.
6.  **complications (optional)**: If the steps suggest potential complications or risks, list them under a 'complications' key. Each complication should be a list item.
7.  **conditionals (optional)**: If the steps imply any decision points or conditional logic (e.g., "if X, then Y"), describe them under a 'conditionals' key.

Your response must be ONLY the YAML content, starting directly with "procedure_name:". Ensure perfect YAML syntax, including correct indentation (2 spaces for lists/nested items). Do not include any extra text, explanations, or markdown formatting outside the YAML itself.
`;

    console.log('Sending request to DeepSeek for YAML generation...');
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