import { NextResponse } from 'next/server';
import axios from 'axios';
import * as yaml from 'js-yaml';

// Check if API key is available
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('DEEPSEEK_API_KEY is not defined in environment variables');
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(request: Request) {
  try {
    console.log('Generate steps API route called with DeepSeek');
    console.log('API key available:', !!apiKey);
    
    const { transcript } = await request.json();

    if (!transcript) {
      console.log('Transcript is empty');
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    console.log('Transcript received, length:', transcript.length);

    const prompt = `Please analyze this medical or technical procedure transcript and break it down into clear, sequential steps. Each step should be concise but descriptive, with a clear title followed by a brief explanation.

Transcript:
${transcript}

Format each step as "Title: Description" where the title is a brief label for the step and the description explains what needs to be done.

For example:
- Patient Positioning: Place the patient in supine position on the operating table
- Sterilization: Apply antiseptic solution to the surgical site in circular motions
- Initial Incision: Make a 5cm longitudinal incision along the marked line

Please provide only the steps, one per line, with no additional text or explanations.`;

    try {
      console.log('Making DeepSeek API call...');
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "You are a medical procedure documentation expert that breaks down procedures into clear, sequential steps."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('DeepSeek API call successful');
      
      const generatedSteps = response.data.choices[0].message.content || '';
      console.log('Generated steps sample:', generatedSteps.substring(0, 100) + '...');
      
      // Split the response into individual steps and clean them up
      const steps = generatedSteps
        .split('\n')
        .map(step => step.trim())
        .filter(step => step && step.includes(':') && !step.startsWith('-'))
        .map(step => {
          // Remove any bullet points or dashes
          return step.replace(/^[-•*]\s*/, '').trim();
        });

      console.log('Processed steps count:', steps.length);
      
      if (steps.length === 0) {
        console.error('No valid steps were generated from:', generatedSteps);
        // Use a fallback mechanism - just split the transcript into sentences
        const fallbackSteps = transcript
          .split(/[.!?]+/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 10)
          .map((sentence, index) => `Step ${index + 1}: ${sentence}`);
          
        if (fallbackSteps.length > 0) {
          console.log('Using fallback steps mechanism, count:', fallbackSteps.length);
          return NextResponse.json({ steps: fallbackSteps });
        }
        
        return NextResponse.json(
          { error: 'No valid steps were generated' },
          { status: 500 }
        );
      }

      return NextResponse.json({ steps });
    } catch (deepseekError) {
      console.error('DeepSeek API error:', deepseekError);
      
      // Use a fallback mechanism if DeepSeek fails
      const fallbackSteps = transcript
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 10)
        .map((sentence, index) => `Step ${index + 1}: ${sentence}`);
        
      if (fallbackSteps.length > 0) {
        console.log('Using fallback steps after DeepSeek error, count:', fallbackSteps.length);
        return NextResponse.json({ steps: fallbackSteps });
      }
      
      throw deepseekError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error generating steps:', error);
    
    // Get detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { error: 'Failed to generate steps', details: errorMessage },
      { status: 500 }
    );
  }
} 