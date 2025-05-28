import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { taskId, transcript, audioUrl = "" } = await req.json();
    
    if (!taskId || !transcript) {
      return NextResponse.json({ 
        success: false, 
        message: "Task ID and transcript are required" 
      }, { status: 400 });
    }
    
    // Verify the user has access to this task
    const task = await prisma.learningTask.findFirst({
      where: {
        id: taskId,
        userId: session.user.id
      }
    });
    
    if (!task) {
      return NextResponse.json({ 
        success: false, 
        message: "Task not found or access denied" 
      }, { status: 404 });
    }
    
    // Find existing dictation for this task or create a new one
    const existingDictation = await prisma.dictation.findFirst({
      where: { taskId }
    });
    
    let dictation;
    if (existingDictation) {
      dictation = await prisma.dictation.update({
        where: { id: existingDictation.id },
        data: { 
          transcript,
          audioUrl: audioUrl || existingDictation.audioUrl
        }
      });
    } else {
      dictation = await prisma.dictation.create({
        data: {
          id: uuidv4(),
          taskId,
          transcript,
          audioUrl: audioUrl || "",
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: dictation
    });
    
  } catch (error: any) {
    console.error('Error saving transcript:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 