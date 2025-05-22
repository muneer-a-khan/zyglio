import OpenAI from 'openai';
import { retrieveRelevantContext } from '@/lib/rag-service';

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
 * RAG agent retrieves relevant background knowledge and enhances the initial context
 */
export async function enhanceInitialContext(
  taskDefinition: {
    title: string;
    description?: string;
    goal?: string;
  }
): Promise<RagAgentResult> {
  // 1. First, gather RAG context based on the task definition
  const searchQuery = `${taskDefinition.title} ${taskDefinition.description || ''} ${taskDefinition.goal || ''}`;
  const ragResult = await retrieveRelevantContext(searchQuery, 5); // Get top 5 relevant chunks
  
  // 2. Now use DeepSeek to synthesize and enhance this context
  const systemPrompt = `You are an expert medical/technical knowledge synthesizer.
Your task is to analyze information about a medical/technical procedure and create an enhanced context that will be useful for interviewing a subject matter expert.
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

## Retrieved Background Knowledge:
${ragResult.context}

Please:
1. Synthesize this information into a comprehensive, factual context about this procedure (500-800 words)
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
    console.error('Error enhancing context with RAG agent:', error);
    return {
      enhancedContext: `${taskDefinition.title}. ${taskDefinition.description || ''} ${taskDefinition.goal || ''}`,
      suggestedTopics: [],
      relevantFactors: []
    };
  }
} 