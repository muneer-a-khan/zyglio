import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { databaseService } from "@/lib/database";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ success: false, message: "Not authenticated or missing email" }, { status: 401 });
    }

    const userId = session.user.id;
    const taskData = await req.json();
    
    // Get or create user using the database service
    // We've already checked that email exists above, so we can safely assert it's a string
    const user = await databaseService.getOrCreateUser(session.user.email as string, session.user.name || undefined);
    
    // Generate UUIDs for the task and procedure
    const taskId = uuidv4();
    const procedureId = uuidv4();
    
    // Create a learning task and procedure in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // First, create the learning task
      const task = await tx.learningTask.create({
        data: {
          id: taskId,
          title: taskData.name,
          kpiTech: taskData.kpiTech?.join(', ') || null,
          kpiConcept: taskData.kpiConcept?.join(', ') || null,
          presenter: taskData.presenter,
          affiliation: taskData.affiliation,
          date: new Date(taskData.date),
          userId: user.id,
        }
      });
      
      console.log('Learning task created:', task.id);
      
      // Then create the procedure linked to the task
      const procedure = await tx.procedure.create({
        data: {
          id: procedureId,
          title: taskData.name,
          taskId: task.id,
        }
      });
      
      console.log('Procedure created:', procedure.id);
      
      return { taskId: task.id, procedureId: procedure.id };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        taskId: result.taskId,
        procedureId: result.procedureId
      }
    });
    
  } catch (error: any) {
    console.error('Error creating procedure:', error);
    
    // Check if it's a foreign key constraint error
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        success: false, 
        message: "User account not properly set up. Please try signing out and signing back in." 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }
    
    const { procedureId, ...updateData } = await req.json();
    
    if (!procedureId) {
      return NextResponse.json({ success: false, message: "Procedure ID is required" }, { status: 400 });
    }
    
    // Update procedure
    const procedure = await prisma.procedure.update({
      where: { id: procedureId },
      data: {
        title: updateData.title,
        // Add other fields as needed
      }
    });
    
    return NextResponse.json({
      success: true,
      data: procedure
    });
    
  } catch (error: any) {
    console.error('Error updating procedure:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owned = searchParams.get('owned') === 'true';
    
    console.log(`Fetching ${owned ? 'owned' : 'all'} procedures`);
    
    // Get the current user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // If owned=true is specified but user is not logged in, return empty
    if (owned && !userId) {
      return NextResponse.json({ procedures: [] });
    }
    
    // Build the query
    const whereClause = owned && userId ? {
      LearningTask: {
        userId: userId
      }
    } : {};
    
    // Get procedures with filter
    const procedures = await prisma.procedure.findMany({
      where: whereClause,
      orderBy: {
        id: 'desc'
      }
    });
    
    console.log(`Found ${procedures.length} total procedures`);
    
    // Filter out procedures without simulation settings
    const proceduresWithSettings = procedures.filter(p => p.simulationSettings !== null);
    console.log(`Found ${proceduresWithSettings.length} procedures with non-null settings`);
    
    // Get the learning tasks for these procedures
    const taskIds = proceduresWithSettings.map(p => p.taskId);
    const learningTasks = await prisma.learningTask.findMany({
      where: {
        id: {
          in: taskIds
        }
      }
    });
    
    console.log(`Found ${learningTasks.length} learning tasks`);
    
    // Map learning task data to procedures
    const formattedProcedures = proceduresWithSettings.map(procedure => {
      const task = learningTasks.find(t => t.id === procedure.taskId);
      return {
        id: procedure.id,
        title: procedure.title,
        taskId: procedure.taskId,
        settings: procedure.simulationSettings,
        presenter: task?.presenter || 'Unknown',
        date: task?.date || new Date(),
        isOwned: task?.userId === userId
      };
    });
    
    console.log(`Returning ${formattedProcedures.length} formatted procedures`);
    
    return NextResponse.json({
      procedures: formattedProcedures
    });
  } catch (error) {
    console.error('Error fetching procedures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch procedures' },
      { status: 500 }
    );
  }
} 