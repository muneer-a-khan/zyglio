import OpenAI from 'openai';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

interface FollowUpResult {
  questions: Array<{
    question: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  suggestedTopics: string[];
}

/**
 * Follow-up agent generates contextual questions to deepen the interview
 */
export async function generateFollowUpQuestions(
  transcript: string,
  procedureContext: string,
  conversationHistory: Array<{role: 'ai' | 'user', content: string}>
): Promise<FollowUpResult> {
  const conversationHistoryText = conversationHistory
    .map(entry => `${entry.role === 'user' ? 'User' : 'AI'}: ${entry.content}`)
    .join('\n');

  const systemPrompt = `You are an expert medical/technical interviewer specialized in follow-up questioning.
Your task is to generate insightful follow-up questions based on a healthcare professional's statements.
Focus on questions that:
1. Explore the reasoning behind decisions
2. Uncover edge cases and rare scenarios
3. Probe for procedural variations
4. Explore quality control and error prevention
5. Connect this procedure to broader medical/technical contexts

Generate diverse, thought-provoking questions that go beyond the obvious.`;

  const userPrompt = `
## Context about the procedure:
${procedureContext}

## Conversation history:
${conversationHistoryText}

## User's latest statement to analyze:
${transcript}

Generate follow-up questions based on the statement:
1. Provide 2-4 insightful follow-up questions
2. For each question, include your reasoning for asking it
3. Assign each question a priority (high/medium/low)
4. Suggest 1-3 additional topics that could be explored in future

Format your response as a JSON object with these fields: 
- questions (array of objects with: question, reasoning, priority)
- suggestedTopics (array of strings)
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7, // Higher temperature for more creative questions
      max_tokens: 800
    });

    const responseContent = completion.choices[0].message.content || "{}";
    return JSON.parse(responseContent) as FollowUpResult;
  } catch (error) {
    console.error('Error generating follow-up questions:', error);
    return {
      questions: [{
        question: "Could you elaborate more on what you just explained?",
        reasoning: "General follow-up to gather more information",
        priority: 'medium'
      }],
      suggestedTopics: []
    };
  }
} 