import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeepSeekApi } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    console.log('[ElevenLabs Tool] Generate question called');
    
    // Verify this is coming from ElevenLabs
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ELEVENLABS_API_KEY || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationHistory, scenarioId, sessionId, currentScore } = await request.json();
    
    if (!conversationHistory || !scenarioId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`[ElevenLabs Tool] Generating question for scenario ${scenarioId}, session ${sessionId}, score: ${currentScore}`);

    // Get certification data for this session
    const certification = await prisma.certification.findFirst({
      where: {
        voiceInterviewData: {
          path: ['sessionId'],
          equals: sessionId
        }
      },
      include: {
        module: {
          include: {
            procedure: true
          }
        }
      }
    });

    if (!certification) {
      return NextResponse.json({ error: 'Certification session not found' }, { status: 404 });
    }

    const voiceInterviewData = certification.voiceInterviewData as any;
    const scenarios = voiceInterviewData?.scenarios || [];
    const currentScenario = scenarios.find((s: any) => s.id === scenarioId);

    if (!currentScenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Generate adaptive question
    const questionData = await generateAdaptiveQuestion(
      conversationHistory,
      currentScenario,
      certification.module,
      currentScore || 0
    );

    return NextResponse.json({
      question: questionData.question,
      questionType: questionData.questionType,
      difficulty: questionData.difficulty,
      focusArea: questionData.focusArea,
      expectedElements: questionData.expectedElements
    });

  } catch (error) {
    console.error('[ElevenLabs Tool] Error generating question:', error);
    return NextResponse.json(
      { error: 'Failed to generate question', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateAdaptiveQuestion(
  conversationHistory: Array<{role: string, content: string}>,
  scenario: any,
  module: any,
  currentScore: number
): Promise<{
  question: string;
  questionType: string;
  difficulty: string;
  focusArea: string;
  expectedElements: string[];
}> {
  const deepseek = getDeepSeekApi();

  // Determine difficulty and focus based on current performance
  let difficulty = 'NORMAL';
  let focusStrategy = 'balanced';
  
  if (currentScore >= 85) {
    difficulty = 'HARD';
    focusStrategy = 'advanced_scenarios';
  } else if (currentScore >= 70) {
    difficulty = 'NORMAL';
    focusStrategy = 'practical_application';
  } else if (currentScore < 60) {
    difficulty = 'EASY';
    focusStrategy = 'foundational_knowledge';
  }

  // Format conversation history for AI
  const conversationText = conversationHistory
    .slice(-6) // Last 3 exchanges
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const systemPrompt = `You are an expert certification examiner generating scenario-specific questions for voice certification.

## Context
**Module:** ${module.title}
**Scenario:** ${scenario.title}
**Scenario Description:** ${scenario.description || 'Practical scenario assessment'}

## Current Performance
**Score:** ${currentScore}%
**Difficulty Level:** ${difficulty}
**Focus Strategy:** ${focusStrategy}

## Question Generation Guidelines

### Scenario-Focused Approach
- ALL questions must be directly related to this specific scenario
- Build upon the scenario context and situation
- Progress from basic scenario handling to complex complications
- Stay within the scenario boundaries throughout

### For Advanced Performance (85%+):
- Complex scenario complications and edge cases
- Multiple variables and decision points within the scenario
- Advanced troubleshooting specific to this scenario
- Leadership and decision-making in this scenario context

### For Good Performance (70-84%):
- Practical scenario applications with variations
- Real-world complications within this scenario
- Best practices specific to this scenario
- Safety considerations for this particular situation

### For Basic Performance (<70%):
- Fundamental scenario understanding
- Basic step-by-step approach to this scenario
- Core safety and procedures for this situation
- Clear, straightforward scenario-based questions

## Question Types for Scenarios
1. **Situation Assessment**: "In this scenario, how would you first assess..."
2. **Decision Making**: "If you encountered [scenario complication], what would you do..."
3. **Procedure Application**: "Walk me through how you would handle [scenario aspect]..."
4. **Safety Focus**: "What safety concerns are specific to this scenario..."
5. **Complication Handling**: "What if during this scenario, you also had to deal with..."
6. **Resource Management**: "Given the constraints of this scenario, how would you..."

Return JSON format:
{
  "question": "scenario-specific question that builds on the conversation",
  "questionType": "situation|decision|procedure|safety|complication|resource",
  "difficulty": "EASY|NORMAL|HARD",
  "focusArea": "specific aspect of the scenario being tested",
  "expectedElements": ["element1", "element2", "element3"]
}`;

  const userPrompt = `
## Scenario Context:
**Title:** ${scenario.title}
**Description:** ${scenario.description || 'Practical scenario-based assessment'}

## Recent Conversation:
${conversationText}

Generate the next scenario-specific question that:
1. Stays focused on this specific scenario
2. Builds on the conversation so far
3. Tests the candidate at the appropriate difficulty level
4. Explores a different aspect of the scenario than already covered`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    const questionData = JSON.parse(responseText);
    
    return {
      question: questionData.question || "Can you walk me through how you would handle this specific scenario?",
      questionType: questionData.questionType || "situation",
      difficulty: questionData.difficulty || difficulty,
      focusArea: questionData.focusArea || "scenario handling",
      expectedElements: questionData.expectedElements || ["clear approach", "safety awareness", "practical steps"]
    };

  } catch (error) {
    console.error('Error generating question with AI:', error);
    
    // Fallback question generation based on score and scenario
    const questionNumber = Math.floor(conversationHistory.length / 2) + 1;
    
    let fallbackQuestion = `Can you tell me more about how you would approach this specific scenario: ${scenario.title}?`;
    let questionType = "situation";
    let focusArea = "scenario approach";
    
    if (currentScore >= 85) {
      fallbackQuestion = `What would you do if this scenario became more complex, for example if multiple complications arose simultaneously?`;
      questionType = "complication";
      focusArea = "advanced problem-solving";
    } else if (currentScore >= 70) {
      fallbackQuestion = `What are the most critical safety considerations specific to this scenario?`;
      questionType = "safety";
      focusArea = "scenario-specific safety";
    } else {
      fallbackQuestion = `Can you walk me through the basic steps you would take in this scenario?`;
      questionType = "procedure";
      focusArea = "fundamental approach";
    }
    
    return {
      question: fallbackQuestion,
      questionType,
      difficulty,
      focusArea,
      expectedElements: ["scenario understanding", "practical approach"]
    };
  }
} 