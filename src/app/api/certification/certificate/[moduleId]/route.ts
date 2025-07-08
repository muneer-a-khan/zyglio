import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { moduleId } = await params;
    
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }
    
    // Get the certification for this user and module
    const certification = await prisma.certification.findFirst({
      where: {
        userId,
        moduleId,
        status: 'COMPLETED',
        passed: true
      },
      include: {
        module: {
          select: {
            title: true,
            procedure: {
              select: {
                title: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        certifiedAt: 'desc'
      }
    });
    
    if (!certification) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      certificate: {
        id: certification.id,
        userId: certification.userId,
        moduleId: certification.moduleId,
        moduleTitle: certification.module.title,
        procedureTitle: certification.module.procedure?.title || 'Unknown Procedure',
        score: certification.overallScore || 0,
        certifiedAt: certification.certifiedAt?.toISOString() || new Date().toISOString(),
        userName: certification.user?.name || certification.user?.email || 'User'
      }
    });
    
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
} 