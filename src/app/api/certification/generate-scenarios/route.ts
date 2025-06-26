import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { moduleId, userId } = await request.json();

    if (!moduleId || !userId) {
      return NextResponse.json(
        { error: 'Module ID and User ID are required' },
        { status: 400 }
      );
    }

    // Get training module and user's progress
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
        },
        progress: {
          where: { userId }
        }
      }
    });

    if (!module) {
      return NextResponse.json(
        { error: 'Training module not found' },
        { status: 404 }
      );
    }

    // Check eligibility (same as before)
    const progress = module.progress[0];
    const subtopics = Array.isArray(module.subtopics) ? module.subtopics : [];
    const completedSubtopics = Array.isArray(progress?.completedSubtopics) ? progress.completedSubtopics : [];
    
    const passedQuizzes = module.quizBanks.filter(quiz => 
      quiz.attempts.some(attempt => attempt.passed)
    ).length;
    const requiredQuizzes = module.quizBanks.length;

    const allSubtopicsCompleted = completedSubtopics.length >= subtopics.length && subtopics.length > 0;
    const allQuizzesPassed = passedQuizzes === requiredQuizzes && requiredQuizzes > 0;
    const isEligible = allSubtopicsCompleted || allQuizzesPassed;

    if (!isEligible) {
      return NextResponse.json(
        { error: 'Must complete all training before certification' },
        { status: 400 }
      );
    }

    // Calculate difficulty based on quiz performance
    let averageScore = 80; // Default
    if (passedQuizzes > 0) {
      const allPassed = module.quizBanks.map(quiz => 
        quiz.attempts.find(attempt => attempt.passed)
      ).filter(Boolean);
      
      if (allPassed.length > 0) {
        averageScore = Math.round(allPassed.reduce((sum, attempt) => sum + (attempt?.score || 0), 0) / allPassed.length);
      }
    }

    let adaptiveDifficulty = 'NORMAL';
    let passingThreshold = 70;
    
    if (averageScore >= 90) {
      adaptiveDifficulty = 'HARD';
      passingThreshold = 65;
    } else if (averageScore >= 80) {
      adaptiveDifficulty = 'NORMAL';
      passingThreshold = 70;
    } else {
      adaptiveDifficulty = 'EASY';
      passingThreshold = 75;
    }

    // Generate multiple scenarios using AI
    const scenarios = await generateCertificationScenarios(module, adaptiveDifficulty);

    // Create or update certification record
    const certification = await prisma.certification.upsert({
      where: {
        userId_moduleId: { userId, moduleId }
      },
      update: {
        status: 'VOICE_INTERVIEW_IN_PROGRESS',
        quizScore: averageScore,
        adaptiveDifficulty,
        voiceInterviewData: {
          startedAt: new Date().toISOString(),
          passingThreshold,
          averageQuizScore: averageScore,
          scenarios: scenarios.map(s => ({ 
            ...s, 
            completed: false, 
            score: 0,
            questionsAsked: 0,
            responses: []
          }))
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
          averageQuizScore: averageScore,
          scenarios: scenarios.map(s => ({ 
            ...s, 
            completed: false, 
            score: 0,
            questionsAsked: 0,
            responses: []
          }))
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
          scenarioCount: scenarios.length
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
        module: {
          title: module.title,
          procedureId: module.procedureId
        },
        scenarios
      }
    });

  } catch (error) {
    console.error('Error generating certification scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to generate certification scenarios' },
      { status: 500 }
    );
  }
}

async function generateCertificationScenarios(module: any, difficulty: string): Promise<any[]> {
  try {
    console.log(`🎭 Generating certification scenarios for: ${module.title}`);
    
    // Call DeepSeek API to generate scenarios based on the module content
    const response = await fetch(new URL('/api/deepseek/generate-certification-scenarios', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moduleTitle: module.title,
        procedureSteps: module.procedure.steps || [],
        subtopics: module.subtopics,
        difficulty,
        targetCount: [5, 3, 4][['EASY', 'NORMAL', 'HARD'].indexOf(difficulty)] || 3 // Generate 3-5 scenarios based on difficulty
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate scenarios from AI');
    }

    const aiData = await response.json();
    
    // Structure the scenarios with proper IDs and configuration
    const scenarios = aiData.scenarios.map((scenario: any, index: number) => ({
      id: `scenario-${Date.now()}-${index}`,
      title: scenario.title,
      description: scenario.description,
      context: scenario.context,
      expectedCompetencies: scenario.expectedCompetencies || [],
      difficulty: difficulty,
      maxQuestions: difficulty === 'EASY' ? 3 : difficulty === 'NORMAL' ? 5 : 7,
      passingScore: difficulty === 'EASY' ? 75 : difficulty === 'NORMAL' ? 70 : 65
    }));

    console.log(`✅ Generated ${scenarios.length} certification scenarios`);
    return scenarios;

  } catch (error) {
    console.error('Error calling AI for scenario generation:', error);
    
    // Fallback to default scenarios if AI fails
    console.log('🔄 Using fallback scenarios...');
    return [
      {
        id: `scenario-fallback-1`,
        title: "Practical Application",
        description: `Demonstrate your practical understanding of ${module.title}`,
        context: `You are in a real-world situation where you need to apply the concepts from ${module.title}. Walk through how you would handle this situation.`,
        expectedCompetencies: ["practical-application", "problem-solving", "process-understanding"],
        difficulty,
        maxQuestions: 4,
        passingScore: 70
      },
      {
        id: `scenario-fallback-2`,
        title: "Troubleshooting & Problem Solving",
        description: `Handle unexpected challenges related to ${module.title}`,
        context: `Something has gone wrong in the process you've learned. Explain how you would identify and resolve the issue.`,
        expectedCompetencies: ["troubleshooting", "critical-thinking", "systematic-approach"],
        difficulty,
        maxQuestions: 4,
        passingScore: 70
      },
      {
        id: `scenario-fallback-3`,
        title: "Knowledge Integration",
        description: `Integrate multiple concepts from your training`,
        context: `Explain how different parts of ${module.title} work together and demonstrate comprehensive understanding.`,
        expectedCompetencies: ["knowledge-integration", "comprehensive-understanding", "synthesis"],
        difficulty,
        maxQuestions: 4,
        passingScore: 70
      }
    ];
  }
} 