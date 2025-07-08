import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VoiceQuestionsService } from '@/lib/services/voice-questions.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { moduleId } = await context.params;

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID is required' },
        { status: 400 }
      );
    }

    // Get the training module with all related data
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        procedure: {
          include: {
            LearningTask: {
              select: {
                userId: true
              }
            }
          }
        },
        content: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        quizBanks: true,
        approver: {
          select: {
            name: true,
            email: true
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

    // Check authorization for unapproved modules
    if (!module.isApproved) {
      // Only allow access to unapproved modules for:
      // 1. SMEs (who can review/approve)
      // 2. Admins
      // 3. The original creator of the procedure
      const isAuthorized = session?.user && (
        session.user.role === 'sme' ||
        session.user.role === 'admin' ||
        session.user.id === module.procedure.LearningTask?.userId
      );

      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'Training module is not approved yet' },
          { status: 403 }
        );
      }
    }

    // Format the response
    const formattedModule = {
      id: module.id,
      title: module.title,
      procedureTitle: module.procedure.title,
      procedureId: module.procedure.id,
      subtopics: Array.isArray(module.subtopics) ? module.subtopics : [],
      isApproved: module.isApproved,
      approvedAt: module.approvedAt?.toISOString(),
      approvedBy: module.approver,
      createdAt: module.createdAt.toISOString(),
      version: module.version,
      content: module.content.map(content => ({
        id: content.id,
        subtopic: content.subtopic,
        contentType: content.contentType,
        title: content.title,
        content: content.content,
        orderIndex: content.orderIndex,
        estimatedTime: content.estimatedTime,
        createdAt: content.createdAt.toISOString()
      })),
      quizBanks: module.quizBanks.map(quiz => ({
        id: quiz.id,
        subtopic: quiz.subtopic,
        questions: Array.isArray(quiz.questions) ? quiz.questions : [],
        passingScore: quiz.passingScore,
        createdAt: quiz.createdAt.toISOString()
      }))
    };

    return NextResponse.json({
      success: true,
      module: formattedModule
    });

  } catch (error) {
    console.error('Error loading training module:', error);
    return NextResponse.json(
      { error: 'Failed to load training module' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await params;
    const data = await request.json();

    // Update the training module
    const updatedModule = await prisma.trainingModule.update({
      where: { id: moduleId },
      data
    });

    // Trigger background generation of voice certification questions
    setTimeout(() => {
      VoiceQuestionsService.generateQuestionsForModule(moduleId)
        .then(success => {
          console.log(`Background question generation ${success ? 'completed' : 'failed'} for module ${moduleId}`);
        })
        .catch(err => {
          console.error(`Error in background question generation for module ${moduleId}:`, err);
        });
    }, 100);

    return NextResponse.json(updatedModule);
  } catch (error) {
    console.error('Error updating training module:', error);
    return NextResponse.json(
      { error: 'Failed to update training module' },
      { status: 500 }
    );
  }
} 