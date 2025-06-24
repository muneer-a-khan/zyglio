import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeepSeekApi } from '@/lib/deepseek';
import { VoiceQuestionsService } from '@/lib/services/voice-questions.service';

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
    // If no quiz attempts, use a default score based on progress
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

    // Get questions from the question bank or generate them if needed
    console.log(`Getting questions for module ${moduleId} with difficulty ${adaptiveDifficulty}`);
    
    // Try to get questions from the bank first
    let questions = await VoiceQuestionsService.getQuestionsForCertification(moduleId, adaptiveDifficulty);
    
    // If no questions in bank, trigger background generation for future use
    if (questions.length === 0) {
      console.log(`No questions found in bank, using fallback questions`);
      const fallbackQuestions = generateFallbackQuestions(module, adaptiveDifficulty);
      questions = fallbackQuestions.questions;
      
      // Trigger background generation for future use
      setTimeout(() => {
        VoiceQuestionsService.generateQuestionsForModule(moduleId, true)
          .then(success => {
            console.log(`Background question generation ${success ? 'completed' : 'failed'} for module ${moduleId}`);
          })
          .catch(err => {
            console.error(`Error in background question generation for module ${moduleId}:`, err);
          });
      }, 100);
    }
    
    // Update certification with questions
    await prisma.certification.update({
      where: { id: certification.id },
      data: {
        voiceInterviewData: {
          ...certification.voiceInterviewData,
          questions: questions,
          currentQuestionIndex: 0,
          responses: []
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
          questionsGenerated: questions.length,
          source: questions.length > 3 ? 'question_bank' : 'fallback'
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
        estimatedDuration: 15,
        totalQuestions: questions.length,
        currentQuestion: questions[0],
        voiceInterviewData: {
          questions,
          currentQuestionIndex: 0
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

function generateFallbackQuestions(module: any, difficulty: string) {
  const subtopics = Array.isArray(module.subtopics) ? module.subtopics : [];
  
  const questions = [
    {
      id: 'q1',
      type: 'factual',
      difficulty: difficulty.toLowerCase(),
      question: `Can you explain the main purpose of the ${module.title} procedure?`,
      expectedKeywords: ['procedure', 'purpose', 'objective'],
      competencyArea: 'Basic Understanding',
      points: 5,
      scoringCriteria: {
        excellent: 'Clear explanation with all key points',
        good: 'Good explanation with most key points',
        adequate: 'Basic explanation with some key points',
        poor: 'Incomplete or unclear explanation'
      }
    },
    {
      id: 'q2', 
      type: 'scenario',
      difficulty: difficulty.toLowerCase(),
      question: `Describe a situation where you would need to follow this procedure and walk me through the key steps.`,
      expectedKeywords: ['steps', 'process', 'sequence'],
      competencyArea: 'Practical Application',
      points: 8,
      scoringCriteria: {
        excellent: 'Comprehensive scenario with correct steps',
        good: 'Good scenario with mostly correct steps',
        adequate: 'Basic scenario with some correct steps',
        poor: 'Unclear scenario or incorrect steps'
      }
    },
    {
      id: 'q3',
      type: 'safety',
      difficulty: difficulty.toLowerCase(),
      question: 'What safety considerations should be kept in mind when following this procedure?',
      expectedKeywords: ['safety', 'precautions', 'risks'],
      competencyArea: 'Safety Awareness',
      points: 7,
      scoringCriteria: {
        excellent: 'Identifies all major safety considerations',
        good: 'Identifies most safety considerations',
        adequate: 'Identifies basic safety considerations',
        poor: 'Limited or no safety awareness'
      }
    }
  ];

  // Add more questions based on subtopics
  subtopics.forEach((subtopic: any, index: number) => {
    if (index < 5) { // Limit to 5 additional questions
      questions.push({
        id: `q${questions.length + 1}`,
        type: 'factual',
        difficulty: difficulty.toLowerCase(),
        question: `Tell me about ${subtopic.title || subtopic} and its importance in this procedure.`,
        expectedKeywords: [subtopic.title || subtopic, 'importance', 'role'],
        competencyArea: subtopic.title || subtopic,
        points: 5,
        scoringCriteria: {
          excellent: 'Thorough understanding and explanation',
          good: 'Good understanding with minor gaps',
          adequate: 'Basic understanding',
          poor: 'Limited or incorrect understanding'
        }
      });
    }
  });

  return { questions };
} 