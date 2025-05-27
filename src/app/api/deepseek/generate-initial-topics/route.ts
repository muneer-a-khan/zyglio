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

    const systemPrompt = `You are an expert instructional designer specializing in procedural training. Your job is to generate comprehensive topics that would be essential for teaching someone else to perform a given procedure competently and safely.

Focus on generating topics that would be REQUIRED for effective teaching, covering:
- Safety considerations and precautions
- Equipment and tools needed
- Preparation steps
- Core techniques and methods
- Quality control and validation
- Common issues and troubleshooting
- Theoretical background (when needed)

Organize topics into logical categories and provide detailed descriptions to guide interview questions.`;

    const userPrompt = `Procedure Title: "${procedureTitle}"
Initial Context: "${initialContext || 'No additional context provided'}"

Generate a comprehensive list of required topics that would be essential for someone to learn in order to teach this procedure to others. Consider what knowledge, skills, and understanding would be necessary for effective instruction.

Return a JSON object with this structure:
{
  "topics": [
    {
      "name": "Topic Name",
      "category": "Safety" | "Equipment" | "Technique" | "Preparation" | "Theory" | "Troubleshooting" | "Quality Control" | "Other",
      "isRequired": true,
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "description": "Detailed description of what this topic should cover for teaching purposes"
    }
  ]
}

Aim for 8-15 comprehensive topics that cover all essential aspects of the procedure.`;

    console.log('Sending request to DeepSeek API...');
    try {
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 3000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from DeepSeek');
      }

      let topicsResult;
      try {
        topicsResult = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('Failed to parse DeepSeek response:', responseContent);
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
      // Fall back to default topics
      console.log('Using default topics due to API error');
      
      const defaultTopics = [
        {
          id: `topic_${Date.now()}_0`,
          name: "Safety Considerations",
          category: "Safety",
          isRequired: true,
          keywords: ["safety", "precautions", "risks"],
          description: "Essential safety precautions and potential risks associated with this procedure.",
          status: 'not-discussed' as const,
          coverageScore: 0
        },
        {
          id: `topic_${Date.now()}_1`,
          name: "Required Equipment",
          category: "Equipment",
          isRequired: true,
          keywords: ["tools", "equipment", "supplies"],
          description: "All necessary tools, equipment, and supplies needed to perform this procedure correctly.",
          status: 'not-discussed' as const,
          coverageScore: 0
        },
        {
          id: `topic_${Date.now()}_2`,
          name: "Step-by-Step Technique",
          category: "Technique",
          isRequired: true,
          keywords: ["technique", "steps", "process", "method"],
          description: "The detailed step-by-step technique for performing this procedure correctly and efficiently.",
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