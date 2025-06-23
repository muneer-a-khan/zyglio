import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      moduleId,
      currentSubtopic,
      completedSubtopics,
      timeSpent,
    } = body;

    // Validate required fields
    if (!userId || !moduleId) {
      console.error('Missing required fields:', { userId: !!userId, moduleId: !!moduleId });
      return NextResponse.json(
        { error: 'User ID and Module ID are required' },
        { status: 400 }
      );
    }

    // Validate userId and moduleId are proper UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId) || !uuidRegex.test(moduleId)) {
      console.error('Invalid UUID format:', { userId, moduleId });
      return NextResponse.json(
        { error: 'Invalid User ID or Module ID format' },
        { status: 400 }
      );
    }

    // Get the module to calculate progress percentage
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      select: {
        subtopics: true
      }
    });

    if (!module) {
      return NextResponse.json(
        { error: 'Training module not found' },
        { status: 404 }
      );
    }

    const totalSubtopics = Array.isArray(module.subtopics) ? module.subtopics.length : 0;
    const completedCount = Array.isArray(completedSubtopics) ? completedSubtopics.length : 0;
    const progressPercentage = totalSubtopics > 0 ? Math.round((completedCount / totalSubtopics) * 100) : 0;

    // Validate timeSpent is a positive number if provided
    const validTimeSpent = typeof timeSpent === 'number' && timeSpent >= 0 ? timeSpent : 0;

    // Upsert the progress record
    const progress = await prisma.trainingProgress.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      },
      update: {
        ...(currentSubtopic && { currentSubtopic }),
        ...(Array.isArray(completedSubtopics) && { completedSubtopics }),
        ...(validTimeSpent > 0 && { timeSpent: { increment: validTimeSpent } }),
        progressPercentage,
        lastAccessedAt: new Date()
      },
      create: {
        userId,
        moduleId,
        currentSubtopic: currentSubtopic || null,
        completedSubtopics: Array.isArray(completedSubtopics) ? completedSubtopics : [],
        timeSpent: validTimeSpent,
        progressPercentage,
        lastAccessedAt: new Date()
      }
    });

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
        lastAccessedAt: progress.lastAccessedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating training progress:', error);
    return NextResponse.json(
      { error: 'Failed to update training progress', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 