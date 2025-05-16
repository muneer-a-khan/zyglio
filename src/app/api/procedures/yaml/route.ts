import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { v4 as uuidv4 } from "uuid";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { taskId, content } = await req.json();
    
    if (!taskId || !content) {
      return NextResponse.json({ 
        success: false, 
        message: "Task ID and YAML content are required" 
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
    
    let yamlOutput;
    if (existingYaml) {
      yamlOutput = await prisma.yamlOutput.update({
        where: { id: existingYaml.id },
        data: { content }
      });
    } else {
      yamlOutput = await prisma.yamlOutput.create({
        data: {
          id: uuidv4(),
          taskId,
          content
        }
      });
    }
    
    const { error } = await supabase
      .from('procedures')
      .update({ yaml_content: content })
      .eq('id', taskId);

    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      data: yamlOutput
    });
    
  } catch (error: any) {
    console.error('Error saving YAML content:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 