import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeepSeekApi } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    console.log('[ElevenLabs Tool] Score response called');
    
    // Verify this is coming from ElevenLabs
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ELEVENLABS_API_KEY || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { response, question, scenarioId, sessionId } = await request.json();
    
    if (!response || !question || !scenarioId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`[ElevenLabs Tool] Scoring response for scenario ${scenarioId}, session ${sessionId}`);

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

    // Score the response using AI scoring
    const scoreData = await scoreResponseWithAI(
      response,
      question,
      currentScenario,
      certification.module
    );

    // Update the scenario responses in certification data
    const updatedScenarios = scenarios.map((scenario: any) => {
      if (scenario.id === scenarioId) {
        const responses = scenario.responses || [];
        responses.push({
          question,
          response,
          score: scoreData.score,
          maxScore: scoreData.maxScore,
          feedback: scoreData.feedback,
          competencyScores: scoreData.competencyScores,
          timestamp: new Date().toISOString()
        });

        // Calculate scenario score
        const totalPoints = responses.reduce((sum: number, r: any) => sum + (r.maxScore || 10), 0);
        const earnedPoints = responses.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
        const scenarioScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        return {
          ...scenario,
          responses,
          currentScore: scenarioScore,
          questionsAsked: responses.length,
          lastResponseAt: new Date().toISOString()
        };
      }
      return scenario;
    });

    // Calculate overall score across all scenarios
    const completedScenarios = updatedScenarios.filter((s: any) => s.responses && s.responses.length > 0);
    let overallScore = 0;
    
    if (completedScenarios.length > 0) {
      const avgScenarioScore = completedScenarios.reduce((sum: number, s: any) => 
        sum + (s.currentScore || 0), 0) / completedScenarios.length;
      overallScore = Math.round(avgScenarioScore);
    }

    // Update certification
    await prisma.certification.update({
      where: { id: certification.id },
      data: {
        voiceInterviewData: {
          ...voiceInterviewData,
          scenarios: updatedScenarios,
          currentScore: overallScore,
          lastResponseAt: new Date().toISOString()
        }
      }
    });

    // Return score data for the agent
    const currentScenarioUpdated = updatedScenarios.find((s: any) => s.id === scenarioId);
    return NextResponse.json({
      score: scoreData.score,
      maxScore: scoreData.maxScore,
      feedback: scoreData.feedback,
      scenarioScore: currentScenarioUpdated?.currentScore || 0,
      overallScore,
      shouldContinue: (currentScenarioUpdated?.questionsAsked || 0) < 6 && (currentScenarioUpdated?.currentScore || 0) < 90,
      responseCount: currentScenarioUpdated?.questionsAsked || 0
    });

  } catch (error) {
    console.error('[ElevenLabs Tool] Error scoring response:', error);
    return NextResponse.json(
      { error: 'Failed to score response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function scoreResponseWithAI(
  response: string,
  question: string,
  scenario: any,
  module: any
): Promise<{
  score: number;
  maxScore: number;
  feedback: string;
  competencyScores: Record<string, number>;
}> {
  const deepseek = getDeepSeekApi();

  const systemPrompt = `You are an expert certification evaluator scoring responses for a specific scenario within a training module.

## Scoring Guidelines
- Score out of 10 points
- Consider accuracy, completeness, safety awareness, and practical understanding
- Focus on scenario-specific competency demonstration
- Provide constructive feedback

## Context
**Module:** ${module.title}
**Scenario:** ${scenario.title}
**Scenario Description:** ${scenario.description || 'Practical scenario assessment'}

## Response Evaluation Criteria
1. **Scenario Relevance** (0-3 points): How well does the response address the specific scenario?
2. **Technical Accuracy** (0-3 points): Is the information correct for this scenario?
3. **Safety/Best Practices** (0-2 points): Shows proper safety awareness for this situation?
4. **Practical Application** (0-2 points): Demonstrates real understanding of how to handle this scenario?

Return JSON format:
{
  "score": number (0-10),
  "maxScore": 10,
  "feedback": "specific constructive feedback focusing on scenario performance",
  "competencyScores": {
    "scenario_relevance": number (0-3),
    "technical_accuracy": number (0-3),
    "safety": number (0-2),
    "practical": number (0-2)
  }
}`;

  const userPrompt = `
## Scenario Context:
${scenario.title}: ${scenario.description || 'Practical scenario assessment'}

## Question Asked:
${question}

## Candidate's Response:
${response}

Score this response specifically for how well it handles this scenario.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    const scoreData = JSON.parse(responseText);
    
    return {
      score: scoreData.score || 5,
      maxScore: scoreData.maxScore || 10,
      feedback: scoreData.feedback || 'Response evaluated for scenario',
      competencyScores: scoreData.competencyScores || {
        scenario_relevance: 2,
        technical_accuracy: 2,
        safety: 1,
        practical: 1
      }
    };

  } catch (error) {
    console.error('Error scoring with AI:', error);
    
    // Fallback scoring based on response length and keywords
    const words = response.trim().split(/\s+/).length;
    const score = Math.min(10, Math.max(3, Math.floor(words / 10) + 3));
    
    return {
      score,
      maxScore: 10,
      feedback: 'Response received and evaluated for scenario.',
      competencyScores: {
        scenario_relevance: Math.floor(score * 0.3),
        technical_accuracy: Math.floor(score * 0.3),
        safety: Math.floor(score * 0.2),
        practical: Math.floor(score * 0.2)
      }
    };
  }
} 