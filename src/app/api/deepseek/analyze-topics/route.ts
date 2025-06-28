import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthSession, verifySession } from '@/lib/auth';
import { getCachedResponse, cacheResponse, shouldUseFastModel, getOptimizedPrompt } from '@/lib/ai-cache';

const fastModel = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 5000,
  maxRetries: 1,
});

const detailedModel = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 8000,
  maxRetries: 1,
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

    const { smeResponse, topics } = await request.json();

    if (!smeResponse || !topics) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create more specific cache key to avoid wrong cached responses
    const cacheKey = `analyze_${smeResponse.substring(0, 50)}_${topics.map((t: any) => t.name).join('_').substring(0, 100)}`;
    const cached = getCachedResponse(cacheKey);
    if (cached && cached.topicUpdates && cached.topicUpdates.length > 0) {
      console.log('Using cached analysis result with', cached.topicUpdates.length, 'updates');
      return NextResponse.json(cached);
    } else if (cached) {
      console.log('Cached result exists but has no updates, regenerating...');
    }

    // Enhanced semantic keyword analysis 
    const responseText = smeResponse.toLowerCase();
    const responseWords = responseText.split(/\s+/);
    
    // Function to find semantic matches - looks for related concepts
    const findSemanticMatches = (keyword: string, responseText: string): boolean => {
      // Direct match
      if (responseText.includes(keyword.toLowerCase())) return true;
      
      // Check for common word variations and synonyms
      const variations = generateKeywordVariations(keyword);
      return variations.some(variation => responseText.includes(variation));
    };
    
    // Generate common variations and synonyms for any keyword
    const generateKeywordVariations = (keyword: string): string[] => {
      const base = keyword.toLowerCase();
      const variations = [base];
      
      // Add common suffixes/prefixes
      if (base.endsWith('ing')) variations.push(base.slice(0, -3)); // running -> run
      if (base.endsWith('ed')) variations.push(base.slice(0, -2)); // baked -> bake
      if (base.endsWith('s') && base.length > 3) variations.push(base.slice(0, -1)); // steps -> step
      
      // Add plural/singular forms
      if (!base.endsWith('s')) variations.push(base + 's');
      
      // Add gerund forms
      if (!base.endsWith('ing')) {
        variations.push(base + 'ing');
        if (base.endsWith('e')) variations.push(base.slice(0, -1) + 'ing');
      }
      
      return variations;
    };
    
    const topicUpdates = topics.map((topic: any) => {
      const keywords = topic.keywords || [];
      const topicNameWords = topic.name.toLowerCase().split(/\s+/);
      
      // Count direct keyword matches
      const keywordMatches = keywords.filter((keyword: string) => 
        responseText.includes(keyword.toLowerCase())
      ).length;
      
      // Count semantic matches using adaptive variations
      const semanticMatches = keywords.filter((keyword: string) => 
        findSemanticMatches(keyword, responseText)
      ).length;
      
      // Count topic name matches
      const nameMatches = topicNameWords.filter((word: string) => 
        responseText.includes(word)
      ).length;
      
      // Calculate comprehensive score
      const totalMatches = keywordMatches + semanticMatches + nameMatches;
      const responseLength = responseWords.length;
      const mentionDensity = totalMatches / Math.max(responseLength / 10, 1);
      
      let newScore = topic.coverageScore || 0;
      let status = topic.status || 'not-discussed';
      
      if (totalMatches > 0) {
        // More sophisticated scoring with semantic bonuses
        const baseIncrease = keywordMatches * 15; // Direct matches worth more
        const semanticBonus = semanticMatches * 10; // Semantic matches
        const nameBonus = nameMatches * 8; // Topic name mentions
        const densityBonus = Math.min(mentionDensity * 15, 25);
        const lengthBonus = responseLength > 50 ? 15 : 5;
        
        newScore = Math.min(100, newScore + baseIncrease + semanticBonus + nameBonus + densityBonus + lengthBonus);
        
        if (newScore >= 60) status = 'thoroughly-covered';
        else if (newScore >= 20) status = 'briefly-discussed';
        else status = 'briefly-discussed'; // If mentioned at all
      }
      
      const mentionedKeywords = keywords.filter((kw: string) => 
        findSemanticMatches(kw, responseText)
      );
      
      return {
        id: topic.id,
        status,
        coverageScore: newScore,
        mentionedKeywords,
        reasoning: `Found ${totalMatches} matches (${keywordMatches} direct, ${semanticMatches} semantic, ${nameMatches} name). Score: ${newScore}`
      };
    });

    // Two-stage AI enhancement
    const useFastModel = shouldUseFastModel(smeResponse, { task: 'analyze' });
    const importantTopics = topics.filter((t: any) => t.isRequired && 
      topicUpdates.find((u: any) => u.id === t.id)?.coverageScore > 20);
    
    if (importantTopics.length > 0 && importantTopics.length <= 3) {
      try {
        const model = useFastModel ? fastModel : detailedModel;
        const enhancedAnalysis = await quickTopicAnalysis(smeResponse, importantTopics, model);
        
        // Merge enhanced analysis with keyword analysis
        enhancedAnalysis.forEach((enhanced: any) => {
          const keywordUpdate = topicUpdates.find((u: any) => u.id === enhanced.id);
          if (keywordUpdate && enhanced.coverageScore > keywordUpdate.coverageScore) {
            keywordUpdate.coverageScore = enhanced.coverageScore;
            keywordUpdate.status = enhanced.status;
            keywordUpdate.reasoning = enhanced.reasoning;
          }
        });
      } catch (error) {
        console.log('AI analysis failed, using keyword analysis:', error);
      }
    }

    const result = {
      success: true,
      topicUpdates,
      suggestedNewTopics: [], // Skip for speed
      keywordMatches: topicUpdates.map((u: any) => ({
        id: u.id,
        matchCount: u.mentionedKeywords.length,
        initialScore: u.coverageScore
      }))
    };

    // Debug logging
    console.log(`[analyze-topics] Returning ${topicUpdates.length} topic updates`);
    console.log('[analyze-topics] Sample updates:', topicUpdates.slice(0, 2));

    // Cache the result
    cacheResponse(cacheKey, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in analyze-topics:', error);
    return NextResponse.json({
      error: 'Failed to analyze topics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function quickTopicAnalysis(smeResponse: string, topics: any[], model: OpenAI): Promise<any[]> {
  const topicNames = topics.map(t => t.name).join(', ');
  
  const prompt = getOptimizedPrompt('topicAnalysis', { priority: 'speed' }) + 
    `\nResponse: "${smeResponse}"\nTopics: ${topicNames}\n\nReturn JSON array: [${topics.map(t => `{"id":"${t.id}","score":0}`).join(',')}]`;

  const completion = await model.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 200,
  });

  const responseContent = completion.choices[0]?.message?.content || '[]';
  try {
    const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    const scores = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
    return scores.map((s: any) => ({
      id: s.id,
      coverageScore: s.score || 0,
      status: s.score >= 70 ? 'thoroughly-covered' : s.score >= 25 ? 'briefly-discussed' : 'not-discussed',
      reasoning: `AI analysis: ${s.score}% coverage`
    }));
  } catch {
    return [];
  }
} 