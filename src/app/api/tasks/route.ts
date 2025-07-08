import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for creating learning tasks
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  estimatedTime: z.number().min(1).max(480).optional(), // 1-480 minutes
  category: z.string().optional(),
  industry: z.string().optional(),
  tags: z.array(z.string()).optional()
});

/**
 * GET /api/tasks - Get all learning tasks for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }

    // Get user's learning tasks - simplified for now
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json({
        success: true,
        tasks: []
      });
    }
    
    // Return empty for now - this can be implemented later
    const tasks: any[] = [];
    
    return NextResponse.json({
      success: true,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        objectives: task.objectives,
        difficulty: task.difficulty,
        estimatedTime: task.estimatedTime,
        status: task.status,
        category: task.category,
        industry: task.industry,
        tags: task.tags,
        voiceRecording: task.voiceRecording,
        transcript: task.transcript,
        mediaUrls: task.mediaUrls,
        yamlContent: task.yamlContent,
        flowchartData: task.flowchartData,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        smartObjects: task.smartObjects,
        procedures: task.procedures
      }))
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch learning tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks - Create a new learning task
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTaskSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input data",
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get or create user
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || session.user.email
      }
    });
    
    // Create a basic task record - simplified for now
    const task = {
      id: `task_${Date.now()}`,
      title: data.title,
      description: data.description,
      objectives: data.objectives || [],
      difficulty: data.difficulty,
      estimatedTime: data.estimatedTime,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        objectives: task.objectives,
        difficulty: task.difficulty,
        estimatedTime: task.estimatedTime,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create learning task" },
      { status: 500 }
    );
  }
} 