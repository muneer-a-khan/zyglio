import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthSession, verifySession } from '@/lib/auth';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Try both auth methods
    const session = await getAuthSession();
    const apiSession = session || await verifySession(request);
    
    if (!apiSession?.user?.id) {
      console.error('Unauthorized access attempt to analyze-topics API');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to use this API'
      }, { status: 401 });
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
    const responseWordCount = responseText.split(/\s+/).length;
    
    const keywordMatches = topicsWithKeywords.map((topic: any) => {
      const matchCount = topic.extractedKeywords.filter((keyword: string) => 
        responseText.includes(keyword.toLowerCase())
      ).length;
      
      const matchRatio = topic.extractedKeywords.length > 0 
        ? matchCount / topic.extractedKeywords.length 
        : 0;
      
      // More sophisticated scoring based on multiple factors
      let baseScore = Math.round(matchRatio * 100);
      
      // Adjust score based on response length and detail
      if (responseWordCount > 50 && matchCount > 0) {
        baseScore += Math.min(15, Math.floor(responseWordCount / 20)); // Bonus for longer responses
      }
      
      // Add some variance to avoid clustering at same percentages
      const variance = Math.floor(Math.random() * 8) - 4; // ±4 variance
      baseScore = Math.max(0, Math.min(100, baseScore + variance));
      
      // Ensure minimum scores align with guidelines
      if (matchCount > 0 && baseScore < 16) {
        baseScore = 16 + Math.floor(Math.random() * 10); // 16-25 range for minimal mentions
      }
      
      return {
        id: topic.id,
        matchCount,
        matchRatio,
        initialScore: baseScore
      };
    });

    const systemPrompt = `You are an expert topic coverage analyzer. Your job is to analyze how well an SME's response covers specific topics that are needed to teach a procedure.

For each topic, you need to:
1. Determine coverage level: "not-discussed", "briefly-discussed", or "thoroughly-covered"
2. Assign a precise coverage score from 0-100 based on depth and detail
3. Identify keywords/concepts mentioned related to each topic

Coverage scoring guidelines:
- "not-discussed" (0-15): Topic not mentioned at all or only tangentially referenced
- "briefly-discussed" (16-65): Topic mentioned but with varying depth:
  * 16-25: Barely mentioned, minimal detail
  * 26-40: Some explanation but lacks important details
  * 41-55: Moderate detail, covers key points but missing depth
  * 56-65: Good coverage but could use more examples or specifics
- "thoroughly-covered" (66-100): Topic explained in detail:
  * 66-75: Well explained with good detail and examples
  * 76-85: Comprehensive coverage with clear explanations
  * 86-95: Excellent depth with practical insights
  * 96-100: Complete mastery-level explanation

Scoring factors to consider:
- Depth of explanation (how detailed?)
- Practical examples or scenarios given
- Technical accuracy and terminology used
- Context provided for when/why/how to apply
- Connection to other related topics

Be precise with scoring - avoid clustering around the same percentages. Consider the actual content depth.

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

Important guidelines:
- For topicUpdates: If a topic was previously "thoroughly-covered" (score ≥ 66), do not downgrade it unless there is explicit contradiction.
- For suggestedNewTopics: BE VERY STRICT - only suggest new topics if they are:
  1. Extensively discussed by the SME (at least 2-3 sentences of detail)
  2. Cannot reasonably fit under any existing topic category
  3. Represent a genuinely new concept not covered by existing topics
  4. Are important enough to warrant separate tracking
  
  Prefer grouping concepts under existing topics rather than creating new ones.
  If unsure, DO NOT suggest a new topic - leave the array empty instead.`;

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
          if (match.initialScore >= 66) status = "thoroughly-covered";
          else if (match.initialScore >= 16) status = "briefly-discussed";
          
          return {
            id: match.id,
            status,
            coverageScore: match.initialScore,
            mentionedKeywords: topic.keywords?.filter((kw: string) => 
              responseText.includes(kw.toLowerCase())
            ) || [],
            reasoning: `Based on keyword matching: ${match.matchCount} keywords matched out of ${topic.extractedKeywords?.length || 0}`
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
          if (match.initialScore >= 66) status = "thoroughly-covered";
          else if (match.initialScore >= 16) status = "briefly-discussed";
          
          return {
            id: match.id,
            status,
            coverageScore: match.initialScore,
            mentionedKeywords: topic.keywords?.filter((kw: string) => 
              responseText.includes(kw.toLowerCase())
            ) || [],
            reasoning: `Based on keyword matching: ${match.matchCount} keywords matched out of ${topic.extractedKeywords?.length || 0}`
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