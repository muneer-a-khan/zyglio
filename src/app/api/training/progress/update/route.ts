import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      moduleId,
      currentSubtopic,
      completedSubtopics,
      timeSpent,
    } = await request.json();

    if (!userId || !moduleId) {
      return NextResponse.json(
        { error: 'User ID and Module ID are required' },
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

    // Upsert the progress record
    const progress = await prisma.trainingProgress.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      },
      update: {
        currentSubtopic,
        completedSubtopics: completedSubtopics || [],
        timeSpent: timeSpent ? { increment: timeSpent } : undefined,
        progressPercentage,
        lastAccessedAt: new Date()
      },
      create: {
        userId,
        moduleId,
        currentSubtopic,
        completedSubtopics: completedSubtopics || [],
        timeSpent: timeSpent || 0,
        progressPercentage,
        lastAccessedAt: new Date()
      }
    });

    // Log analytics event
    await prisma.certificationAnalytics.create({
      data: {
        userId,
        moduleId,
        eventType: 'TRAINING_STARTED',
        eventData: {
          currentSubtopic,
          progressPercentage,
          timeSpent: progress.timeSpent,
          completedSubtopics: completedCount
        },
        certificationId: null // Will be set later when certification is created
      }
    }).catch(() => {
      // Don't fail the request if analytics fails
      console.warn('Failed to log analytics event');
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
      { error: 'Failed to update training progress' },
      { status: 500 }
    );
  }
} 