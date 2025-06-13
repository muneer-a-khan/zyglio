import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { procedureId, settings } = await req.json();

    if (!procedureId || !settings) {
      return NextResponse.json(
        { error: 'Procedure ID and settings are required' },
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
        { status: 403 }
      );
    }

    // Update the procedure with simulation settings
    const updatedProcedure = await prisma.procedure.update({
      where: { id: procedureId },
      data: {
        simulationSettings: settings
      }
    });

    return NextResponse.json(updatedProcedure);
  } catch (error) {
    console.error('Error saving simulation settings:', error);
    return NextResponse.json(
      { error: 'Failed to save simulation settings' },
      { status: 500 }
    );
  }
} 