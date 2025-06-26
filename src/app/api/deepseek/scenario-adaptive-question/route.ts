import { NextRequest, NextResponse } from 'next/server';
import { getDeepSeekApi } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { 
      scenario, 
      previousResponses, 
      currentQuestionNumber, 
      averageScore, 
      lowestCompetency, 
      moduleContent 
    } = await request.json();

    if (!scenario || !currentQuestionNumber) {
      return NextResponse.json(
        { error: 'Scenario and question number are required' },
        { status: 400 }
      );
    }

    console.log('🤖 Generating adaptive question with DeepSeek AI...');

    const deepseek = getDeepSeekApi();

    // Build context from previous responses with topics covered analysis
    const conversationHistory = previousResponses?.length > 0 
      ? previousResponses.map((r: any, index: number) => 
          `Q${index + 1}: Previous question → Response scored ${r.score}/5 (Preview: ${r.responsePreview})`
        ).join('\n')
      : 'This is the first question';

    // Analyze what aspects have been covered to avoid repetition
    const topicsCovered = previousResponses?.map((r: any) => r.responsePreview?.toLowerCase() || '').join(' ') || '';
    const averageScore = previousResponses?.length > 0 
      ? previousResponses.reduce((sum: number, r: any) => sum + r.score, 0) / previousResponses.length
      : 0;

    // Determine question focus based on competency analysis
    const focusInstructions = {
      accuracy: "Focus on factual knowledge and correct understanding of core concepts",
      application: "Focus on practical application and real-world problem-solving scenarios", 
      communication: "Focus on clear explanation, articulation, and professional communication",
      problemSolving: "Focus on analytical thinking, reasoning, and step-by-step problem resolution",
      completeness: "Focus on comprehensive coverage and attention to important details"
    };

    const focusInstruction = previousResponses?.length > 0
      ? (focusInstructions[lowestCompetency as keyof typeof focusInstructions] || focusInstructions.application)
      : focusInstructions.application; // Default to application for first question

    const isFirstQuestion = !previousResponses || previousResponses.length === 0;

    const prompt = `
You are an expert certification examiner creating ${isFirstQuestion ? 'the opening' : 'an adaptive follow-up'} question for professional assessment. Generate a targeted question that helps evaluate and improve the trainee's competency.

## Scenario Context:
**Title:** ${scenario.title}
**Description:** ${scenario.description}
**Context:** ${scenario.context}
**Expected Competencies:** ${scenario.expectedCompetencies?.join(', ') || 'Professional knowledge and application'}
**Difficulty Level:** ${scenario.difficulty}

## Question Requirements:
- **Question Number:** ${currentQuestionNumber} of maximum ${scenario.maxQuestions || 5}
${isFirstQuestion ? `
- **Type:** Opening question to set the scenario context and start assessment
- **Focus:** Establish the situation and allow trainee to demonstrate initial understanding` : `
- **Type:** Adaptive follow-up question  
- **Primary Focus:** ${focusInstruction}
- **Current Average Score:** ${averageScore}/5 (${averageScore < 3 ? 'Needs improvement' : averageScore < 4 ? 'Developing' : 'Proficient'})`}

## Previous Conversation Context:
${conversationHistory}

## Topics Already Covered (Avoid Repetition):
${topicsCovered ? `Previous responses mentioned: ${topicsCovered.substring(0, 200)}...` : 'No previous responses'}

## Assessment Guidelines:
- **Average Score So Far:** ${averageScore.toFixed(1)}/10 ${averageScore >= 8 ? '(Strong - consider completion after 1-2 more targeted questions)' : averageScore >= 6 ? '(Adequate - 1-2 more questions to confirm)' : '(Needs improvement - focus on gaps)'}
- **Question Efficiency:** Ask distinct questions that cover NEW aspects, don't repeat similar concepts
- **Completion Readiness:** Progressive thresholds: Q1=9.5+, Q2=8.5+, Q3=7.0+, Q4=6.0+, Q5+=5.0+

## Training Module Content Areas:
${moduleContent?.map((topic: any) => `- ${topic.title || topic}`).join('\n') || 'General professional knowledge'}

${isFirstQuestion ? `
## First Question Guidelines:
- **Set the Scene**: Clearly establish the scenario context and situation
- **Open-Ended**: Allow trainee to demonstrate their understanding and approach
- **Engaging**: Use "you are..." or "imagine you are..." to immerse them in the scenario
- **Clear Direction**: Give them a clear starting point or challenge to address
- **Professional Context**: Frame it as a realistic workplace situation

Example opening patterns:
- "You are faced with [scenario situation]. How would you approach this challenge?"
- "Imagine you are [role] and [situation occurs]. Walk me through your response."
- "You've just encountered [scenario context]. What are your immediate thoughts and next steps?"` : `
## Adaptive Question Guidelines:

### If Average Score < 6 (Needs Support):
- Ask foundational questions to build basic understanding
- Provide more guidance and context in the question
- Focus on core concepts and basic application

### If Average Score 6-8 (Developing Well):
- Ask scenario-based questions requiring deeper analysis
- Challenge them to explain reasoning and decision-making
- Test practical application in complex situations

### If Average Score > 8 (Advanced):
- Ask expert-level questions requiring synthesis and innovation
- Present edge cases or challenging scenarios
- Test leadership, troubleshooting, and advanced problem-solving`}

## Question Design Principles:
1. **Realistic Scenarios**: Base questions on real workplace situations
2. **Progressive Difficulty**: Match complexity to demonstrated competency
3. **Competency-Focused**: ${isFirstQuestion ? 'Establish baseline understanding' : `Target the lowest scoring area (${lowestCompetency})`}
4. **Actionable**: Allow for clear demonstration of skills and knowledge
5. **Professional Context**: Maintain relevance to the training objectives

## Response Format:
Provide a JSON response with:
{
  "question": "${isFirstQuestion ? 'A clear opening question that establishes the scenario and invites initial response' : 'A specific follow-up question that builds on previous responses and targets the focus area'}",
  "reasoning": "${isFirstQuestion ? 'Explanation of how this opening question establishes the scenario assessment' : 'Brief explanation of why this question targets the identified competency gap'}",
  "expectedElements": ["List of 3-4 key elements expected in a strong response"],
  "difficultyLevel": "${isFirstQuestion ? 'easy|medium|hard based on scenario difficulty' : 'easy|medium|hard based on trainee\'s demonstrated competency'}"
}

${isFirstQuestion ? 'Create an engaging opening question that naturally introduces the scenario and allows the trainee to demonstrate their initial understanding and approach.' : 'Create a question that naturally progresses the conversation while strategically assessing the area where the trainee needs the most development.'}`;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert certification examiner. Create adaptive questions that accurately assess professional competency while helping trainees improve. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 600
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from DeepSeek API');
    }

    // Parse the JSON response
    let questionData;
    try {
      // Clean the response to remove markdown code blocks
      const cleanedResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      questionData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      
      // Fallback question generation
      if (isFirstQuestion) {
        questionData = {
          question: `Let's begin with this scenario: ${scenario.context}. How would you approach this situation? Please walk me through your initial thoughts and the steps you would take.`,
          reasoning: "Opening question to establish scenario context and baseline understanding",
          expectedElements: ["Clear understanding of situation", "Logical approach", "Professional considerations"],
          difficultyLevel: scenario.difficulty?.toLowerCase() || "medium"
        };
      } else {
        const fallbackQuestions = [
          "Can you walk me through how you would handle this situation step by step?",
          "What factors would you consider most important in this scenario?", 
          "How would you ensure quality and safety in this process?",
          "What potential challenges might arise, and how would you address them?",
          "Can you explain your reasoning behind that approach?"
        ];
        
        questionData = {
          question: fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)],
          reasoning: "Continuing assessment to evaluate professional competency",
          expectedElements: ["Clear explanation", "Practical considerations", "Professional approach"],
          difficultyLevel: averageScore < 6 ? "easy" : averageScore < 8 ? "medium" : "hard"
        };
      }
    }

    console.log(`✅ Generated ${isFirstQuestion ? 'opening' : 'adaptive'} question targeting: ${isFirstQuestion ? 'baseline assessment' : lowestCompetency}`);

    return NextResponse.json(questionData);

  } catch (error) {
    console.error('Error generating adaptive question:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate adaptive question',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 