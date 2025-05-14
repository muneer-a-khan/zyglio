import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { procedureId, steps } = await req.json();
    
    if (!procedureId || !steps) {
      return NextResponse.json({ success: false, message: "Procedure ID and steps are required" }, { status: 400 });
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
      return NextResponse.json({ success: false, message: "Procedure not found or access denied" }, { status: 404 });
    }
    
    // Use Prisma transaction to delete existing steps and create new ones
    await prisma.$transaction(async (tx) => {
      // Delete existing steps
      await tx.procedureStep.deleteMany({
        where: { procedureId }
      });

      // Create new steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await tx.procedureStep.create({
          data: {
            id: step.id,
            procedureId,
            index: i,
            content: step.content,
            notes: step.comments?.join('\n') || null,
          }
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Steps saved successfully"
    });
    
  } catch (error: any) {
    console.error('Error saving steps:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 