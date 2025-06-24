import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { moduleId } = params;
    
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }
    
    // First check if the module exists and is approved
    const module = await prisma.trainingModule.findUnique({
      where: {
        id: moduleId,
        isApproved: true,
      },
      select: {
        id: true,
        title: true,
        subtopics: true
      }
    });
    
    if (!module) {
      return NextResponse.json({ error: 'Module not found or not approved' }, { status: 404 });
    }

    // Get the user's progress for this module
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
    
    // Get the quiz banks for this module as a backup check
    const quizBanks = await prisma.quizBank.findMany({
      where: {
        moduleId
      },
      include: {
        attempts: {
          where: {
            userId,
            passed: true
          }
        }
      }
    });
    
    // Check if all quizzes have passing attempts as a backup
    const totalQuizzes = quizBanks.length;
    const passedQuizzes = quizBanks.filter(quiz => quiz.attempts.length > 0).length;
    const allQuizzesPassed = passedQuizzes === totalQuizzes && totalQuizzes > 0;
    
    // User is eligible if either all subtopics are completed OR all quizzes are passed
    const eligible = allSubtopicsCompleted || allQuizzesPassed;
    
    // If not eligible, return that information
    if (!eligible) {
      return NextResponse.json({ 
        eligible: false,
        passedQuizzes,
        totalQuizzes,
        completedSubtopics: completedSubtopics.length,
        totalSubtopics: subtopics.length,
        message: "You need to complete all topics before attempting certification"
      }, { status: 403 });
    }
    
    // Get existing certification if any
    const certification = await prisma.certification.findFirst({
      where: {
        userId,
        moduleId
      },
      orderBy: {
        certifiedAt: 'desc'
      }
    });
    
    return NextResponse.json({
      eligible: true,
      passedQuizzes,
      totalQuizzes,
      completedSubtopics: completedSubtopics.length,
      totalSubtopics: subtopics.length,
      certification: certification || null
    });
    
  } catch (error) {
    console.error('Error checking certification eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check certification eligibility' },
      { status: 500 }
    );
  }
} 