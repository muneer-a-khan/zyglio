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

    const { taskId, yamlContent } = await req.json();
    
    if (!taskId || typeof yamlContent !== 'string') {
      return NextResponse.json({ 
        success: false, 
        message: "Task ID and YAML content (string) are required" 
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
    
    // Find existing YAML output for this task or create a new one
    const existingYaml = await prisma.yamlOutput.findFirst({
      where: { taskId }
    });
    
    let savedOutput;
    if (existingYaml) {
      savedOutput = await prisma.yamlOutput.update({
        where: { id: existingYaml.id },
        data: { content: yamlContent }
      });
    } else {
      savedOutput = await prisma.yamlOutput.create({
        data: {
          id: uuidv4(),
          taskId,
          content: yamlContent
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: savedOutput
    });
    
  } catch (error: any) {
    console.error('Error saving YAML content:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 