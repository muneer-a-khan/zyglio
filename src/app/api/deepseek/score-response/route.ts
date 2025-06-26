import { NextRequest, NextResponse } from 'next/server';
import { getDeepSeekApi } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { scenario, question, response, previousResponses, moduleContent, currentQuestionNumber, maxQuestions } = await request.json();

    if (!scenario || !question || !response) {
      return NextResponse.json(
        { error: 'Scenario, question, and response are required' },
        { status: 400 }
      );
    }

    console.log('🤖 Scoring response using DeepSeek AI...');

    const deepseek = getDeepSeekApi();

    // Build context from previous responses
    const conversationContext = previousResponses.map((r: any, index: number) => 
      `Q${index + 1}: ${r.question}\nA${index + 1}: ${r.response} (Score: ${r.score}/5)`
    ).join('\n\n');

    const prompt = `
You are an expert evaluator for professional certification assessments. Your task is to score a trainee's voice response and determine if they need additional questions to demonstrate competency.

## Scenario Context:
**Title:** ${scenario.title}
**Description:** ${scenario.description}
**Context:** ${scenario.context}
**Expected Competencies:** ${scenario.expectedCompetencies?.join(', ') || 'Professional knowledge and application'}
**Difficulty:** ${scenario.difficulty}

## Question Progress:
**Current Question:** ${currentQuestionNumber || 1} of ${maxQuestions || 5} maximum
**Previous Questions:** ${previousResponses?.length || 0} completed

## Current Question:
${question}

## Trainee's Response:
"${response}"

## Previous Conversation:
${conversationContext || 'This is the first question'}

## Training Module Content Areas:
${moduleContent?.map((topic: any) => `- ${topic.title || topic}`).join('\n') || 'General professional knowledge'}

## Evaluation Criteria:
1. **Accuracy & Knowledge (1-10)**: Factual correctness, technical terms, domain expertise
2. **Application & Practical Skills (1-10)**: Real-world application and practical solutions  
3. **Communication & Clarity (1-10)**: Clear explanation, confidence indicators, hesitancy analysis
4. **Problem-Solving & Analysis (1-10)**: Strategic thinking, cause-effect reasoning
5. **Completeness & Detail (1-10)**: Coverage of key points, thoroughness

## Keyword & Confidence Analysis:
- **Positive Indicators**: Technical terms, specific examples, confident language ("I would", "The best approach", specific strategies)
- **Confidence Markers**: Decisive language, specific references, concrete examples, professional terminology
- **Hesitancy Markers**: "I think", "maybe", "probably", "I'm not sure", filler words, vague language
- **Domain Expertise**: Sport-specific terminology, tactical knowledge, situational awareness

## Scoring Guidelines (1-10 Scale):
- **9-10**: Expert - Exceptional technical knowledge, confident delivery, comprehensive understanding, specific examples, innovative thinking
- **7-8**: Proficient - Strong knowledge with confident explanation, good practical application, minor gaps acceptable
- **5-6**: Competent - Adequate understanding demonstrated, some hesitancy or missing details, basic competency shown
- **3-4**: Developing - Limited knowledge, noticeable hesitancy, vague responses, significant gaps
- **1-2**: Inadequate - Major knowledge gaps, heavy hesitancy, incorrect information, fundamental misunderstanding

## Enhanced Scoring Logic:
- Award higher scores for: specific terminology, confident delivery, real examples, comprehensive coverage
- Reduce scores for: excessive hesitancy, vague language, missing key concepts, factual errors
- Consider response length and detail level as indicators of knowledge depth

## Adaptive Decision Rules:

**Mark "isComplete: true" with PROGRESSIVE 10-point thresholds:**
- Question 1: Score 9.5+ = Complete (exceptional first response)
- Question 2: Score 8.5+ = Complete (consistently strong performance)  
- Question 3: Score 7.0+ = Complete (solid understanding demonstrated)
- Question 4: Score 6.0+ = Complete (adequate competency shown)
- Question 5+: Score 5.0+ = Complete (basic competency confirmed)
- Maximum questions reached (typically 5-7)

**Continue ONLY if genuinely needed:**
- Score below threshold AND missing critical knowledge
- Responses show fundamental misunderstanding
- Key scenario elements completely unaddressed
- Need clarification on safety/critical aspects

**AVOID Repetitive Questions:**
- Don't ask similar questions with different wording
- Don't continue if trainee already demonstrated understanding
- Move to next scenario if competency is clear
- Quality over quantity - better to assess comprehensively in fewer questions

**Smart Follow-up Strategy:**
- If previous answer was good (4+), test ONE specific edge case then complete
- If answer shows gaps, target the specific gap, don't rehash
- Ask distinctly different aspects, not rephrased versions
- Prioritize scenario completion over exhaustive questioning

Please respond with a JSON object containing:
{
  "responseScore": number (1-10, overall score for this response),
  "competencyScores": {
    "accuracy": number (1-10),
    "application": number (1-10), 
    "communication": number (1-10),
    "problemSolving": number (1-10),
    "completeness": number (1-10)
  },
  "feedback": "Specific constructive feedback on the response",
  "isComplete": boolean (true if score meets progressive threshold: Q1=9.5+, Q2=8.5+, Q3=7.0+, Q4=6.0+, Q5+=5.0+),
  "reasoningForNext": "Brief explanation of why more/no more questions are needed"
}

Focus on professional growth and provide actionable feedback. Be thorough but fair in evaluation. Remember that the goal is competency demonstration, not perfection.`;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert certification evaluator. Provide detailed, fair assessments that help trainees improve their professional competencies. Always respond with valid JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from DeepSeek API');
    }

    // Parse the JSON response
    let scoringData;
    try {
      // Clean the response to remove markdown code blocks
      const cleanedResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      scoringData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      // Fallback scoring
      scoringData = {
        responseScore: 7,
        competencyScores: {
          accuracy: 6,
          application: 7,
          communication: 8,
          problemSolving: 6,
          completeness: 6
        },
        feedback: "Thank you for your response. Please continue with the next question.",
        isComplete: false,
        reasoningForNext: "Continuing assessment to ensure comprehensive evaluation."
      };
    }

    // Validate the scores are within range (1-10)
    scoringData.responseScore = Math.max(1, Math.min(10, scoringData.responseScore || 5));
    
    if (scoringData.competencyScores) {
      Object.keys(scoringData.competencyScores).forEach(key => {
        scoringData.competencyScores[key] = Math.max(1, Math.min(10, scoringData.competencyScores[key] || 5));
      });
    }

    console.log(`✅ Response scored: ${scoringData.responseScore}/10, Complete: ${scoringData.isComplete}`);

    return NextResponse.json(scoringData);

  } catch (error) {
    console.error('Error scoring response:', error);
    return NextResponse.json(
      { 
        error: 'Failed to score response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 