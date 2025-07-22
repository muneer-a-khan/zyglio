import { NextRequest, NextResponse } from 'next/server';

const HUME_API_URL = 'https://api.hume.ai/v0/evi/configs';

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
    console.error('Error fetching Hume configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configurations' },
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
    
    // Default configuration for Zyglio voice interview
    const defaultConfig = {
      name: "Zyglio Voice Interview Config",
      description: "Configuration for Zyglio's voice interview demo with emotional intelligence",
      language: {
        model_provider: "OPEN_AI",
        model_resource: "gpt-4o",
        temperature: 0.7
      },
      voice: {
        provider: "HUME_AI",
        name: "ITO"
      },
      evi_version: "2",
      event_messages: {
        on_new_chat: {
          enabled: true,
          text: "Hello! I'm your AI interview assistant. I'm here to help you practice and demonstrate your knowledge. Let's start with a simple question - what area would you like to focus on today?"
        },
        on_inactivity_timeout: {
          enabled: true,
          text: "I'm still here when you're ready to continue. Take your time!"
        },
        on_max_duration_timeout: {
          enabled: true,
          text: "Thank you for the great conversation! This has been a wonderful demonstration of our voice interview technology."
        }
      },
      timeouts: {
        inactivity: {
          enabled: true,
          duration_secs: 30
        },
        max_duration: {
          enabled: true,
          duration_secs: 1800 // 30 minutes
        }
      },
      tools: [],
      builtin_tools: [
        {
          tool_type: "web_search",
          name: "web_search",
          fallback_content: "I don't have access to current web information, but I can help based on my training knowledge."
        }
      ]
    };

    const configData = { ...defaultConfig, ...body };

    const response = await fetch(HUME_API_URL, {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Hume API error:', errorData);
      throw new Error(`Hume API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating Hume config:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    );
  }
} 