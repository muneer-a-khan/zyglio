import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get the training modules with all related data
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
    const formattedModules = modules.map(module => ({
      id: module.id,
      title: module.title,
      procedureId: module.procedureId,
      procedureTitle: module.procedure.title,
      subtopics: Array.isArray(module.subtopics) ? module.subtopics : [],
      isApproved: module.isApproved,
      approvedAt: module.approvedAt?.toISOString() || null,
      approvedBy: module.approver ? {
        name: module.approver.name,
        email: module.approver.email
      } : null,
      createdAt: module.createdAt.toISOString(),
      version: module.version
    }));

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