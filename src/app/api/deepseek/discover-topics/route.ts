import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthSession, verifySession } from '@/lib/auth';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 8000, // Shorter timeout
  maxRetries: 1,  // Fewer retries for speed
});

export async function POST(request: NextRequest) {
  try {
    // Try both auth methods
    const session = await getAuthSession();
    const apiSession = session || await verifySession(request);
    
    if (!apiSession?.user?.id) {
      console.error('Unauthorized access attempt to discover-topics API');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to use this API'
      }, { status: 401 });
    }

    const { smeResponse, existingTopics } = await request.json();

    if (!smeResponse || !existingTopics) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Quick check: only discover topics if response is substantial
    if (smeResponse.split(' ').length < 20) {
      return NextResponse.json({
        success: true,
        discovery: { newTopics: [] }
      });
    }

    // Fast topic discovery with simple prompt
    const existingNames = existingTopics.map((topic: any) => topic.name).join(', ');
    
    const prompt = `Response: "${smeResponse}"
Existing topics: ${existingNames}

Find 1-2 new important topics mentioned that aren't in existing topics.
Return JSON: {"newTopics":[{"name":"Topic Name","keywords":["key1","key2"],"description":"brief"}]}
If no new topics, return: {"newTopics":[]}`;

    try {
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from DeepSeek');
      }

      // Extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : '{"newTopics":[]}';
      
      const result = JSON.parse(jsonString);
      
      // Add metadata to new topics
      const newTopics = (result.newTopics || []).map((topic: any) => ({
        ...topic,
        category: 'Other',
        isRequired: false,
      }));

      return NextResponse.json({
        success: true,
        discovery: { newTopics }
      });

    } catch (error) {
      console.log('Fast topic discovery failed, returning empty:', error);
      return NextResponse.json({
        success: true,
        discovery: { newTopics: [] }
      });
    }

  } catch (error) {
    console.error('Error in discover-topics:', error);
    return NextResponse.json({
      error: 'Failed to discover topics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 