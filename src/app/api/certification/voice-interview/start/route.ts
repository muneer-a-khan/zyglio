import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initializeSession } from '@/lib/session-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, moduleId } = await request.json();

    if (!userId || !moduleId) {
      return NextResponse.json(
        { error: 'User ID and Module ID are required' },
        { status: 400 }
      );
    }

    // Get training module and user's quiz performance
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
      return NextResponse.json(
        { error: 'Training module not found' },
        { status: 404 }
      );
    }

    // Get the user's progress for this module to check completed topics
    const progress = await prisma.trainingProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      }
    });

    // Check if all subtopics are completed based on progress
    const subtopics = Array.isArray(module.subtopics) ? module.subtopics.map(s => s.title || s) : [];
    const completedSubtopics = Array.isArray(progress?.completedSubtopics) ? progress.completedSubtopics : [];
    
    // Check if all subtopics are completed
    const allSubtopicsCompleted = subtopics.length > 0 && 
      subtopics.every(subtopic => completedSubtopics.includes(subtopic));

    // Also check quiz attempts as a backup
    const requiredQuizzes = module.quizBanks.length;
    const passedQuizzes = module.quizBanks.filter(quiz => 
      quiz.attempts.some(attempt => attempt.passed)
    ).length;
    const allQuizzesPassed = passedQuizzes === requiredQuizzes && requiredQuizzes > 0;
    
    // User is eligible if either all subtopics are completed OR all quizzes are passed
    const isEligible = allSubtopicsCompleted || allQuizzesPassed;

    if (!isEligible) {
      return NextResponse.json(
        { 
          error: 'Must complete all topics before voice certification',
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

    // Calculate average quiz score to determine interview difficulty
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
          startedAt: new Date().toISOString(),
          passingThreshold,
          averageQuizScore: averageScore
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
          startedAt: new Date().toISOString(),
          passingThreshold,
          averageQuizScore: averageScore
        }
      }
    });

    // Initialize an interview session using the session service
    // Use certification scenario text if available, otherwise use module title and procedure description
    const scenarioText = module.certificationScenarioText || 
      `You are being certified on ${module.title}. This certification will evaluate your practical knowledge and ability to apply the concepts you've learned.`;
    
    const sessionId = `cert-${certification.id}`;
    
    console.log(`Initializing certification interview session for ${module.title}`);
    
    // Initialize session with scenario context
    const sessionData = await initializeSession(
      sessionId,
      scenarioText,
      module.title
    );

    // Update certification with session info
    await prisma.certification.update({
      where: { id: certification.id },
      data: {
        voiceInterviewData: {
          ...certification.voiceInterviewData,
          sessionId,
          scenarioText,
          startedAt: new Date().toISOString()
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
          adaptiveDifficulty,
          passingThreshold,
          averageQuizScore: averageScore,
          sessionId,
          scenarioText: scenarioText.substring(0, 100) + "..."
        }
      }
    }).catch(() => {
      console.warn('Failed to log analytics');
    });

    return NextResponse.json({
      success: true,
      certification: {
        id: certification.id,
        status: certification.status,
        adaptiveDifficulty,
        passingThreshold,
        sessionId,
        scenarioText,
        module: {
          title: module.title,
          procedureId: module.procedureId
        }
      }
    });

  } catch (error) {
    console.error('Error starting voice interview:', error);
    return NextResponse.json(
      { error: 'Failed to start voice interview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 