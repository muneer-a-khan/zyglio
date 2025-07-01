import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const procedureId = searchParams.get('procedureId');
    
    console.log('Debug endpoint called:', { 
      procedureId, 
      sessionUserId: session?.user?.id 
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: "Not authenticated",
        session: null
      }, { status: 401 });
    }

    if (!procedureId) {
      return NextResponse.json({ 
        error: "Procedure ID is required" 
      }, { status: 400 });
    }

    // Get procedure details with all related data
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: {
        LearningTask: true
      }
    });

    if (!procedure) {
      return NextResponse.json({
        error: "Procedure not found",
        procedureId
      }, { status: 404 });
    }

    // Get all procedures for this user to see the bigger picture
    const userProcedures = await prisma.procedure.findMany({
      where: {
        LearningTask: {
          userId: session.user.id
        }
      },
      include: {
        LearningTask: {
          select: {
            id: true,
            userId: true,
            title: true
          }
        }
      }
    });

    // Check if there are any user ID mismatches in the database
    const allTasksForProcedure = await prisma.learningTask.findMany({
      where: {
        Procedure: {
          some: {
            id: procedureId
          }
        }
      }
    });

    return NextResponse.json({
      debug: {
        sessionUserId: session.user.id,
        sessionEmail: session.user.email,
        procedureId,
        procedure: {
          id: procedure.id,
          title: procedure.title,
          taskId: procedure.taskId,
          learningTask: procedure.LearningTask ? {
            id: procedure.LearningTask.id,
            userId: procedure.LearningTask.userId,
            title: procedure.LearningTask.title
          } : null
        },
        userOwnsThisProcedure: procedure.LearningTask?.userId === session.user.id,
        userIdMatch: {
          sessionUserId: session.user.id,
          taskUserId: procedure.LearningTask?.userId,
          matches: procedure.LearningTask?.userId === session.user.id
        },
        totalUserProcedures: userProcedures.length,
        userProcedureIds: userProcedures.map(p => p.id),
        allTasksForThisProcedure: allTasksForProcedure.map(t => ({
          taskId: t.id,
          taskUserId: t.userId,
          title: t.title
        }))
      }
    });
    
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: error.message || "Debug endpoint error",
      stack: error.stack
    }, { status: 500 });
  }
} 