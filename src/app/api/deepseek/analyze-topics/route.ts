import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthSession } from '@/lib/auth';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { smeResponse, topics, conversationHistory } = await request.json();

    if (!smeResponse || !topics) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const systemPrompt = `You are an expert topic coverage analyzer. Your job is to analyze how well an SME's response covers specific topics that are needed to teach a procedure.

For each topic, you need to:
1. Determine coverage level: "not-discussed", "briefly-discussed", or "thoroughly-covered"
2. Assign a coverage score from 0-100
3. Identify keywords/concepts mentioned related to each topic

Coverage guidelines:
- "not-discussed" (0-25): Topic not mentioned or only tangentially referenced
- "briefly-discussed" (26-70): Topic mentioned with some detail but lacks depth
- "thoroughly-covered" (71-100): Topic explained in detail with sufficient information for teaching

Return your analysis as a JSON object with topic updates.`;

    const userPrompt = `SME Response: "${smeResponse}"

Current Topics to Analyze:
${topics.map((topic: any) => `- ${topic.name} (${topic.category}): ${topic.description || 'No description'}`).join('\n')}

Previous Conversation Context:
${conversationHistory.slice(-3).map((entry: any) => `${entry.role}: ${entry.content}`).join('\n')}

Analyze how the SME's response covers each topic. Return a JSON object with this structure:
{
  "topicUpdates": [
    {
      "id": "topic_id",
      "status": "not-discussed" | "briefly-discussed" | "thoroughly-covered",
      "coverageScore": 0-100,
      "mentionedKeywords": ["keyword1", "keyword2"],
      "reasoning": "Brief explanation of the coverage assessment"
    }
  ]
}`;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from DeepSeek');
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', responseContent);
      throw new Error('Invalid JSON response from DeepSeek');
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('Error analyzing topics:', error);
    return NextResponse.json({
      error: 'Failed to analyze topic coverage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 