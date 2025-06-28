import OpenAI from 'openai';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 15000, // 15-second timeout
  maxRetries: 2,  // Retry failed requests
  defaultHeaders: {
    'Connection': 'keep-alive'
  }
});

interface ClarificationResult {
  needsClarification: boolean;
  missingInfo: string[];
  clarificationQuestions: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * Clarification agent identifies unclear or incomplete information in user's transcript
 */
export async function getClarifications(
  transcript: string,
  procedureContext: string,
  conversationHistory: Array<{role: 'ai' | 'user', content: string}>
): Promise<ClarificationResult> {
  const conversationHistoryText = conversationHistory
    .map(entry => `${entry.role === 'user' ? 'User' : 'AI'}: ${entry.content}`)
    .join('\n');

  const systemPrompt = `You are an expert medical/technical clarification agent. 
Your task is to identify incomplete, ambiguous, or unclear information in a healthcare professional's statements.
Focus specifically on:
1. Missing steps or details in procedural descriptions
2. Ambiguous terminology that could have multiple interpretations
3. Implied knowledge that should be made explicit
4. Incomplete rationales for decisions or actions
5. Quantitative information that lacks precision (dosages, timings, measurements)

Be thorough but focused only on important clarifications.`;

  const userPrompt = `
## Context about the procedure:
${procedureContext}

## Conversation history:
${conversationHistoryText}

## User's latest statement to analyze:
${transcript}

Analyze the user's statement and identify what needs clarification:
1. Does this statement need clarification? (true/false)
2. List specific pieces of missing information
3. Provide 1-3 precise questions to ask for clarification
4. Priority of clarification (high/medium/low)

Format your response as a JSON object with these fields: needsClarification, missingInfo, clarificationQuestions, priority.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseContent = completion.choices[0].message.content || "{}";
    return JSON.parse(responseContent) as ClarificationResult;
  } catch (error) {
    console.error('Error generating clarifications:', error);
    return {
      needsClarification: false,
      missingInfo: [],
      clarificationQuestions: [],
      priority: 'low'
    };
  }
} 