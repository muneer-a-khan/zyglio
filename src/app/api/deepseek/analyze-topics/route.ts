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

    // Extract the keywords from each topic to use for analysis
    const topicsWithKeywords = topics.map((topic: any) => ({
      ...topic,
      extractedKeywords: [
        ...topic.name.toLowerCase().split(/\s+/),
        ...(topic.keywords || []).map((kw: string) => kw.toLowerCase()),
        ...(topic.description ? topic.description.toLowerCase().split(/\s+/).filter((word: string) => word.length > 4) : [])
      ].filter(Boolean)
    }));

    // Quick keyword-based pre-analysis
    const responseText = smeResponse.toLowerCase();
    const keywordMatches = topicsWithKeywords.map((topic: any) => {
      const matchCount = topic.extractedKeywords.filter((keyword: string) => 
        responseText.includes(keyword.toLowerCase())
      ).length;
      
      const matchRatio = topic.extractedKeywords.length > 0 
        ? matchCount / topic.extractedKeywords.length 
        : 0;
      
      return {
        id: topic.id,
        matchCount,
        matchRatio,
        initialScore: Math.min(100, Math.round(matchRatio * 100))
      };
    });

    const systemPrompt = `You are an expert topic coverage analyzer. Your job is to analyze how well an SME's response covers specific topics that are needed to teach a procedure.

For each topic, you need to:
1. Determine coverage level: "not-discussed", "briefly-discussed", or "thoroughly-covered"
2. Assign a coverage score from 0-100
3. Identify keywords/concepts mentioned related to each topic

Coverage guidelines:
- "not-discussed" (0-25): Topic not mentioned or only tangentially referenced
- "briefly-discussed" (26-70): Topic mentioned with some detail but lacks depth
- "thoroughly-covered" (71-100): Topic explained in detail with sufficient information for teaching

Be especially attentive to technical terms, processes, and context-specific vocabulary. 
The SME might discuss a topic using different terminology than what is listed in the topics.

Return your analysis as a JSON object with topic updates.`;

    const userPrompt = `SME Response: "${smeResponse}"

Current Topics to Analyze:
${topics.map((topic: any) => {
  const status = topic.status || 'not-discussed';
  const currentScore = topic.coverageScore || 0;
  return `- ${topic.name} (${topic.category}): ${topic.description || 'No description'} 
    Current status: ${status}, Current score: ${currentScore}
    Keywords: ${topic.keywords?.join(', ') || 'none'}`;
}).join('\n')}

Previous Conversation Context:
${conversationHistory.slice(-3).map((entry: any) => `${entry.role}: ${entry.content}`).join('\n')}

Keyword Match Analysis:
${keywordMatches.map((match: any) => {
  const topic = topics.find((t: any) => t.id === match.id);
  return `- ${topic.name}: ${match.matchCount} keywords matched (${match.initialScore}% match ratio)`;
}).join('\n')}

Analyze how the SME's response covers each topic. Weigh both keyword matches and semantic understanding of the content.
Return a JSON object with this structure:
{
  "topicUpdates": [
    {
      "id": "topic_id",
      "status": "not-discussed" | "briefly-discussed" | "thoroughly-covered",
      "coverageScore": 0-100,
      "mentionedKeywords": ["keyword1", "keyword2"],
      "reasoning": "Brief explanation of the coverage assessment"
    }
  ],
  "suggestedNewTopics": [
    {
      "name": "New Topic Name",
      "category": "Suggested Category",
      "keywords": ["keyword1", "keyword2"],
      "description": "Brief description of this new topic"
    }
  ]
}

Important: For topicUpdates, if a topic was previously "thoroughly-covered" (score ≥ 71), do not downgrade it unless there is explicit contradiction.
For suggestedNewTopics, only include topics that weren't listed but were extensively discussed by the SME.`;

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
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      
      analysisResult = JSON.parse(jsonString);
      
      // Add the keyword match analysis to the result
      analysisResult.keywordMatches = keywordMatches;
      
      // If no topic updates were returned by the API, use the keyword analysis
      if (!analysisResult.topicUpdates || analysisResult.topicUpdates.length === 0) {
        analysisResult.topicUpdates = keywordMatches.map((match: any) => {
          const topic = topics.find((t: any) => t.id === match.id);
          let status = "not-discussed";
          if (match.initialScore >= 71) status = "thoroughly-covered";
          else if (match.initialScore >= 26) status = "briefly-discussed";
          
          return {
            id: match.id,
            status,
            coverageScore: match.initialScore,
            mentionedKeywords: topic.keywords?.filter((kw: string) => 
              responseText.includes(kw.toLowerCase())
            ) || [],
            reasoning: `Based on keyword matching: ${match.matchCount} keywords matched out of ${topic.extractedKeywords.length}`
          };
        });
      }
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', responseContent);
      // Fallback to keyword analysis if JSON parsing fails
      analysisResult = {
        topicUpdates: keywordMatches.map((match: any) => {
          const topic = topics.find((t: any) => t.id === match.id);
          let status = "not-discussed";
          if (match.initialScore >= 71) status = "thoroughly-covered";
          else if (match.initialScore >= 26) status = "briefly-discussed";
          
          return {
            id: match.id,
            status,
            coverageScore: match.initialScore,
            mentionedKeywords: topic.keywords?.filter((kw: string) => 
              responseText.includes(kw.toLowerCase())
            ) || [],
            reasoning: `Based on keyword matching: ${match.matchCount} keywords matched out of ${topic.extractedKeywords.length}`
          };
        }),
        keywordMatches,
        error: "Failed to parse AI response, using keyword analysis instead"
      };
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