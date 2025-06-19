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
    console.log('DeepSeek generate-objects API route called.');
    const { yamlContent, procedureName } = await request.json();

    if (!yamlContent) {
      return NextResponse.json(
        { error: 'YAML content is required' },
        { status: 400 }
      );
    }

    const prompt = `Analyze the following YAML procedure and generate smart objects that would be relevant for an interactive simulation. Each object should have realistic states, behaviors, and signals based on the procedure context.

YAML Procedure:
${yamlContent}

Generate 3-5 smart objects that would be useful for simulating this procedure. Each object should be returned in the following JSON format:

{
  "objects": [
    {
      "id": "unique_id",
      "name": "Object Name",
      "description": "Detailed description of the object",
      "type": "equipment|tool|patient|environment",
      "states": [
        {
          "id": "state_id",
          "name": "State Name",
          "description": "Description of this state"
        }
      ],
      "behaviors": [
        {
          "id": "behavior_id",
          "name": "Behavior Name",
          "description": "What this behavior does",
          "triggers": ["state_id"],
          "actions": ["action_description"]
        }
      ],
      "signals": [
        {
          "id": "signal_id",
          "name": "Signal Name",
          "type": "audio|visual|haptic",
          "description": "What this signal indicates"
        }
      ],
      "position": {
        "x": 100,
        "y": 100,
        "z": 0
      }
    }
  ]
}

Focus on objects that:
1. Are directly mentioned in the procedure steps
2. Would be used by the practitioner
3. Could have different states during the procedure
4. Might provide feedback or signals
5. Are relevant to the procedure's domain (medical, technical, etc.)

Return ONLY the JSON object, no additional text or markdown formatting.`;

    console.log('Sending request to DeepSeek for object generation...');
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert in creating interactive simulation objects. Generate realistic, useful objects based on procedure YAML."
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
    console.log('Raw response from DeepSeek (objects):', generatedContent);

    // Parse the JSON response
    try {
      const parsedObjects = JSON.parse(generatedContent);
      
      if (!parsedObjects.objects || !Array.isArray(parsedObjects.objects)) {
        throw new Error('Invalid object structure in response');
      }

      console.log('Successfully generated objects:', parsedObjects.objects.length);
      return NextResponse.json({ objects: parsedObjects.objects });

    } catch (parseError) {
      console.error('Error parsing generated objects JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse generated objects' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in DeepSeek generate-objects API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown DeepSeek API error';
    return NextResponse.json(
      { error: 'Failed to generate objects with DeepSeek', details: errorMessage },
      { status: 500 }
    );
  }
} 