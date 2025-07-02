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
    const isSME = session.user.role === 'sme' || session.user.role === 'admin';
    if (!isSME) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Get all modules where the user is the owner (via procedure.LearningTask.userId)
    const modules = await prisma.trainingModule.findMany({
      where: {
        procedure: {
          LearningTask: {
            userId: userId
          }
        }
      },
      include: {
        procedure: {
          select: {
            title: true,
            id: true,
            LearningTask: {
              select: {
                userId: true
              }
            }
          }
        },
        approver: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedModules = modules.map(module => {
      let subtopics = [];
      if (Array.isArray(module.subtopics)) {
        subtopics = module.subtopics;
      } else if (typeof module.subtopics === 'string') {
        try {
          const parsed = JSON.parse(module.subtopics);
          subtopics = Array.isArray(parsed) ? parsed : [];
        } catch {
          subtopics = [];
        }
      } else {
        subtopics = [];
      }
      return {
        id: module.id,
        title: module.title,
        procedureId: module.procedureId,
        procedureTitle: module.procedure.title,
        subtopics,
        isApproved: module.isApproved,
        approvedAt: module.approvedAt?.toISOString() || null,
        approvedBy: module.approver ? {
          name: module.approver.name,
          email: module.approver.email
        } : null,
        createdAt: module.createdAt.toISOString(),
        version: module.version,
        isOwned: true
      };
    });

    return NextResponse.json({
      success: true,
      modules: formattedModules
    });
  } catch (error) {
    console.error('Error loading SME training modules:', error);
    return NextResponse.json(
      { error: 'Failed to load SME training modules' },
      { status: 500 }
    );
  }
} 