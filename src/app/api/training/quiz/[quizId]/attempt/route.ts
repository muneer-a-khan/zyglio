import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const { quizId } = params;
    const { userId, answers, timeSpent } = await request.json();

    if (!userId || !answers) {
      return NextResponse.json(
        { error: 'User ID and answers are required' },
        { status: 400 }
      );
    }

    // Get the quiz bank with questions
    const quizBank = await prisma.quizBank.findUnique({
      where: { id: quizId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            subtopics: true
          }
        }
      }
    });

    if (!quizBank) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const questions = Array.isArray(quizBank.questions) ? quizBank.questions : [];

    // Calculate score
    let correctAnswers = 0;
    const detailedResults = questions.map((question: any, index: number) => {
      const userAnswer = answers[index];
      let isCorrect = false;

      switch (question.type) {
        case 'multiple_choice':
          isCorrect = userAnswer === question.correct;
          break;
        case 'true_false':
          isCorrect = userAnswer === question.correct;
          break;
        case 'fill_blank':
        case 'short_answer':
          // Simple string comparison (could be enhanced with fuzzy matching)
          const correctAnswer = question.correct?.toLowerCase()?.trim();
          const userAnswerText = userAnswer?.toLowerCase()?.trim();
          isCorrect = correctAnswer === userAnswerText;
          break;
        default:
          isCorrect = false;
      }

      if (isCorrect) correctAnswers++;

      return {
        questionIndex: index,
        question: question.question,
        userAnswer,
        correctAnswer: question.correct,
        isCorrect,
        explanation: question.explanation
      };
    });

    const score = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
    const passed = score >= quizBank.passingScore;

    // Get the user's previous attempt count for this quiz
    const previousAttempts = await prisma.quizAttempt.count({
      where: {
        userId,
        quizBankId: quizId
      }
    });

    const attemptNumber = previousAttempts + 1;

    // Create the quiz attempt record
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizBankId: quizId,
        answers,
        score,
        passed,
        timeSpent: timeSpent || 0,
        attemptNumber
      }
    });

    // Log analytics event
    await prisma.certificationAnalytics.create({
      data: {
        userId,
        moduleId: quizBank.moduleId,
        eventType: passed ? 'QUIZ_PASSED' : 'QUIZ_FAILED',
        eventData: {
          quizId,
          subtopic: quizBank.subtopic,
          score,
          passingScore: quizBank.passingScore,
          attemptNumber,
          timeSpent,
          questionsCorrect: correctAnswers,
          totalQuestions: questions.length
        },
        certificationId: null // Will be set later when certification is created
      }
    }).catch(() => {
      console.warn('Failed to log analytics event');
    });

    // If passed, update training progress
    if (passed) {
      try {
        // Get current progress
        const currentProgress = await prisma.trainingProgress.findUnique({
          where: {
            userId_moduleId: {
              userId,
              moduleId: quizBank.moduleId
            }
          }
        });

        if (currentProgress) {
          const completedSubtopics = Array.isArray(currentProgress.completedSubtopics) 
            ? currentProgress.completedSubtopics 
            : [];
          
          if (!completedSubtopics.includes(quizBank.subtopic)) {
            completedSubtopics.push(quizBank.subtopic);

            const totalSubtopics = Array.isArray(quizBank.module.subtopics) 
              ? quizBank.module.subtopics.length 
              : 0;
            const progressPercentage = totalSubtopics > 0 
              ? Math.round((completedSubtopics.length / totalSubtopics) * 100) 
              : 0;

            await prisma.trainingProgress.update({
              where: {
                userId_moduleId: {
                  userId,
                  moduleId: quizBank.moduleId
                }
              },
              data: {
                completedSubtopics,
                progressPercentage,
                lastAccessedAt: new Date()
              }
            });
          }
        }
      } catch (error) {
        console.warn('Failed to update training progress:', error);
      }
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: quizAttempt.id,
        score,
        passed,
        passingScore: quizBank.passingScore,
        attemptNumber,
        timeSpent: quizAttempt.timeSpent,
        completedAt: quizAttempt.completedAt.toISOString(),
        detailedResults,
        feedback: passed 
          ? `Congratulations! You passed with ${score}%` 
          : `You scored ${score}%. You need ${quizBank.passingScore}% to pass. Review the material and try again.`
      }
    });

  } catch (error) {
    console.error('Error processing quiz attempt:', error);
    return NextResponse.json(
      { error: 'Failed to process quiz attempt' },
      { status: 500 }
    );
  }
} 