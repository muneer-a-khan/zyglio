import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/database";
import { z } from "zod";

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

    // Get or create user
    const user = await db.getOrCreateUser(session.user.email, session.user.name);
    
    // Get smart objects for the task
    const objects = await db.getSmartObjects({
      taskId,
      userId: user.id
    });
    
    return NextResponse.json({
      success: true,
      objects: objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        category: obj.category,
        description: obj.description,
        states: obj.states,
        behaviors: obj.behaviors,
        signals: obj.signals,
        attributes: obj.attributes,
        currentState: obj.currentState,
        tags: obj.tags,
        isTemplate: obj.isTemplate,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching smart objects:", error);
    return NextResponse.json(
      { error: "Failed to fetch smart objects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[taskId]/objects - Create a new smart object
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
    const validationResult = createObjectSchema.safeParse(body);
    
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
    const user = await db.getOrCreateUser(session.user.email, session.user.name);
    
    // Create smart object
    const object = await db.createSmartObject({
      name: data.name,
      category: data.category,
      description: data.description,
      states: data.states,
      behaviors: data.behaviors,
      signals: data.signals,
      attributes: data.attributes,
      currentState: data.currentState || data.states[0], // Default to first state
      taskId,
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      object: {
        id: object.id,
        name: object.name,
        category: object.category,
        description: object.description,
        states: object.states,
        behaviors: object.behaviors,
        signals: object.signals,
        attributes: object.attributes,
        currentState: object.currentState,
        tags: object.tags,
        isTemplate: object.isTemplate,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating smart object:", error);
    return NextResponse.json(
      { error: "Failed to create smart object" },
      { status: 500 }
    );
  }
} 