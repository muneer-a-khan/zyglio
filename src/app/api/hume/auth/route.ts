import { NextResponse } from 'next/server';
import { fetchAccessToken } from 'hume';

export async function GET() {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'Hume API keys not configured' },
        { status: 500 }
      );
    }

    console.log('🔑 Fetching Hume AI access token...');
    
    const accessToken = await fetchAccessToken({
      apiKey: apiKey,
      secretKey: secretKey,
    });

    console.log('✅ Access token obtained successfully');

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('❌ Error fetching Hume access token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access token' },
      { status: 500 }
    );
  }
} 