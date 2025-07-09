import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import yaml from 'js-yaml';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { taskId, mermaid } = await req.json();
    
    console.log('Flowchart API: Received request to save flowchart for taskId:', taskId);
    console.log('Flowchart API: Content length:', mermaid?.length || 0);
    console.log('Flowchart API: Content preview:', mermaid?.substring(0, 200) + '...' || 'No content');
    
    if (!taskId || !mermaid) {
      return NextResponse.json({ 
        success: false, 
        message: "Task ID and flowchart content are required" 
      }, { status: 400 });
    }
    
    // Validate that the content is valid YAML before saving
    try {
      yaml.load(mermaid);
      console.log('Flowchart API: Content is valid YAML');
    } catch (yamlError) {
      console.error('Flowchart API: Content is not valid YAML:', yamlError);
      return NextResponse.json({ 
        success: false, 
        message: `Invalid YAML content: ${yamlError instanceof Error ? yamlError.message : 'Unknown error'}` 
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
    
    // Find existing flowchart for this task or create a new one
    const existingFlowchart = await prisma.flowchart.findFirst({
      where: { taskId }
    });
    
    let flowchart;
    if (existingFlowchart) {
      console.log('Flowchart API: Updating existing flowchart');
      flowchart = await prisma.flowchart.update({
        where: { id: existingFlowchart.id },
        data: { mermaid }
      });
    } else {
      console.log('Flowchart API: Creating new flowchart');
      flowchart = await prisma.flowchart.create({
        data: {
          id: uuidv4(),
          taskId,
          mermaid
        }
      });
    }
    
    console.log('Flowchart API: Successfully saved flowchart with ID:', flowchart.id);
    
    return NextResponse.json({
      success: true,
      data: flowchart
    });
    
  } catch (error: any) {
    console.error('Error saving flowchart:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 