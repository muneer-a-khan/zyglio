import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiService } from "@/lib/ai-service";
import { z } from "zod";

// Validation schemas for different enhancement types
const enhanceScenarioSchema = z.object({
  type: z.literal("scenario"),
  objects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(["Ingredient", "Tool", "Equipment", "Person", "Location"]),
    states: z.array(z.string()),
    behaviors: z.array(z.string()),
    signals: z.array(z.string()),
    attributes: z.record(z.any()).optional().default({})
  })),
  steps: z.array(z.object({
    id: z.string(),
    instruction: z.string(),
    requiredObjects: z.array(z.string()),
    requiredActions: z.array(z.string()).optional().default([]),
    conditions: z.array(z.string()).optional().default([]),
    feedback: z.string().optional().default(""),
    position: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 0, y: 0 }),
    stepIndex: z.number().optional().default(0),
    isCheckpoint: z.boolean().optional().default(false)
  })),
  learningObjectives: z.array(z.string()).optional()
});

const enhanceObjectSchema = z.object({
  type: z.literal("object"),
  object: z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(["Ingredient", "Tool", "Equipment", "Person", "Location"]),
    states: z.array(z.string()),
    behaviors: z.array(z.string()),
    signals: z.array(z.string()),
    attributes: z.record(z.any())
  })
});

const generateContentSchema = z.object({
  type: z.literal("content"),
  contentType: z.enum(["instruction", "feedback", "description", "explanation"]),
  context: z.string().min(1, "Context is required"),
  tone: z.enum(["formal", "casual", "instructional", "conversational"]).optional()
});

const enhancementSchema = z.discriminatedUnion("type", [
  enhanceScenarioSchema,
  enhanceObjectSchema,
  generateContentSchema
]);

/**
 * POST /api/ai/enhance - AI enhancement endpoint
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
    const validationResult = enhancementSchema.safeParse(body);
    
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

    try {
      switch (data.type) {
        case "scenario": {
          // Enhance scenario with AI
          const enhancement = await aiService.enhanceScenario(
            data.objects,
            data.steps,
            data.learningObjectives || []
          );
          
          return NextResponse.json({
            success: true,
            type: "scenario",
            enhancement
          });
        }

        case "object": {
          // Enhance object with AI
          const enhancement = await aiService.enhanceObject(data.object);
          
          return NextResponse.json({
            success: true,
            type: "object",
            enhancement
          });
        }

        case "content": {
          // Generate content with AI
          const content = await aiService.generateContent(
            data.contentType,
            data.context,
            data.tone || "instructional"
          );
          
          return NextResponse.json({
            success: true,
            type: "content",
            content
          });
        }

        default:
          return NextResponse.json(
            { error: "Invalid enhancement type" },
            { status: 400 }
          );
      }
    } catch (aiError) {
      console.error("AI enhancement error:", aiError);
      return NextResponse.json(
        { 
          error: "AI enhancement failed",
          message: aiError instanceof Error ? aiError.message : "Unknown AI error"
        },
        { status: 503 } // Service unavailable
      );
    }
  } catch (error) {
    console.error("Error in AI enhancement endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/enhance - Get AI service status
 */
export async function GET() {
  try {
    // Basic health check for AI services
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    
    return NextResponse.json({
      success: true,
      services: {
        openai: hasOpenAI ? "configured" : "missing",
        deepseek: hasDeepSeek ? "configured" : "missing",
        elevenlabs: hasElevenLabs ? "configured" : "missing"
      },
      ready: hasOpenAI && hasDeepSeek && hasElevenLabs
    });
  } catch (error) {
    console.error("Error checking AI service status:", error);
    return NextResponse.json(
      { error: "Failed to check AI service status" },
      { status: 500 }
    );
  }
} 