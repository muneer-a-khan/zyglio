import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (moduleId) {
      // Get progress for specific module
      const progress = await prisma.trainingProgress.findUnique({
        where: {
          userId_moduleId: {
            userId,
            moduleId
          }
        },
        include: {
          module: {
            select: {
              title: true,
              subtopics: true
            }
          }
        }
      });

      if (!progress) {
        // Create initial progress record
        const newProgress = await prisma.trainingProgress.create({
          data: {
            userId,
            moduleId,
            progressPercentage: 0,
            completedSubtopics: [],
            timeSpent: 0
          },
          include: {
            module: {
              select: {
                title: true,
                subtopics: true
              }
            }
          }
        });

        return NextResponse.json({
          success: true,
          progress: {
            id: newProgress.id,
            currentSubtopic: newProgress.currentSubtopic,
            completedSubtopics: Array.isArray(newProgress.completedSubtopics) 
              ? newProgress.completedSubtopics 
              : [],
            timeSpent: newProgress.timeSpent,
            progressPercentage: newProgress.progressPercentage,
            lastAccessedAt: newProgress.lastAccessedAt.toISOString(),
            moduleTitle: newProgress.module.title,
            totalSubtopics: Array.isArray(newProgress.module.subtopics) 
              ? newProgress.module.subtopics.length 
              : 0
          }
        });
      }

      return NextResponse.json({
        success: true,
        progress: {
          id: progress.id,
          currentSubtopic: progress.currentSubtopic,
          completedSubtopics: Array.isArray(progress.completedSubtopics) 
            ? progress.completedSubtopics 
            : [],
          timeSpent: progress.timeSpent,
          progressPercentage: progress.progressPercentage,
          lastAccessedAt: progress.lastAccessedAt.toISOString(),
          moduleTitle: progress.module.title,
          totalSubtopics: Array.isArray(progress.module.subtopics) 
            ? progress.module.subtopics.length 
            : 0
        }
      });
    } else {
      // Get all progress for user
      const allProgress = await prisma.trainingProgress.findMany({
        where: { userId },
        include: {
          module: {
            select: {
              title: true,
              subtopics: true,
              procedure: {
                select: {
                  title: true
                }
              }
            }
          }
        },
        orderBy: {
          lastAccessedAt: 'desc'
        }
      });

      const formattedProgress = allProgress.map(progress => ({
        id: progress.id,
        moduleId: progress.moduleId,
        moduleTitle: progress.module.title,
        procedureTitle: progress.module.procedure.title,
        currentSubtopic: progress.currentSubtopic,
        completedSubtopics: Array.isArray(progress.completedSubtopics) 
          ? progress.completedSubtopics 
          : [],
        timeSpent: progress.timeSpent,
        progressPercentage: progress.progressPercentage,
        lastAccessedAt: progress.lastAccessedAt.toISOString(),
        totalSubtopics: Array.isArray(progress.module.subtopics) 
          ? progress.module.subtopics.length 
          : 0
      }));

      return NextResponse.json({
        success: true,
        progress: formattedProgress
      });
    }

  } catch (error) {
    console.error('Error loading training progress:', error);
    return NextResponse.json(
      { error: 'Failed to load training progress' },
      { status: 500 }
    );
  }
} 