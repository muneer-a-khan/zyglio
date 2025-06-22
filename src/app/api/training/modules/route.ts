import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get all approved training modules with user progress and certification status
    const modules = await prisma.trainingModule.findMany({
      where: {
        isApproved: true
      },
      include: {
        procedure: {
          select: {
            title: true,
            id: true
          }
        },
        content: {
          select: {
            estimatedTime: true
          }
        },
        progress: {
          where: {
            userId: userId
          }
        },
        certifications: {
          where: {
            userId: userId
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to include calculated fields
    const formattedModules = modules.map(module => {
      const userProgress = module.progress[0];
      const userCertification = module.certifications[0];
      const totalEstimatedTime = module.content.reduce((sum, content) => sum + content.estimatedTime, 0);

      return {
        id: module.id,
        title: module.title,
        procedureTitle: module.procedure.title,
        procedureId: module.procedure.id,
        subtopics: Array.isArray(module.subtopics) ? module.subtopics : [],
        isApproved: module.isApproved,
        createdAt: module.createdAt.toISOString(),
        estimatedTime: totalEstimatedTime,
        progress: userProgress ? {
          progressPercentage: userProgress.progressPercentage,
          completedSubtopics: Array.isArray(userProgress.completedSubtopics) 
            ? userProgress.completedSubtopics 
            : [],
          timeSpent: userProgress.timeSpent,
          currentSubtopic: userProgress.currentSubtopic,
          lastAccessedAt: userProgress.lastAccessedAt.toISOString()
        } : {
          progressPercentage: 0,
          completedSubtopics: [],
          timeSpent: 0,
          currentSubtopic: null,
          lastAccessedAt: null
        },
        certification: userCertification ? {
          status: userCertification.status,
          passed: userCertification.passed,
          certifiedAt: userCertification.certifiedAt?.toISOString(),
          overallScore: userCertification.overallScore,
          quizScore: userCertification.quizScore,
          adaptiveDifficulty: userCertification.adaptiveDifficulty
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      modules: formattedModules
    });

  } catch (error) {
    console.error('Error loading training modules:', error);
    return NextResponse.json(
      { error: 'Failed to load training modules' },
      { status: 500 }
    );
  }
} 