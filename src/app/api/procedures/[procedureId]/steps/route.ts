import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ procedureId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { steps } = await req.json();
    const { procedureId } = await context.params;

    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'Invalid steps data' },
        { status: 400 }
      );
    }

    // Verify the procedure exists
    const procedure = await prisma.procedure.findUnique({
      where: {
        id: procedureId,
      },
    });

    if (!procedure) {
      return NextResponse.json(
        { error: "Procedure not found" },
        { status: 404 }
      );
    }

    // Verify the procedure belongs to the user
    const learningTask = await prisma.learningTask.findUnique({
      where: {
        id: procedure.taskId,
      },
    });

    if (!learningTask || learningTask.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 } // 403 Forbidden is more appropriate here
      );
    }

    // Delete existing steps
    await prisma.procedureStep.deleteMany({
      where: { procedureId }
    });

    // Create new steps
    await prisma.procedureStep.createMany({
      data: steps.map((step: any) => ({
        id: step.id,
        procedureId,
        content: step.content,
        index: step.order,
        isCheckpoint: step.isCheckpoint || false,
        expectedResponses: step.expectedResponses || [],
        updatedAt: new Date()
      }))
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving steps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 