import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    console.log(`Eligible modules API called for user: ${userId}`);
    
    // Get all modules where the user has completed at least one quiz
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        passed: true
      },
      select: {
        quizBank: {
          select: {
            moduleId: true
          }
        }
      },
      distinct: ['quizBankId']
    });
    
    const moduleIdsWithAttempts = quizAttempts.map(
      attempt => attempt.quizBank.moduleId
    );
    
    if (moduleIdsWithAttempts.length === 0) {
      // No modules with any passed quizzes
      console.log(`No modules with passed quizzes for user: ${userId}`);
      return NextResponse.json({ modules: [] });
    }
    
    console.log(`Found ${moduleIdsWithAttempts.length} modules with passed quizzes for user: ${userId}`);
    console.log(`Module IDs: ${moduleIdsWithAttempts.join(', ')}`);
    
    // Get relevant modules
    const modules = await prisma.trainingModule.findMany({
      where: {
        id: {
          in: moduleIdsWithAttempts
        },
        isApproved: true
      },
      include: {
        procedure: {
          select: {
            title: true
          }
        },
        quizBanks: {
          select: {
            id: true,
            attempts: {
              where: {
                userId,
                passed: true
              },
              select: {
                id: true
              }
            }
          }
        },
        certifications: {
          where: {
            userId
          },
          select: {
            id: true,
            status: true,
            passed: true,
            certifiedAt: true,
            overallScore: true,
          },
          orderBy: {
            certifiedAt: 'desc'
          },
          take: 1
        }
      }
    });
    
    // Format for the frontend
    const formattedModules = modules.map(module => {
      const totalQuizzes = module.quizBanks.length;
      const passedQuizzes = module.quizBanks.filter(
        quiz => quiz.attempts.length > 0
      ).length;
      
      // Get latest certification attempt if it exists
      const certification = module.certifications[0] || null;
      
      console.log(`Module ${module.id} (${module.title}): Passed ${passedQuizzes}/${totalQuizzes} quizzes, Approved: ${module.isApproved}`);
      
      return {
        id: module.id,
        title: module.title,
        procedureTitle: module.procedure?.title || 'Unknown Procedure',
        completedQuizzes: passedQuizzes,
        totalQuizzes: totalQuizzes,
        certificationStatus: certification?.status || null,
        lastAttempt: certification?.certifiedAt || null,
        passed: certification?.passed || false
      };
    });
    
    console.log(`Returning ${formattedModules.length} eligible modules for user: ${userId}`);
    
    return NextResponse.json({
      modules: formattedModules
    });
    
  } catch (error) {
    console.error('Error fetching eligible modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligible modules' },
      { status: 500 }
    );
  }
} 