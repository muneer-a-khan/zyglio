import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/database";
import { z } from "zod";
import { prisma } from '@/lib/prisma';

// Validation schema for creating smart objects
const createObjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  category: z.enum(["INGREDIENT", "TOOL", "EQUIPMENT", "PERSON", "LOCATION"]),
  description: z.string().optional(),
  states: z.array(z.string()).min(1, "At least one state is required"),
  behaviors: z.array(z.string()).min(1, "At least one behavior is required"),
  signals: z.array(z.string()).default([]),
  attributes: z.record(z.any()).default({}),
  currentState: z.string().optional()
});

/**
 * GET /api/tasks/[taskId]/objects - Get all smart objects for a task
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { taskId } = await context.params;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Check if the user has access to this task
    const task = await prisma.learningTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Only allow the task owner or admins to access
    if (task.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to access this task' },
        { status: 403 }
      );
    }

    // Get all objects for this task
    const objects = await prisma.simulationObject.findMany({
      where: { taskId }
    });

    return NextResponse.json({
      success: true,
      objects
    });

  } catch (error) {
    console.error('Error fetching objects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch objects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[taskId]/objects - Create a new smart object
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { taskId } = await context.params;
    const data = await request.json();
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Check if the user has access to this task
    const task = await prisma.learningTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Only allow the task owner or admins to modify
    if (task.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to modify this task' },
        { status: 403 }
      );
    }

    // Create the new object
    const newObject = await prisma.simulationObject.create({
      data: {
        ...data,
        taskId
      }
    });

    return NextResponse.json({
      success: true,
      object: newObject
    });

  } catch (error) {
    console.error('Error creating object:', error);
    return NextResponse.json(
      { error: 'Failed to create object' },
      { status: 500 }
    );
  }
} 