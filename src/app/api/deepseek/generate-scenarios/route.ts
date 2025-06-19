import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error('DEEPSEEK_API_KEY is not defined in environment variables.');
}

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: apiKey,
});

export async function POST(request: Request) {
  try {
    console.log('DeepSeek generate-scenarios API route called.');
    const { yamlContent, objects } = await request.json();

    if (!yamlContent) {
      return NextResponse.json(
        { error: 'YAML content is required' },
        { status: 400 }
      );
    }

    const prompt = `Analyze the following YAML procedure and available objects to generate interactive scenario steps for simulation. Each step should be engaging and educational.

YAML Procedure:
${yamlContent}

Available Objects: ${objects ? JSON.stringify(objects) : 'No objects available'}

Generate 5-8 scenario steps that would create an engaging interactive simulation. Each step should be returned in the following JSON format:

{
  "scenarios": [
    {
      "id": "unique_id",
      "title": "Step Title",
      "description": "Detailed description of what the user should do",
      "instructions": "Clear instructions for the user",
      "requiredObjects": ["object_id1", "object_id2"],
      "optionalObjects": ["object_id3"],
      "isCheckpoint": true/false,
      "timeLimit": 120,
      "hints": [
        "Helpful hint for the user",
        "Another hint if needed"
      ],
      "successCriteria": [
        "What defines success for this step"
      ],
      "nextSteps": ["next_step_id1", "next_step_id2"]
    }
  ]
}

Focus on creating steps that:
1. Follow the logical flow of the procedure
2. Require interaction with the available objects
3. Include decision points and branching paths
4. Provide clear feedback and guidance
5. Are educational and realistic
6. Include checkpoints for validation
7. Have appropriate time limits

Return ONLY the JSON object, no additional text or markdown formatting.`;

    console.log('Sending request to DeepSeek for scenario generation...');
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert in creating interactive educational scenarios. Generate engaging, educational steps based on procedure YAML and available objects."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 2500
    });

    const generatedContent = completion.choices[0]?.message?.content || '';
    console.log('Raw response from DeepSeek (scenarios):', generatedContent);

    // Parse the JSON response
    try {
      const parsedScenarios = JSON.parse(generatedContent);
      
      if (!parsedScenarios.scenarios || !Array.isArray(parsedScenarios.scenarios)) {
        throw new Error('Invalid scenario structure in response');
      }

      console.log('Successfully generated scenarios:', parsedScenarios.scenarios.length);
      return NextResponse.json({ scenarios: parsedScenarios.scenarios });

    } catch (parseError) {
      console.error('Error parsing generated scenarios JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse generated scenarios' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in DeepSeek generate-scenarios API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown DeepSeek API error';
    return NextResponse.json(
      { error: 'Failed to generate scenarios with DeepSeek', details: errorMessage },
      { status: 500 }
    );
  }
} 