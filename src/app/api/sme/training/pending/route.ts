import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const smeId = searchParams.get('smeId');

    if (!smeId) {
      return NextResponse.json(
        { error: 'SME ID is required' },
        { status: 400 }
      );
    }

    // Get all training modules that need approval
    // SMEs can approve modules for procedures they created
    const pendingModules = await prisma.trainingModule.findMany({
      where: {
        isApproved: false,
        procedure: {
          LearningTask: {
            userId: smeId // Using userId instead of createdBy
          }
        }
      },
      include: {
        procedure: {
          include: {
            LearningTask: {
              select: {
                title: true,
                id: true
              }
            }
          }
        },
        content: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        quizBanks: {
          include: {
            _count: {
              select: {
                attempts: true
              }
            }
          }
        },
        _count: {
          select: {
            certifications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedModules = pendingModules.map(module => {
      const totalQuestions = module.quizBanks.reduce((sum, quiz) => {
        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        return sum + questions.length;
      }, 0);

      const totalEstimatedTime = module.content.reduce((sum, content) => sum + content.estimatedTime, 0);

      return {
        id: module.id,
        title: module.title,
        procedureTitle: module.procedure.title,
        taskTitle: module.procedure.LearningTask.title,
        subtopics: Array.isArray(module.subtopics) ? module.subtopics : [],
        createdAt: module.createdAt.toISOString(),
        version: module.version,
        contentCount: module.content.length,
        quizCount: module.quizBanks.length,
        totalQuestions,
        estimatedTime: totalEstimatedTime,
        waitingCertifications: module._count.certifications,
        status: 'pending_approval',
        contentTypes: module.content.reduce((types: string[], content) => {
          if (!types.includes(content.contentType)) {
            types.push(content.contentType);
          }
          return types;
        }, [])
      };
    });

    return NextResponse.json({
      success: true,
      pendingModules: formattedModules,
      count: formattedModules.length
    });

  } catch (error) {
    console.error('Error loading pending training modules:', error);
    return NextResponse.json(
      { error: 'Failed to load pending training modules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { moduleId, smeId, action, feedback } = await request.json();

    if (!moduleId || !smeId || !action) {
      return NextResponse.json(
        { error: 'Module ID, SME ID, and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or request_changes' },
        { status: 400 }
      );
    }

    // Get the training module
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        procedure: {
          include: {
            LearningTask: true
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

    // Verify SME has permission to approve this module
    // This would typically check if the SME created the original procedure
    // For now, we'll assume any SME can approve any module

    if (action === 'approve') {
      // Approve the module
      const updatedModule = await prisma.trainingModule.update({
        where: { id: moduleId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: smeId
        }
      });

      // Check if there's an existing certification for this module and user
      const existingCertification = await prisma.certification.findFirst({
        where: {
          moduleId: moduleId,
          userId: smeId
        }
      });

      // Only create analytics if a certification exists
      if (existingCertification) {
        // Log approval activity
        await prisma.certificationAnalytics.create({
          data: {
            userId: smeId,
            moduleId: moduleId,
            eventType: 'TRAINING_STARTED',
            eventData: {
              action: 'module_approved',
              approvedAt: new Date().toISOString(),
              feedback: feedback || null
            },
            certificationId: existingCertification.id
          }
        }).catch((err) => {
          console.warn('Failed to log approval analytics:', err);
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Training module approved successfully',
        module: {
          id: updatedModule.id,
          isApproved: updatedModule.isApproved,
          approvedAt: updatedModule.approvedAt?.toISOString(),
          approvedBy: updatedModule.approvedBy
        }
      });

    } else if (action === 'reject') {
      // For rejection, we might want to mark it differently or delete it
      // For now, let's just add a rejection reason to the module data
      const updatedModule = await prisma.trainingModule.update({
        where: { id: moduleId },
        data: {
          // We could add a rejectionReason field to the schema if needed
          // For now, we'll store it in a JSON field if available
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Training module rejected',
        feedback: feedback || 'Module was rejected by SME'
      });

    } else if (action === 'request_changes') {
      // Mark as needing changes
      return NextResponse.json({
        success: true,
        message: 'Changes requested for training module',
        feedback: feedback || 'Changes requested by SME'
      });
    }

  } catch (error) {
    console.error('Error processing training module approval:', error);
    return NextResponse.json(
      { error: 'Failed to process training module approval' },
      { status: 500 }
    );
  }
} 