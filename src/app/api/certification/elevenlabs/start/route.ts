import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('[ElevenLabs Cert] Starting certification with ElevenLabs');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId, scenarios } = await request.json();
    
    if (!moduleId || !scenarios || !Array.isArray(scenarios)) {
      return NextResponse.json(
        { error: 'Missing required fields: moduleId, scenarios' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    console.log(`Starting ElevenLabs certification for user ${userId}, module ${moduleId} with ${scenarios.length} scenarios`);

    // Get module data to check eligibility
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        procedure: true,
        quizBanks: {
          include: {
            attempts: {
              where: { userId },
              orderBy: { completedAt: 'desc' }
            }
          }
        }
      }
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Get user's progress on this module
    const progress = await prisma.trainingProgress.findUnique({
      where: {
        userId_moduleId: { userId, moduleId }
      }
    });

    // Check eligibility - similar to the original logic
    const subtopics = module.subtopics as any[] || [];
    const completedSubtopics = progress?.completedSubtopics as string[] || [];
    const allSubtopicsCompleted = subtopics.length > 0 && 
      subtopics.every(subtopic => completedSubtopics.includes(subtopic.id));

    // Check quiz completion
    const requiredQuizzes = module.quizBanks.length;
    const passedQuizzes = module.quizBanks.reduce((count, quiz) => {
      const latestAttempt = quiz.attempts[0];
      return count + (latestAttempt?.passed ? 1 : 0);
    }, 0);

    const allQuizzesPassed = passedQuizzes === requiredQuizzes && requiredQuizzes > 0;
    
    // User is eligible if either all subtopics are completed OR all quizzes are passed
    const isEligible = allSubtopicsCompleted || allQuizzesPassed;

    if (!isEligible) {
      return NextResponse.json(
        { 
          error: 'Must complete all topics or pass all quizzes before voice certification',
          details: {
            completedTopics: completedSubtopics.length,
            totalTopics: subtopics.length,
            passedQuizzes,
            totalQuizzes: requiredQuizzes
          }
        },
        { status: 400 }
      );
    }

    // Calculate average quiz score for adaptive difficulty (similar to original)
    let averageScore = 0;
    
    if (passedQuizzes > 0) {
      const allPassed = module.quizBanks.map(quiz => 
        quiz.attempts.find(attempt => attempt.passed)
      ).filter(Boolean);
      
      averageScore = allPassed.length > 0 
        ? Math.round(allPassed.reduce((sum, attempt) => sum + (attempt?.score || 0), 0) / allPassed.length)
        : 0;
    } else {
      // If no quiz data, estimate score based on progress percentage
      averageScore = progress?.progressPercentage || 80; // Default to 80% if no progress data
    }

    // Determine adaptive difficulty and passing threshold
    let adaptiveDifficulty = 'NORMAL';
    let passingThreshold = 70;
    
    if (averageScore >= 90) {
      adaptiveDifficulty = 'HARD';
      passingThreshold = 60; // Easier passing for harder questions
    } else if (averageScore >= 80) {
      adaptiveDifficulty = 'NORMAL';
      passingThreshold = 70;
    } else {
      adaptiveDifficulty = 'EASY';
      passingThreshold = 75; // Higher passing for easier questions
    }

    // Generate session ID
    const sessionId = `elevenlabs-cert-${uuidv4()}`;

    // Initialize scenario data structure
    const scenarioData = scenarios.map((scenario: any) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      completed: false,
      currentScore: 0,
      questionsAsked: 0,
      responses: [],
      startedAt: null,
      completedAt: null
    }));

    // Create or update certification record
    const certification = await prisma.certification.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      },
      update: {
        status: 'VOICE_INTERVIEW_IN_PROGRESS',
        quizScore: averageScore,
        adaptiveDifficulty,
        voiceInterviewData: {
          sessionId,
          provider: 'elevenlabs',
          startedAt: new Date().toISOString(),
          passingThreshold,
          averageQuizScore: averageScore,
          currentScore: 0,
          scenarios: scenarioData,
          currentScenarioIndex: 0,
          overallScore: 0
        }
      },
      create: {
        userId,
        moduleId,
        procedureId: module.procedureId,
        status: 'VOICE_INTERVIEW_IN_PROGRESS',
        quizScore: averageScore,
        adaptiveDifficulty,
        voiceInterviewData: {
          sessionId,
          provider: 'elevenlabs',
          startedAt: new Date().toISOString(),
          passingThreshold,
          averageQuizScore: averageScore,
          currentScore: 0,
          scenarios: scenarioData,
          currentScenarioIndex: 0,
          overallScore: 0
        }
      }
    });

    // Log analytics
    await prisma.certificationAnalytics.create({
      data: {
        certificationId: certification.id,
        userId,
        moduleId,
        eventType: 'VOICE_INTERVIEW_STARTED',
        eventData: {
          provider: 'elevenlabs',
          adaptiveDifficulty,
          passingThreshold,
          averageQuizScore: averageScore,
          sessionId,
          scenarioCount: scenarios.length
        }
      }
    }).catch(() => {
      console.warn('Failed to log analytics');
    });

    console.log(`ElevenLabs certification session started: ${sessionId} with ${scenarios.length} scenarios`);

    return NextResponse.json({
      success: true,
      sessionId,
      certification: {
        id: certification.id,
        status: certification.status,
        adaptiveDifficulty,
        passingThreshold,
        sessionId,
        scenarios: scenarioData
      }
    });

  } catch (error) {
    console.error('Error starting ElevenLabs certification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start certification session', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 