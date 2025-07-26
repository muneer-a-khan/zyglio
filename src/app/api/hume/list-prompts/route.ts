import { NextRequest, NextResponse } from 'next/server';

const HUME_API_URL = 'https://api.hume.ai/v0/evi/prompts';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'Hume API keys not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Listing all prompts...');

    const response = await fetch(`${HUME_API_URL}`, {
      headers: {
        'X-Hume-Api-Key': apiKey,
        'X-Hume-Secret-Key': secretKey,
      },
    });

    console.log('📊 List prompts response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Failed to list prompts:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to list prompts',
          details: errorData,
          status: response.status
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('✅ Prompts listed successfully:', {
      totalPages: data.total_pages,
      pageSize: data.page_size,
      promptCount: data.prompts_page?.length || 0
    });

    return NextResponse.json({
      success: true,
      prompts: data.prompts_page || [],
      pagination: {
        pageNumber: data.page_number,
        pageSize: data.page_size,
        totalPages: data.total_pages
      }
    });

  } catch (error) {
    console.error('❌ Error listing prompts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list prompts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 