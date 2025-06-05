import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { taskId, mediaItems } = await req.json();
    
    if (!taskId || !mediaItems) {
      return NextResponse.json({ 
        success: false, 
        message: "Task ID and media items are required" 
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
    
    // Use Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing media items for this task
      await tx.mediaItem.deleteMany({
        where: { taskId }
      });

      // Create new media items
      for (const item of mediaItems) {
        await tx.mediaItem.create({
          data: {
            id: item.id,
            taskId,
            type: item.type as any, // Convert to MediaType enum
            caption: item.caption || null,
            url: item.url,
            relevance: null,
          }
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Media items saved successfully"
    });
    
  } catch (error: any) {
    console.error('Error saving media items:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 