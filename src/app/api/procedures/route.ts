import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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

    // Get all procedures
    const procedureData = await prisma.procedure.findMany({
      orderBy: { id: 'desc' },
      include: {
        task: true
      }
    });

    // Format procedures
    const procedures = procedureData.map(procedure => ({
      id: procedure.id,
      title: procedure.title,
      description: procedure.title, // Assuming no separate description field
      presenter: procedure.task?.presenter || '',
      affiliation: procedure.task?.affiliation || '',
      kpiTech: procedure.task?.kpiTech ? [procedure.task.kpiTech] : [],
      kpiConcept: procedure.task?.kpiConcept ? [procedure.task.kpiConcept] : [],
      date: procedure.task?.date?.toISOString() || new Date().toISOString(),
      steps: [],
      mediaItems: []
    }));

    return NextResponse.json({
      success: true,
      procedures
    });
  } catch (error) {
    console.error("Error fetching procedures:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch procedures" },
      { status: 500 }
    );
  }
} 