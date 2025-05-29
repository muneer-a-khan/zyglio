import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'gpt-4o', max_tokens = 150 } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || 'No response';

    return NextResponse.json({ content });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 