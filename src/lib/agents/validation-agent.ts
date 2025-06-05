import OpenAI from 'openai';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  feedback: string;
  confidence: number;
}

/**
 * Validation agent checks the medical/technical accuracy of user transcripts
 */
export async function validateTranscript(
  transcript: string,
  procedureContext: string
): Promise<ValidationResult> {
  const systemPrompt = `You are an expert medical/technical validator. 
Your task is to analyze the accuracy of statements made by a healthcare professional or technical expert.
Focus specifically on:
1. Factual correctness of medical or technical claims
2. Adherence to standard procedures and protocols
3. Logical consistency in the described process
4. Safety implications of any statements

Be precise and specific in your analysis.`;

  const userPrompt = `
## Context about the procedure:
${procedureContext}

## User's statement to validate:
${transcript}

Analyze the user's statement and provide:
1. Is the information valid and accurate? (true/false)
2. List specific issues or inaccuracies (if any)
3. Brief feedback explaining your assessment
4. Confidence level in your assessment (0.0-1.0)

Format your response as a JSON object with these fields: isValid, issues, feedback, confidence.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Lower temperature for more consistent validation
      max_tokens: 500
    });

    const responseContent = completion.choices[0].message.content || "{}";
    return JSON.parse(responseContent) as ValidationResult;
  } catch (error) {
    console.error('Error validating transcript:', error);
    return {
      isValid: true, // Default to true in case of errors
      issues: [],
      feedback: "Unable to validate the transcript due to a technical error.",
      confidence: 0
    };
  }
} 