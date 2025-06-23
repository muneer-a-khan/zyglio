import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { moduleId } = await request.json();

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID is required' },
        { status: 400 }
      );
    }

    // Get all quiz banks for the module
    const quizBanks = await prisma.quizBank.findMany({
      where: { moduleId }
    });

    let fixedCount = 0;

    for (const quizBank of quizBanks) {
      const questions = Array.isArray(quizBank.questions) ? quizBank.questions : [];
      let hasChanges = false;

      const fixedQuestions = questions.map((question: any, index: number) => {
        const fixed = {
          question: question.question || `Question ${index + 1} about ${quizBank.subtopic}`,
          options: Array.isArray(question.options) ? question.options : [],
          correctAnswer: typeof question.correctAnswer === 'number' ? question.correctAnswer : 
                        typeof question.correct === 'number' ? question.correct : 0,
          explanation: question.explanation || 'Please review the content for the correct answer.'
        };

        // Fix options array
        const originalOptionsLength = fixed.options.length;
        
        // Ensure we have exactly 4 options
        while (fixed.options.length < 4) {
          fixed.options.push(`Option ${String.fromCharCode(65 + fixed.options.length)}`);
          hasChanges = true;
        }
        
        if (fixed.options.length > 4) {
          fixed.options = fixed.options.slice(0, 4);
          hasChanges = true;
        }

        // Ensure correctAnswer is within bounds
        if (fixed.correctAnswer < 0 || fixed.correctAnswer >= fixed.options.length) {
          fixed.correctAnswer = 0;
          hasChanges = true;
        }

        // Check if this question was actually fixed
        if (originalOptionsLength !== 4 || fixed.correctAnswer !== question.correctAnswer) {
          hasChanges = true;
        }

        return fixed;
      }).filter((q: any) => q.question && q.question.trim() !== '');

      // Ensure we have at least 5 questions
      while (fixedQuestions.length < 5) {
        fixedQuestions.push({
          question: `Additional question ${fixedQuestions.length + 1} about ${quizBank.subtopic}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'Please review the content for the correct answer.'
        });
        hasChanges = true;
      }

      if (hasChanges) {
        await prisma.quizBank.update({
          where: { id: quizBank.id },
          data: { questions: fixedQuestions }
        });
        fixedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} quiz banks`,
      fixedCount
    });

  } catch (error) {
    console.error('Error fixing training content:', error);
    return NextResponse.json(
      { error: 'Failed to fix training content' },
      { status: 500 }
    );
  }
} 