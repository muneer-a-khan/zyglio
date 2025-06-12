import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Validation schema for creating simulation sessions
const createSessionSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
  totalSteps: z.number().min(1, "Total steps must be at least 1"),
  objectStates: z.record(z.any()).default({})
});

// Validation schema for updating simulation sessions
const updateSessionSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "FAILED", "ABANDONED"]).optional(),
  score: z.number().optional(),
  completedSteps: z.number().optional(),
  timeSpent: z.number().optional(),
  currentStepId: z.string().optional(),
  objectStates: z.record(z.any()).optional(),
  stepProgress: z.record(z.any()).optional()
});

/**
 * GET /api/simulation/sessions - Get simulation sessions for the user
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

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get simulation sessions for the user
    const sessions = await prisma.simulationSession.findMany({
      where: { userId: user.id },
      orderBy: { startTime: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        scenarioId: session.scenarioId,
        userId: session.userId,
        status: session.status,
        score: session.score,
        completedSteps: session.completedSteps,
        totalSteps: session.totalSteps,
        timeSpent: session.timeSpent,
        currentStepId: session.currentStepId,
        objectStates: session.objectStates,
        stepProgress: session.stepProgress,
        startTime: session.startTime,
        endTime: session.endTime
      }))
    });
  } catch (error) {
    console.error("Error fetching simulation sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch simulation sessions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/simulation/sessions - Create a new simulation session
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
    const validationResult = createSessionSchema.safeParse(body);
    
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

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create simulation session
    const simulationSession = await prisma.simulationSession.create({
      data: {
        scenarioId: data.scenarioId,
        userId: user.id,
        status: "ACTIVE",
        totalSteps: data.totalSteps,
        completedSteps: 0,
        timeSpent: 0,
        objectStates: data.objectStates,
        stepProgress: {}
      }
    });

    return NextResponse.json({
      success: true,
      session: {
        id: simulationSession.id,
        scenarioId: simulationSession.scenarioId,
        userId: simulationSession.userId,
        status: simulationSession.status,
        score: simulationSession.score,
        completedSteps: simulationSession.completedSteps,
        totalSteps: simulationSession.totalSteps,
        timeSpent: simulationSession.timeSpent,
        currentStepId: simulationSession.currentStepId,
        objectStates: simulationSession.objectStates,
        stepProgress: simulationSession.stepProgress,
        startTime: simulationSession.startTime,
        endTime: simulationSession.endTime
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating simulation session:", error);
    return NextResponse.json(
      { error: "Failed to create simulation session" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/simulation/sessions - Update a simulation session
 */
export async function PUT(request: NextRequest) {
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
    const { sessionId, ...updateData } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const validationResult = updateSessionSchema.safeParse(updateData);
    
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

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update simulation session
    const updatedSession = await prisma.simulationSession.update({
      where: { 
        id: sessionId,
        userId: user.id // Ensure user owns the session
      },
      data: {
        ...data,
        ...(data.status === "COMPLETED" && { endTime: new Date() })
      }
    });

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        scenarioId: updatedSession.scenarioId,
        userId: updatedSession.userId,
        status: updatedSession.status,
        score: updatedSession.score,
        completedSteps: updatedSession.completedSteps,
        totalSteps: updatedSession.totalSteps,
        timeSpent: updatedSession.timeSpent,
        currentStepId: updatedSession.currentStepId,
        objectStates: updatedSession.objectStates,
        stepProgress: updatedSession.stepProgress,
        startTime: updatedSession.startTime,
        endTime: updatedSession.endTime
      }
    });
  } catch (error) {
    console.error("Error updating simulation session:", error);
    return NextResponse.json(
      { error: "Failed to update simulation session" },
      { status: 500 }
    );
  }
} 