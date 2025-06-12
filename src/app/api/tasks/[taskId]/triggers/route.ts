import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Validation schema for creating triggers
const createTriggerSchema = z.object({
  objectId: z.string().min(1, "Object ID is required"),
  signal: z.string().min(1, "Signal is required"),
  condition: z.string().min(1, "Condition is required"),
  action: z.string().min(1, "Action is required"),
  scenarioId: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  description: z.string().optional(),
  category: z.enum(["INTERACTION", "STATE_CHANGE", "TIME_BASED", "CONDITION", "SYSTEM"]).optional()
});

/**
 * GET /api/tasks/[taskId]/triggers - Get all triggers for a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }

    const { taskId } = params;

    // Verify the user has access to this task
    const task = await prisma.learningTask.findFirst({
      where: {
        id: taskId,
        userId: session.user.id
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Get triggers for objects associated with this task
    const triggers = await prisma.trigger.findMany({
      where: {
        OR: [
          { 
            objectId: { 
              in: await prisma.smartObject.findMany({ 
                where: { taskId }, 
                select: { id: true } 
              }).then(objects => objects.map(obj => obj.id)) 
            } 
          },
          { scenarioId: taskId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      triggers: triggers.map(trigger => ({
        id: trigger.id,
        objectId: trigger.objectId,
        signal: trigger.signal,
        condition: trigger.condition,
        action: trigger.action,
        scenarioId: trigger.scenarioId,
        isActive: trigger.isActive,
        priority: trigger.priority,
        description: trigger.description,
        category: trigger.category,
        createdAt: trigger.createdAt
      }))
    });
  } catch (error) {
    console.error("Error fetching triggers:", error);
    return NextResponse.json(
      { error: "Failed to fetch triggers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[taskId]/triggers - Create a new trigger
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }

    const { taskId } = params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTriggerSchema.safeParse(body);
    
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

    // Verify the user has access to this task
    const task = await prisma.learningTask.findFirst({
      where: {
        id: taskId,
        userId: session.user.id
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Verify the object exists and belongs to the user
    const smartObject = await prisma.smartObject.findFirst({
      where: {
        id: data.objectId,
        userId: session.user.id
      }
    });

    if (!smartObject) {
      return NextResponse.json(
        { error: "Smart object not found or access denied" },
        { status: 404 }
      );
    }

    // Create trigger
    const trigger = await prisma.trigger.create({
      data: {
        objectId: data.objectId,
        signal: data.signal,
        condition: data.condition,
        action: data.action,
        scenarioId: data.scenarioId || taskId,
        isActive: data.isActive,
        priority: data.priority,
        description: data.description,
        category: data.category
      }
    });

    return NextResponse.json({
      success: true,
      trigger: {
        id: trigger.id,
        objectId: trigger.objectId,
        signal: trigger.signal,
        condition: trigger.condition,
        action: trigger.action,
        scenarioId: trigger.scenarioId,
        isActive: trigger.isActive,
        priority: trigger.priority,
        description: trigger.description,
        category: trigger.category,
        createdAt: trigger.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating trigger:", error);
    return NextResponse.json(
      { error: "Failed to create trigger" },
      { status: 500 }
    );
  }
} 