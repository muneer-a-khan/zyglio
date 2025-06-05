import OpenAI from 'openai';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

interface RagAgentResult {
  enhancedContext: string;
  suggestedTopics: string[];
  relevantFactors: string[];
}

/**
 * Context agent that uses DeepSeek's built-in knowledge to generate context
 */
export async function enhanceInitialContext(
  taskDefinition: {
    title: string;
    description?: string;
    goal?: string;
  }
): Promise<RagAgentResult> {
  // Create a query based on the task definition
  const topic = `${taskDefinition.title} ${taskDefinition.description || ''} ${taskDefinition.goal || ''}`;
  
  // Use DeepSeek to directly generate knowledge about the topic
  const systemPrompt = `You are an expert medical/technical knowledge synthesizer.
Your task is to use your built-in knowledge to create a comprehensive context about a medical/technical procedure.
Focus on:
1. Key technical aspects of the procedure
2. Common challenges or complications
3. Best practices and standards
4. Recent developments or alternative approaches
5. Important safety considerations

Create a comprehensive but concise summary that a medical/technical interviewer could use to ask informed questions.`;

  const userPrompt = `
## Task Definition:
Title: ${taskDefinition.title}
${taskDefinition.description ? `Description: ${taskDefinition.description}` : ''}
${taskDefinition.goal ? `Goal: ${taskDefinition.goal}` : ''}

Please:
1. Using your built-in knowledge, generate a comprehensive, factual context about this procedure (500-800 words)
2. Identify 3-5 key topics that should be explored during the interview
3. List 3-5 specific factors that might affect this procedure's execution or outcome

Format your response as a JSON object with these fields: enhancedContext, suggestedTopics, relevantFactors.
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
      max_tokens: 1500
    });

    const responseContent = completion.choices[0].message.content || "{}";
    return JSON.parse(responseContent) as RagAgentResult;
  } catch (error) {
    console.error('Error generating context with DeepSeek:', error);
    return {
      enhancedContext: `${taskDefinition.title}. ${taskDefinition.description || ''} ${taskDefinition.goal || ''}`,
      suggestedTopics: [],
      relevantFactors: []
    };
  }
} 