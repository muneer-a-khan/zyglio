import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Validation schema for creating scenario steps
const createScenarioStepSchema = z.object({
  instruction: z.string().min(1, "Instruction is required"),
  requiredObjects: z.array(z.string()).default([]),
  requiredActions: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  feedback: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  stepIndex: z.number().min(0),
  isCheckpoint: z.boolean().default(false),
  expectedResponses: z.array(z.string()).default([]),
  voiceRecordingUrl: z.string().optional(),
  transcript: z.string().optional(),
  procedureId: z.string().optional(),
  scenarioId: z.string().optional()
});

/**
 * GET /api/tasks/[taskId]/scenarios - Get all scenario steps for a task
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

    // Get scenario steps for the task
    const scenarioSteps = await prisma.scenarioStep.findMany({
      where: {
        OR: [
          { procedureId: { in: await prisma.procedure.findMany({ where: { taskId }, select: { id: true } }).then(procs => procs.map(p => p.id)) } },
          { scenarioId: taskId } // Direct association with task
        ]
      },
      orderBy: { stepIndex: 'asc' }
    });
    
    return NextResponse.json({
      success: true,
      scenarios: scenarioSteps.map(step => ({
        id: step.id,
        instruction: step.instruction,
        requiredObjects: step.requiredObjects,
        requiredActions: step.requiredActions,
        conditions: step.conditions,
        feedback: step.feedback,
        position: step.position,
        stepIndex: step.stepIndex,
        isCheckpoint: step.isCheckpoint,
        expectedResponses: step.expectedResponses,
        voiceRecordingUrl: step.voiceRecordingUrl,
        transcript: step.transcript,
        procedureId: step.procedureId,
        scenarioId: step.scenarioId,
        createdAt: step.createdAt,
        updatedAt: step.updatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching scenario steps:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenario steps" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[taskId]/scenarios - Create a new scenario step
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
    const validationResult = createScenarioStepSchema.safeParse(body);
    
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

    // Create scenario step
    const scenarioStep = await prisma.scenarioStep.create({
      data: {
        instruction: data.instruction,
        requiredObjects: data.requiredObjects,
        requiredActions: data.requiredActions,
        conditions: data.conditions,
        feedback: data.feedback,
        position: data.position,
        stepIndex: data.stepIndex,
        isCheckpoint: data.isCheckpoint,
        expectedResponses: data.expectedResponses,
        voiceRecordingUrl: data.voiceRecordingUrl,
        transcript: data.transcript,
        procedureId: data.procedureId,
        scenarioId: data.scenarioId || taskId // Default to taskId if no scenarioId
      }
    });

    return NextResponse.json({
      success: true,
      scenario: {
        id: scenarioStep.id,
        instruction: scenarioStep.instruction,
        requiredObjects: scenarioStep.requiredObjects,
        requiredActions: scenarioStep.requiredActions,
        conditions: scenarioStep.conditions,
        feedback: scenarioStep.feedback,
        position: scenarioStep.position,
        stepIndex: scenarioStep.stepIndex,
        isCheckpoint: scenarioStep.isCheckpoint,
        expectedResponses: scenarioStep.expectedResponses,
        voiceRecordingUrl: scenarioStep.voiceRecordingUrl,
        transcript: scenarioStep.transcript,
        procedureId: scenarioStep.procedureId,
        scenarioId: scenarioStep.scenarioId,
        createdAt: scenarioStep.createdAt,
        updatedAt: scenarioStep.updatedAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating scenario step:", error);
    return NextResponse.json(
      { error: "Failed to create scenario step" },
      { status: 500 }
    );
  }
} 