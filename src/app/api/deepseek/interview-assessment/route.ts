import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/session-service';
import { verifySession } from '@/lib/auth';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * API endpoint to assess if interview has enough information
 * POST /api/deepseek/interview-assessment
 */
export async function POST(request: Request) {
  try {
    // Basic auth verification
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request data
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId' },
        { status: 400 }
      );
    }

    // Get the session data
    const sessionData = await getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Don't assess if there are fewer than 3 exchanges
    if (sessionData.conversationHistory.length < 6) { // 3 AI questions + 3 user responses = 6
      return NextResponse.json({
        shouldEndInterview: false,
        confidence: 0,
        reasoning: 'Not enough conversation yet to make training modules',
        missingAreas: ['More information needed']
      });
    }

    // Assess the interview completeness
    const assessment = await assessInterviewCompleteness(
      sessionData.initialContext,
      sessionData.conversationHistory
    );
    
    return NextResponse.json({
      shouldEndInterview: assessment.shouldEndInterview,
      confidence: assessment.confidence,
      reasoning: assessment.reasoning,
      missingAreas: assessment.missingAreas,
      coveredAreas: assessment.coveredAreas
    });

  } catch (error) {
    console.error('Error in interview-assessment API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to assess interview', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Assess if the interview has enough information to create training modules
 */
async function assessInterviewCompleteness(
  initialContext: string,
  conversationHistory: Array<{role: 'ai'|'user', content: string}>
): Promise<{
  shouldEndInterview: boolean;
  confidence: number;
  reasoning: string;
  missingAreas: string[];
  coveredAreas: string[];
}> {
  
  // Format conversation history
  const conversationText = conversationHistory
    .map(entry => `${entry.role === 'user' ? 'SME' : 'AI'}: ${entry.content}`)
    .join('\n');

  const systemPrompt = `You are an expert training curriculum designer. Your task is to assess whether an interview transcript contains enough information to create comprehensive training modules for the given procedure.

A complete training module should cover:
1. **Preparation** - What needs to be set up/prepared beforehand
2. **Step-by-step execution** - Clear procedural steps with details
3. **Best practices** - Professional tips and optimal approaches  
4. **Common mistakes** - What to avoid and why
5. **Troubleshooting** - How to handle problems that arise
6. **Variations/adaptations** - Different scenarios or patient populations
7. **Success criteria** - How to know if done correctly
8. **Safety considerations** - Important precautions

Analyze the conversation and determine:
- Should the interview end? (true/false)
- Confidence level (0-100)
- Brief reasoning
- What areas are still missing (if any)
- What areas are well covered

Return your response as JSON:
{
  "shouldEndInterview": boolean,
  "confidence": number,
  "reasoning": "brief explanation",
  "missingAreas": ["area1", "area2"],
  "coveredAreas": ["area1", "area2"]
}

IMPORTANT: Return ONLY the JSON - no explanation, no commentary, no formatting. Just the plain JSON.`;

  const userPrompt = `
## Procedure Context:
${initialContext}

## Interview Transcript:
${conversationText}

Assess if this interview contains enough information to create comprehensive training modules.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from DeepSeek');
    }

    // Parse the JSON response
    const assessment = JSON.parse(responseText);
    
    return {
      shouldEndInterview: assessment.shouldEndInterview || false,
      confidence: assessment.confidence || 0,
      reasoning: assessment.reasoning || 'Assessment completed',
      missingAreas: assessment.missingAreas || [],
      coveredAreas: assessment.coveredAreas || []
    };

  } catch (error) {
    console.error('Error assessing interview completeness:', error);
    
    // Fallback assessment
    return {
      shouldEndInterview: false,
      confidence: 0,
      reasoning: 'Unable to assess - continuing interview',
      missingAreas: ['Assessment error'],
      coveredAreas: []
    };
  }
} 