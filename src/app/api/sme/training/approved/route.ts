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

    // Get all approved training modules that the SME owns/created
    const approvedModules = await prisma.trainingModule.findMany({
      where: {
        isApproved: true,
        procedure: {
          LearningTask: {
            userId: smeId // SME owns the procedure
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
        approver: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            certifications: true
          }
        }
      },
      orderBy: {
        approvedAt: 'desc'
      }
    });

    const formattedModules = approvedModules.map(module => {
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
        approvedAt: module.approvedAt?.toISOString() || null,
        approvedBy: module.approver,
        version: module.version,
        contentCount: module.content.length,
        quizCount: module.quizBanks.length,
        totalQuestions,
        estimatedTime: totalEstimatedTime,
        activeCertifications: module._count.certifications,
        status: 'approved',
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
      approvedModules: formattedModules,
      count: formattedModules.length
    });

  } catch (error) {
    console.error('Error loading approved training modules:', error);
    return NextResponse.json(
      { error: 'Failed to load approved training modules' },
      { status: 500 }
    );
  }
} 