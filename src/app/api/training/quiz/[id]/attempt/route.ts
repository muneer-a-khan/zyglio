import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId, answers, timeSpent } = await request.json();

    if (!id || !userId || !answers) {
      return NextResponse.json(
        { error: 'Quiz ID, user ID, and answers are required' },
        { status: 400 }
      );
    }

    // Get the quiz bank to check answers
    const quizBank = await prisma.quizBank.findUnique({
      where: { id },
      include: {
        module: true,
        attempts: {
          where: {
            userId
          },
          orderBy: {
            attemptNumber: 'desc'
          },
          take: 1
        }
      }
    });

    if (!quizBank) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Calculate the score
    const questions = Array.isArray(quizBank.questions) ? quizBank.questions : [];
    let correctCount = 0;
    
    const gradedAnswers = answers.map((answer: any) => {
      const question = questions.find((q: any) => q.question === answer.question);
      const isCorrect = question && question.correctAnswer === answer.selectedAnswer;
      
      if (isCorrect) {
        correctCount++;
      }
      
      return {
        ...answer,
        isCorrect,
        correctAnswer: question ? question.correctAnswer : null,
        explanation: question ? question.explanation : null
      };
    });
    
    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= (quizBank.passingScore || 80);
    
    // Determine attempt number
    const attemptNumber = quizBank.attempts.length > 0 
      ? quizBank.attempts[0].attemptNumber + 1 
      : 1;
    
    // Record the attempt
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizBankId: id,
        answers: gradedAnswers,
        score,
        passed,
        timeSpent: timeSpent || 0,
        attemptNumber,
        completedAt: new Date()
      }
    });
    
    // Update training progress if passed
    if (passed) {
      // Find the subtopic for this quiz
      const subtopic = quizBank.subtopic;
      
      // First get the current progress
      const currentProgress = await prisma.trainingProgress.findUnique({
        where: {
          userId_moduleId: {
            userId,
            moduleId: quizBank.moduleId
          }
        }
      });
      
      // Update the user's progress for this module
      await prisma.trainingProgress.upsert({
        where: {
          userId_moduleId: {
            userId,
            moduleId: quizBank.moduleId
          }
        },
        update: {
          completedSubtopics: currentProgress ? 
            Array.isArray(currentProgress.completedSubtopics) ?
              [...new Set([...currentProgress.completedSubtopics, subtopic])] : 
              [subtopic] :
            [subtopic]
        },
        create: {
          userId,
          moduleId: quizBank.moduleId,
          currentSubtopic: subtopic,
          completedSubtopics: [subtopic],
          progressPercentage: 0,
          timeSpent: 0
        }
      }).catch(error => {
        console.error('Error updating training progress:', error);
      });
    }
    
    return NextResponse.json({
      success: true,
      attempt: {
        id: quizAttempt.id,
        score,
        passed,
        attemptNumber,
        gradedAnswers,
        completedAt: quizAttempt.completedAt.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz attempt' },
      { status: 500 }
    );
  }
} 