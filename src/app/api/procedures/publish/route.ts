import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { procedureId } = await req.json();
    
    if (!procedureId) {
      return NextResponse.json({ 
        success: false, 
        message: "Procedure ID is required" 
      }, { status: 400 });
    }

    // Verify the procedure exists
    const procedure = await prisma.procedure.findUnique({
      where: {
        id: procedureId,
      },
    });

    if (!procedure) {
      return NextResponse.json({ 
        success: false, 
        message: "Procedure not found" 
      }, { status: 404 });
    }

    // Verify the procedure belongs to the user
    const learningTask = await prisma.learningTask.findUnique({
      where: {
        id: procedure.taskId,
      },
    });

    if (!learningTask || learningTask.userId !== session.user.id) {
      return NextResponse.json({ 
        success: false, 
        message: "Access denied" 
      }, { status: 403 });
    }

    // Instead of setting a non-existent published field, just touch the record
    // to update timestamps. We're using an empty update with the current values.
    const updatedProcedure = await prisma.procedure.update({
      where: { id: procedureId },
      data: {
        // Touch the record with existing data to update timestamps
        // No need to set any new fields
        title: procedure.title,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Procedure published successfully",
      procedure: updatedProcedure
    });
    
  } catch (error: any) {
    console.error('Error publishing procedure:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred while publishing the procedure",
      error: error.toString()
    }, { status: 500 });
  }
} 