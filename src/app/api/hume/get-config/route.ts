import { NextRequest, NextResponse } from 'next/server';

const HUME_CONFIG_URL = 'https://api.hume.ai/v0/evi/configs';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;
    const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'Hume API keys not configured' },
        { status: 500 }
      );
    }

    if (!configId) {
      return NextResponse.json(
        { error: 'Hume config ID not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Getting config details for:', configId);

    const response = await fetch(`${HUME_CONFIG_URL}/${configId}`, {
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
      },
    });

    console.log('📊 Get config response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Failed to get config:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to get config',
          details: errorData,
          status: response.status
        },
        { status: 500 }
      );
    }

    const config = await response.json();
    console.log('✅ Config details retrieved:', {
      id: config.id,
      name: config.name,
      promptId: config.prompt_id,
      voiceId: config.voice_id,
      languageModel: config.language_model
    });

    return NextResponse.json({
      success: true,
      config: config
    });

  } catch (error) {
    console.error('❌ Error getting config:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get config',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 