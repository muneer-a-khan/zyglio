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
      console.error('Unauthorized access attempt to discover-topics API');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to use this API'
      }, { status: 401 });
    }

    const { smeResponse, existingTopics, procedureTitle, initialContext } = await request.json();

    if (!smeResponse || !existingTopics || !procedureTitle) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const systemPrompt = `You are an expert topic discovery agent. Your job is to identify new topics/subtopics mentioned by an SME that aren't already being tracked, and classify them as required or optional for teaching this procedure.

Guidelines for classification:
- REQUIRED: Essential concepts, steps, safety measures, or knowledge needed to successfully teach and perform the procedure
- OPTIONAL: Additional context, advanced techniques, alternatives, or supplementary information that enhances understanding but isn't critical

Consider the educational goal: training someone else to perform this procedure competently and safely.`;

    const existingTopicNames = existingTopics.map((topic: any) => topic.name).join(', ');

    const userPrompt = `Procedure: "${procedureTitle}"
Initial Context: "${initialContext || 'Not provided'}"

SME Response: "${smeResponse}"

Existing Topics Already Tracked: ${existingTopicNames}

Analyze the SME response and identify any NEW topics, concepts, or subtopics mentioned that are not already covered in the existing topics list. For each new topic found:

1. Determine if it's REQUIRED or OPTIONAL for teaching this procedure
2. Assign it to an appropriate category
3. Generate relevant keywords
4. Provide a brief description

Return a JSON object with this structure:
{
  "newTopics": [
    {
      "name": "Topic Name",
      "category": "Safety" | "Equipment" | "Technique" | "Preparation" | "Theory" | "Troubleshooting" | "Quality Control" | "Other",
      "isRequired": true/false,
      "keywords": ["keyword1", "keyword2"],
      "description": "Brief description of what this topic covers",
      "reasoning": "Why this is classified as required/optional"
    }
  ]
}

If no new topics are found, return: {"newTopics": []}`;

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

    let discoveryResult;
    try {
      discoveryResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', cleanedResponse);
      console.error('Original response:', responseContent);
      throw new Error('Invalid JSON response from DeepSeek');
    }

    return NextResponse.json({
      success: true,
      discovery: discoveryResult
    });

  } catch (error) {
    console.error('Error discovering topics:', error);
    return NextResponse.json({
      error: 'Failed to discover new topics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 