import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const taskData = await req.json();
    
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
          userId: userId,
        }
      });
      
      // Then create the procedure linked to the task
      const procedure = await tx.procedure.create({
        data: {
          id: procedureId,
          title: taskData.name,
          taskId: task.id,
        }
      });
      
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("Fetching all procedures (from any user)");

    // First, fetch ALL procedures
    const procedures = await prisma.procedure.findMany({
      orderBy: { 
        id: 'desc' 
      }
    });
    
    console.log(`Found ${procedures.length} total procedures`);

    // Filter out procedures without simulationSettings separately for debugging
    const proceduresWithSettings = procedures.filter(p => p.simulationSettings !== null);
    console.log(`Found ${proceduresWithSettings.length} procedures with non-null settings`);
    
    // Get the associated learning tasks for all procedures, regardless of user
    const taskIds = procedures.map(p => p.taskId).filter(Boolean);
    
    if (taskIds.length === 0) {
      console.log("No task IDs found, returning empty list");
      return NextResponse.json({
        success: true,
        procedures: []
      });
    }
    
    const learningTasks = await prisma.learningTask.findMany({
      where: {
        id: { in: taskIds }
        // Removed userId filter to get tasks from all users
      }
    });
    
    console.log(`Found ${learningTasks.length} learning tasks`);
    
    // Create a map for quick lookups
    const taskMap = new Map();
    learningTasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    // Format all procedures with their associated tasks
    const formattedProcedures = procedures
      .filter(procedure => taskMap.has(procedure.taskId)) // Only include procedures with matching tasks
      .map(procedure => {
        const task = taskMap.get(procedure.taskId);
        
        // Split kpiTech and kpiConcept strings into arrays if they exist
        const kpiTech = task?.kpiTech ? 
          task.kpiTech.split(',').map((tag: string) => tag.trim()).filter(Boolean) : 
          [];
          
        const kpiConcept = task?.kpiConcept ? 
          task.kpiConcept.split(',').map((tag: string) => tag.trim()).filter(Boolean) : 
          [];
          
        return {
          id: procedure.id,
          title: procedure.title || task?.title || 'Untitled Procedure',
          description: procedure.title || task?.title || 'No description available', 
          presenter: task?.presenter || '',
          affiliation: task?.affiliation || '',
          kpiTech: kpiTech,
          kpiConcept: kpiConcept,
          date: task?.date?.toISOString() || new Date().toISOString(),
          steps: [],
          mediaItems: [],
          simulationSettings: procedure.simulationSettings || {}
        };
      });

    console.log(`Returning ${formattedProcedures.length} formatted procedures`);

    return NextResponse.json({
      success: true,
      procedures: formattedProcedures
    });
  } catch (error) {
    console.error("Error fetching procedures:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch procedures" },
      { status: 500 }
    );
  }
} 