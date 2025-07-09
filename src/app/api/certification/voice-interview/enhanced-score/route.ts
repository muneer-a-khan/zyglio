import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDeepSeekApi } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    console.log('[Enhanced Score] Processing ElevenLabs scoring request');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      sessionId, 
      response, 
      question, 
      scenarioId,
      conversationHistory,
      speakingTime,
      responseLength,
      confidence
    } = await request.json();
    
    if (!sessionId || !response || !question) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, response, question' },
        { status: 400 }
      );
    }

    console.log(`Processing enhanced scoring for session: ${sessionId}`);

    // Find the certification session
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
      return NextResponse.json(
        { error: 'Certification session not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (certification.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const voiceInterviewData = certification.voiceInterviewData as any;
    if (!voiceInterviewData) {
      return NextResponse.json(
        { error: 'Voice interview data not found' },
        { status: 500 }
      );
    }

    // Enhanced AI scoring with ElevenLabs integration
    const scoreData = await performEnhancedScoring(
      response,
      question,
      conversationHistory || [],
      certification.module,
      {
        speakingTime,
        responseLength,
        confidence
      }
    );

    // Update certification with detailed scoring data
    const responses = voiceInterviewData.responses || [];
    const newResponse = {
      question,
      response,
      score: scoreData.score,
      maxScore: scoreData.maxScore,
      feedback: scoreData.feedback,
      competencyScores: scoreData.competencyScores,
      speakingTime,
      responseLength,
      confidence,
      timestamp: new Date().toISOString(),
      scenarioId
    };

    responses.push(newResponse);

    // Calculate overall score
    const totalPoints = responses.reduce((sum: number, r: any) => sum + (r.maxScore || 10), 0);
    const earnedPoints = responses.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    const overallScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Update certification data
    const updatedVoiceData = {
      ...voiceInterviewData,
      responses,
      currentScore: overallScore,
      lastScoredAt: new Date().toISOString(),
      scoringMetrics: {
        totalResponses: responses.length,
        averageScore: responses.length > 0 ? 
          Math.round(responses.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / responses.length) : 0,
        averageSpeakingTime: responses.length > 0 ?
          Math.round(responses.reduce((sum: number, r: any) => sum + (r.speakingTime || 0), 0) / responses.length) : 0,
        averageResponseLength: responses.length > 0 ?
          Math.round(responses.reduce((sum: number, r: any) => sum + (r.responseLength || 0), 0) / responses.length) : 0
      }
    };

    await prisma.certification.update({
      where: { id: certification.id },
      data: {
        voiceInterviewData: updatedVoiceData,
        overallScore: overallScore
      }
    });

    // Log analytics for scoring
    await prisma.certificationAnalytics.create({
      data: {
        certificationId: certification.id,
        userId: session.user.id,
        moduleId: certification.moduleId,
        eventType: 'RESPONSE_SCORED',
        eventData: {
          score: scoreData.score,
          maxScore: scoreData.maxScore,
          speakingTime,
          responseLength,
          confidence,
          competencyScores: scoreData.competencyScores,
          overallScore,
          totalResponses: responses.length
        }
      }
    }).catch(() => {
      console.warn('Failed to log scoring analytics');
    });

    console.log(`Enhanced scoring completed for session ${sessionId}, score: ${scoreData.score}/${scoreData.maxScore}`);

    return NextResponse.json({
      success: true,
      score: scoreData.score,
      maxScore: scoreData.maxScore,
      feedback: scoreData.feedback,
      competencyScores: scoreData.competencyScores,
      overallScore,
      totalResponses: responses.length,
      shouldContinue: responses.length < 8 && overallScore < 90,
      nextQuestionSuggestion: scoreData.nextQuestionSuggestion
    });

  } catch (error) {
    console.error('[Enhanced Score] Error processing scoring:', error);
    return NextResponse.json(
      { error: 'Failed to process scoring', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function performEnhancedScoring(
  response: string,
  question: string,
  conversationHistory: any[],
  module: any,
  metrics: {
    speakingTime?: number;
    responseLength?: number;
    confidence?: number;
  }
): Promise<{
  score: number;
  maxScore: number;
  feedback: string;
  competencyScores: Record<string, number>;
  nextQuestionSuggestion?: string;
}> {
  const deepseek = getDeepSeekApi();

  const systemPrompt = `You are an expert certification evaluator using ElevenLabs' advanced scoring system. You assess responses based on multiple dimensions including content accuracy, communication skills, and engagement quality.

## Scoring Dimensions (Total: 10 points)
1. **Content Accuracy** (0-4 points): How well does the response address the question with correct information?
2. **Communication Clarity** (0-3 points): Is the response clear, well-structured, and easy to understand?
3. **Engagement Quality** (0-2 points): Does the response show thoughtful engagement and depth?
4. **Speaking Fluency** (0-1 point): Bonus for natural, confident delivery (assessed via metrics)

## Context
**Module:** ${module.title}
**Question:** ${question}
**Speaking Time:** ${metrics.speakingTime || 0} seconds
**Response Length:** ${metrics.responseLength || 0} characters
**Confidence:** ${metrics.confidence || 0}%

## Conversation Context
Previous exchanges: ${conversationHistory.length} messages

## Response Evaluation
Score this response comprehensively, considering both content and delivery metrics.

Return JSON format:
{
  "score": number (0-10),
  "maxScore": 10,
  "feedback": "detailed constructive feedback with specific suggestions",
  "competencyScores": {
    "content_accuracy": number (0-4),
    "communication_clarity": number (0-3),
    "engagement_quality": number (0-2),
    "speaking_fluency": number (0-1)
  },
  "nextQuestionSuggestion": "suggested follow-up question based on response quality"
}`;

  const userPrompt = `
## Question Asked:
${question}

## Candidate's Response:
${response}

## Delivery Metrics:
- Speaking Time: ${metrics.speakingTime || 0} seconds
- Response Length: ${metrics.responseLength || 0} characters
- Confidence: ${metrics.confidence || 0}%

## Conversation History:
${conversationHistory.slice(-3).map((msg: any) => 
  `${msg.role}: ${msg.content}`).join('\n')}

Provide a comprehensive assessment of this response.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    const scoreData = JSON.parse(responseText);
    
    return {
      score: scoreData.score || 5,
      maxScore: scoreData.maxScore || 10,
      feedback: scoreData.feedback || 'Response evaluated comprehensively.',
      competencyScores: scoreData.competencyScores || {
        content_accuracy: 2,
        communication_clarity: 2,
        engagement_quality: 1,
        speaking_fluency: 0
      },
      nextQuestionSuggestion: scoreData.nextQuestionSuggestion
    };

  } catch (error) {
    console.error('Error in enhanced scoring:', error);
    
    // Fallback scoring with metrics consideration
    const words = response.trim().split(/\s+/).length;
    const baseScore = Math.min(10, Math.max(3, Math.floor(words / 8) + 3));
    
    // Adjust score based on speaking time and confidence
    let adjustedScore = baseScore;
    if (metrics.speakingTime && metrics.speakingTime > 5 && metrics.speakingTime < 60) {
      adjustedScore += 1; // Bonus for appropriate speaking time
    }
    if (metrics.confidence && metrics.confidence > 70) {
      adjustedScore += 1; // Bonus for high confidence
    }
    
    return {
      score: Math.min(10, adjustedScore),
      maxScore: 10,
      feedback: 'Response evaluated with fallback scoring system.',
      competencyScores: {
        content_accuracy: Math.floor(adjustedScore * 0.4),
        communication_clarity: Math.floor(adjustedScore * 0.3),
        engagement_quality: Math.floor(adjustedScore * 0.2),
        speaking_fluency: Math.floor(adjustedScore * 0.1)
      }
    };
  }
} 