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

    const { procedureId, steps } = await req.json();
    
    if (!procedureId || !Array.isArray(steps)) {
      return NextResponse.json({ 
        success: false, 
        message: "Procedure ID and steps array are required" 
      }, { status: 400 });
    }
    
    // Verify the user has access to this procedure
    const procedure = await prisma.procedure.findFirst({
      where: {
        id: procedureId,
        task: {
          userId: session.user.id
        }
      }
    });
    
    if (!procedure) {
      return NextResponse.json({ 
        success: false, 
        message: "Procedure not found or access denied" 
      }, { status: 404 });
    }
    
    // Delete existing steps
    await prisma.procedureStep.deleteMany({
      where: { procedureId }
    });
    
    // Create new steps
    const savedSteps = await Promise.all(
      steps.map((step, index) => 
        prisma.procedureStep.create({
          data: {
            id: uuidv4(),
            index,
            content: step.content,
            notes: step.notes || null,
            conditions: step.conditions || null,
            procedureId
          }
        })
      )
    );
    
    return NextResponse.json({
      success: true,
      data: savedSteps
    });
    
  } catch (error: any) {
    console.error('Error saving procedure steps:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 