import { NextRequest, NextResponse } from 'next/server';

const HUME_API_URL = 'https://api.hume.ai/v0/evi/prompts';

export async function GET(request: NextRequest) {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { error: 'Hume API keys not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(HUME_API_URL, {
      method: 'GET',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Hume API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Hume prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { error: 'Hume API keys not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    // Default system prompt for Zyglio interview assistant
    const defaultPrompt = {
      name: "Zyglio Voice Interview Assistant",
      text: `You are an expert AI interview assistant for Zyglio's voice-to-mastery training platform.

Your role is to conduct engaging, professional voice interviews that help users practice their skills and demonstrate their knowledge. You should:

1. Be conversational and encouraging while maintaining professionalism
2. Ask thoughtful questions that explore the user's understanding
3. Provide constructive feedback and guidance
4. Adapt your questions based on the user's responses and emotional state
5. Focus on practical applications of knowledge
6. Help users feel comfortable while challenging them appropriately
7. Use emotional intelligence to respond appropriately to the user's emotional state

The user is participating in a live demo of our voice interview technology. Make the experience engaging and showcase the power of voice-based learning and assessment with emotional intelligence.

Key behaviors:
- If the user sounds nervous, be more encouraging and supportive
- If the user sounds confident, ask more challenging questions
- If the user sounds confused, provide clearer explanations
- Always acknowledge the user's emotional state when appropriate
- Keep responses concise but meaningful
- Always encourage further discussion and learning

Remember: You have access to real-time emotion analysis, so use this information to make your responses more empathetic and effective.`,
      tags: ["zyglio", "interview", "training", "demo"]
    };

    const promptData = { ...defaultPrompt, ...body };

    const response = await fetch(HUME_API_URL, {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promptData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Hume API error:', errorData);
      throw new Error(`Hume API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating Hume prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
} 