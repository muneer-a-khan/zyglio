import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/session-service';
import { verifySession } from '@/lib/auth';
import { BatchedQuestion } from '@/lib/session-service';
import { v4 as uuidv4 } from 'uuid';

// Initialize DeepSeek client with performance optimizations
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 15000, // 15-second timeout
  maxRetries: 2,  // Retry failed requests
  defaultHeaders: {
    'Connection': 'keep-alive'
  }
});

/**
 * API endpoint to generate batched questions
 * POST /api/deepseek/batch-questions
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
    const { sessionId, isInitialBatch = true, numberOfQuestions = 20 } = await request.json();
    
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

    // Generate the batch of questions
    const batchedQuestions = await generateQuestionBatch(
      sessionData.initialContext,
      sessionData.conversationHistory,
      numberOfQuestions,
      isInitialBatch
    );
    
    return NextResponse.json({
      success: true,
      batchedQuestions,
      count: batchedQuestions.length
    });

  } catch (error) {
    console.error('Error in batch-questions API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to generate batch questions', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Generate a batch of questions for the interview
 */
async function generateQuestionBatch(
  initialContext: string,
  conversationHistory: Array<{role: 'ai'|'user', content: string}>,
  numberOfQuestions: number,
  isInitialBatch: boolean
): Promise<BatchedQuestion[]> {
  
  // Format conversation history if not initial batch
  const conversationText = conversationHistory.length > 0 
    ? conversationHistory.map(entry => `${entry.role === 'user' ? 'SME' : 'AI'}: ${entry.content}`).join('\n')
    : '';

  const systemPrompt = `You are an expert interviewer preparing questions for a comprehensive interview with a Subject Matter Expert (SME) about a technical or medical procedure.

Your goal is to generate ${numberOfQuestions} diverse, insightful questions that will help extract thorough knowledge to create training modules.

${isInitialBatch ? 
  'This is the initial batch - cover broad aspects of the procedure including: preparation, execution, troubleshooting, best practices, common mistakes, variations, and edge cases.' :
  'This is a follow-up batch - generate questions that build upon the conversation so far and explore areas not yet covered.'
}

For each question, also provide:
1. A category (e.g., "preparation", "execution", "troubleshooting", "best-practices", etc.)
2. 3-5 keywords that would indicate this question is relevant to ask

Format your response as a JSON array where each object has:
{
  "question": "the actual question text",
  "category": "category name", 
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

IMPORTANT: Return ONLY the JSON array - no explanation, no commentary, no formatting. Just the plain JSON.`;

  const userPrompt = isInitialBatch 
    ? `
## Procedure Context:
${initialContext}

Generate ${numberOfQuestions} comprehensive questions to thoroughly understand this procedure for training module creation.
`
    : `
## Procedure Context:
${initialContext}

## Conversation So Far:
${conversationText}

Generate ${numberOfQuestions} follow-up questions that explore areas not yet covered in the conversation above.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from DeepSeek');
    }

    // Parse the JSON response
    const questionsData = JSON.parse(responseText);
    
    // Convert to BatchedQuestion objects
    const batchedQuestions: BatchedQuestion[] = questionsData.map((q: any, index: number) => ({
      id: uuidv4(),
      question: q.question,
      category: q.category,
      keywords: q.keywords,
      used: false,
      priority: q.priority || (index + 1), // Default priority based on order
      relatedTopics: q.relatedTopics || [] // Default to empty array
    }));

    return batchedQuestions;

  } catch (error) {
    console.error('Error generating question batch:', error);
    
    // Fallback questions if JSON parsing fails
    const fallbackQuestions: BatchedQuestion[] = [];
    for (let i = 0; i < numberOfQuestions; i++) {
      fallbackQuestions.push({
        id: uuidv4(),
        question: `Can you tell me more about this aspect of the procedure?`,
        category: 'general',
        keywords: ['procedure', 'process', 'steps'],
        used: false,
        priority: i + 1,
        relatedTopics: []
      });
    }
    
    return fallbackQuestions;
  }
} 