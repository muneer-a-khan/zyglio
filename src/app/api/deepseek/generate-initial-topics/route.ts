import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthSession, verifySession } from '@/lib/auth';

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error('DEEPSEEK_API_KEY is not defined in environment variables.');
}

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: apiKey,
  timeout: 15000, // 15-second timeout
  maxRetries: 2,  // Retry failed requests
  defaultHeaders: {
    'Connection': 'keep-alive'
  }
});

export async function POST(request: NextRequest) {
  try {
    console.log('DeepSeek generate-initial-topics API route called.');
    console.log('DeepSeek API key available:', !!apiKey);
    
    // Try multiple auth methods
    const session = await getAuthSession();
    const apiSession = session || await verifySession(request);
    
    if (!apiSession?.user?.id) {
      console.error('Unauthorized access attempt to generate-initial-topics API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { procedureTitle, initialContext } = await request.json();

    if (!procedureTitle) {
      return NextResponse.json({ error: 'Procedure title is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert at analyzing any topic/procedure and generating the most important subtopics for discussion. Think like a subject matter expert who needs to cover all essential aspects of the topic comprehensively.

Analyze the given procedure/topic and generate 4-5 essential subtopics that would be most important to understand and discuss. Make them specific to the domain and context.

Return response in valid JSON format: {"topics": [{"name": "Topic Name", "category": "Category", "isRequired": true, "keywords": ["keyword1", "keyword2"], "description": "Description"}]}`;

    const userPrompt = `Procedure/Topic: "${procedureTitle}"
Context: "${initialContext || 'No additional context provided'}"

Analyze this topic and generate 4-5 essential subtopics that would be most important for someone to understand and discuss about "${procedureTitle}".

Requirements:
1. Make topics SPECIFIC to this domain (not generic)
2. Include relevant keywords that people would naturally use when discussing each subtopic
3. Cover the most important aspects someone would need to know
4. Make categories appropriate for the domain
5. Ensure topics flow logically from overview to specific details

Examples of good topic generation:
- For "Baking Bread": Ingredients & Measurements, Kneading Technique, Fermentation Process, Baking Temperature & Timing
- For "Dog Training": Basic Commands, Positive Reinforcement, Behavior Correction, Socialization
- For "Financial Planning": Budget Creation, Investment Strategy, Risk Assessment, Retirement Planning

Generate relevant topics for "${procedureTitle}" following this pattern.`;

    console.log('Sending request to DeepSeek API...');
    try {
      // Implement explicit timeout using Promise.race
      const completionPromise = deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 3000,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timeout after 15 seconds')), 15000);
      });

      const completion = await completionPromise;

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from DeepSeek');
      }

      // Clean the response to handle markdown code blocks
      let cleanedResponse = responseContent.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove any additional formatting
      cleanedResponse = cleanedResponse.trim();

      let topicsResult;
      try {
        topicsResult = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('Failed to parse DeepSeek response:', cleanedResponse);
        console.error('Original response:', responseContent);
        throw new Error('Invalid JSON response from DeepSeek');
      }

      // Add IDs and initial status to topics
      const topicsWithMetadata = topicsResult.topics.map((topic: any, index: number) => ({
        ...topic,
        id: `topic_${Date.now()}_${index}`,
        status: 'not-discussed' as const,
        coverageScore: 0
      }));

      return NextResponse.json({
        success: true,
        topics: topicsWithMetadata
      });
    } catch (apiError) {
      console.error('DeepSeek API error:', apiError);
      // Fall back to adaptive default topics based on procedure title
      console.log('Using adaptive default topics due to API error');
      
      const timestamp = Date.now();
      const title = procedureTitle.toLowerCase();
      
      const defaultTopics = [
        {
          id: `topic_${timestamp}_0`,
          name: `${procedureTitle} Overview`,
          category: "Overview",
          isRequired: true,
          keywords: [title, "overview", "basics", "introduction", "fundamentals"],
          description: `Basic understanding and overview of ${procedureTitle}`,
          status: 'not-discussed' as const,
          coverageScore: 0
        },
        {
          id: `topic_${timestamp}_1`,
          name: "Key Components",
          category: "Components",
          isRequired: true,
          keywords: ["components", "parts", "elements", "pieces", "aspects"],
          description: `Important components and elements involved in ${procedureTitle}`,
          status: 'not-discussed' as const,
          coverageScore: 0
        },
        {
          id: `topic_${timestamp}_2`,
          name: "Implementation Process",
          category: "Process",
          isRequired: true,
          keywords: ["process", "steps", "implementation", "approach", "method", "how"],
          description: `Step-by-step process and approach for ${procedureTitle}`,
          status: 'not-discussed' as const,
          coverageScore: 0
        },
        {
          id: `topic_${timestamp}_3`,
          name: "Challenges and Solutions",
          category: "Problem Solving",
          isRequired: true,
          keywords: ["challenges", "problems", "issues", "solutions", "troubleshooting"],
          description: `Common challenges and their solutions in ${procedureTitle}`,
          status: 'not-discussed' as const,
          coverageScore: 0
        }
      ];
      
      return NextResponse.json({
        success: true,
        topics: defaultTopics,
        usedDefaultTopics: true
      });
    }
  } catch (error) {
    console.error('Error generating initial topics:', error);
    return NextResponse.json({
      error: 'Failed to generate initial topics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 