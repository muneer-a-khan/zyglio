import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  
  if (!chatId) {
    return NextResponse.json(
      { error: 'Chat ID is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Hume API key not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.hume.ai/v0/evi/chats/${chatId}/events?page_size=100&ascending_order=true`,
      {
        method: 'GET',
        headers: {
          'X-Hume-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Hume API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching chat events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat events' },
      { status: 500 }
    );
  }
} 