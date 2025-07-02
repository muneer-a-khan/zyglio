import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { databaseService } from "@/lib/database";
import { getDeepSeekApi } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated" 
      }, { status: 401 });
    }

    const { originalProcedureId, newTitle, context, additionalDescription } = await req.json();
    
    if (!originalProcedureId || !newTitle || !context) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: originalProcedureId, newTitle, and context" 
      }, { status: 400 });
    }

    // Get the original procedure with all its data
    const originalProcedure = await prisma.procedure.findUnique({
      where: { id: originalProcedureId },
      include: {
        LearningTask: true,
        ProcedureStep: {
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!originalProcedure) {
      return NextResponse.json({ 
        success: false, 
        error: "Original procedure not found" 
      }, { status: 404 });
    }

    // Check if the user has access to the original procedure
    if (originalProcedure.LearningTask?.userId !== session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Access denied. You can only clone procedures you created." 
      }, { status: 403 });
    }

    // Prepare original procedure content for AI analysis
    const originalContent = {
      title: originalProcedure.title,
      description: originalProcedure.LearningTask?.title || originalProcedure.title,
      presenter: originalProcedure.LearningTask?.presenter || '',
      affiliation: originalProcedure.LearningTask?.affiliation || '',
      kpiTech: originalProcedure.LearningTask?.kpiTech ? 
        originalProcedure.LearningTask.kpiTech.split(',').map(s => s.trim()).filter(Boolean) : [],
      kpiConcept: originalProcedure.LearningTask?.kpiConcept ? 
        originalProcedure.LearningTask.kpiConcept.split(',').map(s => s.trim()).filter(Boolean) : [],
      steps: originalProcedure.ProcedureStep.map(step => ({
        index: step.index,
        content: step.content
      }))
    };

    // Use AI to adapt the procedure based on the context
    const adaptedContent = await adaptProcedureWithAI(originalContent, context, newTitle, additionalDescription);

    // Get or create user
    const user = await databaseService.getOrCreateUser(session.user.email as string, session.user.name || undefined);
    
    // Generate UUIDs for the new task and procedure
    const newTaskId = uuidv4();
    const newProcedureId = uuidv4();
    
    // Create the new procedure and task in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the learning task
      const newTask = await tx.learningTask.create({
        data: {
          id: newTaskId,
          title: adaptedContent.title,
          kpiTech: adaptedContent.kpiTech.join(', ') || null,
          kpiConcept: adaptedContent.kpiConcept.join(', ') || null,
          presenter: adaptedContent.presenter || session.user.name || 'Unknown',
          affiliation: adaptedContent.affiliation || '',
          date: new Date(),
          userId: user.id,
        }
      });
      
      // Create the procedure
      const newProcedure = await tx.procedure.create({
        data: {
          id: newProcedureId,
          title: adaptedContent.title,
          taskId: newTask.id,
        }
      });
      
      // Create the procedure steps
      if (adaptedContent.steps.length > 0) {
        await tx.procedureStep.createMany({
          data: adaptedContent.steps.map((step: { content: string }, index: number) => ({
            id: uuidv4(),
            index: index,
            content: step.content,
            procedureId: newProcedure.id
          }))
        });
      }
      
      return { newTaskId: newTask.id, newProcedureId: newProcedure.id };
    });
    
    return NextResponse.json({
      success: true,
      message: "Procedure cloned successfully",
      newProcedureId: result.newProcedureId,
      newTaskId: result.newTaskId
    });
    
  } catch (error: any) {
    console.error('Error cloning procedure:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || "An error occurred while cloning the procedure" 
    }, { status: 500 });
  }
}

async function adaptProcedureWithAI(
  originalContent: any, 
  context: string, 
  newTitle: string, 
  additionalDescription?: string
) {
  const deepseekApi = getDeepSeekApi();
  
  const systemPrompt = `You are an expert procedure adaptation specialist. Your task is to analyze an existing procedure and adapt it based on new context provided by the user.

You must maintain the educational value and logical flow while adapting the content to the new perspective or requirements.

Key principles:
1. Preserve the core objective but adapt the perspective
2. Maintain logical step progression
3. Adapt technical details to the new context
4. Keep the same level of detail and specificity
5. Ensure all steps are actionable for the new context`;

  const userPrompt = `
ORIGINAL PROCEDURE:
Title: ${originalContent.title}
Description: ${originalContent.description}
Presenter: ${originalContent.presenter}
Affiliation: ${originalContent.affiliation}

Technical Skills: ${originalContent.kpiTech.join(', ')}
Conceptual Skills: ${originalContent.kpiConcept.join(', ')}

ORIGINAL STEPS:
${originalContent.steps.map((step: any, index: number) => 
  `${index + 1}. ${step.content}`
).join('\n')}

USER'S ADAPTATION CONTEXT:
${context}

NEW TITLE: ${newTitle}

${additionalDescription ? `ADDITIONAL REQUIREMENTS:\n${additionalDescription}\n` : ''}

TASK: Adapt this procedure based on the user's context. Create a complete new procedure that:
1. Follows the same logical flow as the original
2. Adapts all steps to the new perspective/context
3. Updates technical and conceptual skills as appropriate
4. Maintains the same level of detail and specificity
5. Ensures all content is relevant to the new context

Format your response as JSON with this structure:
{
  "title": "Adapted procedure title",
  "description": "Brief description of the adapted procedure",
  "presenter": "Appropriate presenter for the new context",
  "affiliation": "Relevant affiliation",
  "kpiTech": ["Technical skill 1", "Technical skill 2"],
  "kpiConcept": ["Conceptual skill 1", "Conceptual skill 2"],
  "steps": [
    {
      "content": "Adapted step content that reflects the new context"
    }
  ]
}

Ensure the adaptation is meaningful and specifically tailored to the user's context while maintaining educational value.`;

  try {
    const response = await deepseekApi.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error('Empty response from AI');
    }

    const adaptedContent = JSON.parse(responseContent);
    
    // Validate the response structure
    if (!adaptedContent.title || !adaptedContent.steps || !Array.isArray(adaptedContent.steps)) {
      throw new Error('Invalid AI response structure');
    }

    // Ensure we have at least some steps
    if (adaptedContent.steps.length === 0) {
      throw new Error('AI generated no steps for the adapted procedure');
    }

    // Fill in defaults if missing
    adaptedContent.description = adaptedContent.description || `Adapted version of ${originalContent.title}`;
    adaptedContent.presenter = adaptedContent.presenter || originalContent.presenter || 'Unknown';
    adaptedContent.affiliation = adaptedContent.affiliation || originalContent.affiliation || '';
    adaptedContent.kpiTech = adaptedContent.kpiTech || [];
    adaptedContent.kpiConcept = adaptedContent.kpiConcept || [];

    return adaptedContent;
  } catch (error) {
    console.error('Error in AI adaptation:', error);
    
    // Fallback: create a basic adaptation
    return {
      title: newTitle,
      description: `Adapted version of ${originalContent.title} - ${context}`,
      presenter: originalContent.presenter || 'Unknown',
      affiliation: originalContent.affiliation || '',
      kpiTech: originalContent.kpiTech || [],
      kpiConcept: originalContent.kpiConcept || [],
      steps: originalContent.steps.map((step: any) => ({
        content: `[Adapted for ${context}] ${step.content}`
      }))
    };
  }
} 