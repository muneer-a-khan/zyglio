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
    console.log('DeepSeek generate-triggers API route called.');
    const { yamlContent, objects, scenarios } = await request.json();

    if (!yamlContent) {
      return NextResponse.json(
        { error: 'YAML content is required' },
        { status: 400 }
      );
    }

    const prompt = `Analyze the following YAML procedure, available objects, and scenario steps to generate intelligent triggers for the simulation. Triggers should respond to user actions and object states.

YAML Procedure:
${yamlContent}

Available Objects: ${objects ? JSON.stringify(objects) : 'No objects available'}

Available Scenarios: ${scenarios ? JSON.stringify(scenarios) : 'No scenarios available'}

Generate 4-6 intelligent triggers that would enhance the simulation experience. Each trigger should be returned in the following JSON format:

{
  "triggers": [
    {
      "id": "unique_id",
      "name": "Trigger Name",
      "description": "What this trigger does",
      "objectId": "object_id",
      "condition": {
        "type": "state_change|interaction|timeout|sequence",
        "parameters": {
          "state": "state_name",
          "operator": "equals|not_equals|contains",
          "value": "expected_value"
        }
      },
      "actions": [
        {
          "type": "play_audio|show_visual|change_state|advance_scenario",
          "parameters": {
            "message": "Action description",
            "target": "target_object_or_scenario"
          }
        }
      ],
      "isActive": true,
      "priority": 1,
      "cooldown": 5000
    }
  ]
}

Focus on creating triggers that:
1. Respond to object state changes
2. Provide helpful feedback to users
3. Guide users through the procedure
4. Detect errors or incorrect actions
5. Reward correct actions
6. Create realistic simulation responses
7. Have appropriate timing and conditions

Return ONLY the JSON object, no additional text or markdown formatting.`;

    console.log('Sending request to DeepSeek for trigger generation...');
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert in creating intelligent simulation triggers. Generate responsive, educational triggers based on procedure YAML, objects, and scenarios."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const generatedContent = completion.choices[0]?.message?.content || '';
    console.log('Raw response from DeepSeek (triggers):', generatedContent);

    // Parse the JSON response
    try {
      const parsedTriggers = JSON.parse(generatedContent);
      
      if (!parsedTriggers.triggers || !Array.isArray(parsedTriggers.triggers)) {
        throw new Error('Invalid trigger structure in response');
      }

      console.log('Successfully generated triggers:', parsedTriggers.triggers.length);
      return NextResponse.json({ triggers: parsedTriggers.triggers });

    } catch (parseError) {
      console.error('Error parsing generated triggers JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse generated triggers' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in DeepSeek generate-triggers API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown DeepSeek API error';
    return NextResponse.json(
      { error: 'Failed to generate triggers with DeepSeek', details: errorMessage },
      { status: 500 }
    );
  }
} 