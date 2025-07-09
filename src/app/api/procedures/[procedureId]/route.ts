import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Corrected path
import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ procedureId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { procedureId } = await context.params;
    
    if (!procedureId) {
      return NextResponse.json(
        { success: false, message: "Procedure ID is required" },
        { status: 400 }
      );
    }

    // Get procedure data
    const procedureData = await prisma.procedure.findUnique({
      where: { id: procedureId }
    });

    if (!procedureData) {
      return NextResponse.json(
        { success: false, message: "Procedure not found" },
        { status: 404 }
      );
    }

    // Get procedure steps
    const stepsData = await prisma.procedureStep.findMany({
      where: { procedureId: procedureId },
      orderBy: { index: 'asc' }
    });

    // Get media items associated with this procedure's task
    const mediaData = await prisma.mediaItem.findMany({
      where: { taskId: procedureData.taskId }
    });

    // Refresh signed URLs for media items if needed
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Format and refresh media items
    const mediaItems = await Promise.all(
      mediaData.map(async (media) => {
        // Extract file path from URL if available
        let filePath = '';
        
        // Try to extract from storage URL structure
        if (media.url && media.url.includes('user-uploads')) {
          try {
            const urlParts = media.url.split('?')[0].split('/');
            const bucketIndex = urlParts.findIndex(part => part === 'user-uploads');
            if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
              filePath = urlParts.slice(bucketIndex + 1).join('/');
            }
          } catch (err) {
            console.error('Error extracting file path from URL:', err);
          }
        }

        // Try to refresh URL if we have a file path
        if (filePath) {
          try {
            // Create a new signed URL with 7-day expiry
            const { data, error } = await supabaseAdmin.storage
              .from('user-uploads')
              .createSignedUrl(filePath, 60 * 60 * 24 * 7);

            if (data && !error) {
              return {
                id: media.id,
                type: media.type.toString(),
                caption: media.caption || undefined,
                url: data.signedUrl,
                filePath: filePath
              };
            }
          } catch (error) {
            console.error(`Error refreshing signed URL for ${filePath}:`, error);
          }
        }
        
        // Return original if refresh failed or wasn't needed
        return {
          id: media.id,
          type: media.type.toString(),
          caption: media.caption || undefined,
          url: media.url,
          filePath: filePath || undefined
        };
      })
    );

    // Format steps
    const steps = stepsData.map(step => ({
      id: step.id,
      content: step.content,
      comments: step.notes ? [step.notes] : [],
      order: step.index
    }));

    // Get the learning task associated with this procedure
    const task = await prisma.learningTask.findFirst({
      where: { id: procedureData.taskId }
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Procedure task not found" },
        { status: 404 }
      );
    }

    // Verify that the current user owns this procedure
    if (task.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Access denied. You can only view procedures you created." },
        { status: 403 }
      );
    }

    // Get YAML content from YamlOutput table
    const yamlOutput = await prisma.yamlOutput.findFirst({
      where: { taskId: procedureData.taskId }
    });

    console.log('Procedure API: Retrieved YAML data:', yamlOutput ? 'Found' : 'Not found');
    if (yamlOutput) {
      console.log('Procedure API: YAML content length:', yamlOutput.content?.length || 0);
      console.log('Procedure API: YAML content preview:', yamlOutput.content?.substring(0, 200) + '...' || 'No content');
    }

    // Get flowchart code from Flowchart table
    const flowchartData = await prisma.flowchart.findFirst({
      where: { taskId: procedureData.taskId }
    });

    console.log('Procedure API: Retrieved flowchart data:', flowchartData ? 'Found' : 'Not found');
    if (flowchartData) {
      console.log('Procedure API: Flowchart content length:', flowchartData.mermaid?.length || 0);
      console.log('Procedure API: Flowchart content preview:', flowchartData.mermaid?.substring(0, 200) + '...' || 'No content');
    }

    // Get transcript from Dictation table (if available)
    const dictation = await prisma.dictation.findFirst({
      where: { taskId: procedureData.taskId }
    });

    // Format procedure with fresh data
    const procedure = {
      id: procedureData.id,
      title: procedureData.title,
      description: procedureData.title, // Using title as description for now
      taskId: procedureData.taskId, // Include taskId for YAML saving
      presenter: task?.presenter || '',
      affiliation: task?.affiliation || '',
      kpiTech: task?.kpiTech ? [task.kpiTech] : [],
      kpiConcept: task?.kpiConcept ? [task.kpiConcept] : [],
      date: task?.date?.toISOString() || new Date().toISOString(),
      steps,
      mediaItems,
      transcript: dictation?.transcript || '',
      yamlContent: yamlOutput?.content || '',
      flowchartCode: flowchartData?.mermaid || ''
    };

    return NextResponse.json({
      success: true,
      procedure
    });
  } catch (error) {
    console.error("Error fetching procedure:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch procedure" },
      { status: 500 }
    );
  }
} 

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ procedureId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { procedureId } = await context.params;
    
    if (!procedureId) {
      return NextResponse.json(
        { success: false, message: "Procedure ID is required" },
        { status: 400 }
      );
    }

    // Get procedure data
    const procedureData = await prisma.procedure.findUnique({
      where: { id: procedureId }
    });

    if (!procedureData) {
      return NextResponse.json(
        { success: false, message: "Procedure not found" },
        { status: 404 }
      );
    }

    // Get the learning task to verify ownership
    const task = await prisma.learningTask.findUnique({
      where: { id: procedureData.taskId }
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Associated task not found" },
        { status: 404 }
      );
    }

    // Verify that the current user owns this procedure
    if (task.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Access denied. You can only delete procedures you created." },
        { status: 403 }
      );
    }

    // Delete procedure and associated data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete procedure steps
      await tx.procedureStep.deleteMany({
        where: { procedureId: procedureId }
      });

      // Delete training modules associated with this procedure
      await tx.trainingModule.deleteMany({
        where: { procedureId: procedureId }
      });

      // Delete certifications associated with this procedure
      await tx.certification.deleteMany({
        where: { procedureId: procedureId }
      });

      // Delete the procedure itself
      await tx.procedure.delete({
        where: { id: procedureId }
      });

      // Delete media items associated with the task
      await tx.mediaItem.deleteMany({
        where: { taskId: procedureData.taskId }
      });

      // Delete simulations associated with the task
      await tx.simulation.deleteMany({
        where: { taskId: procedureData.taskId }
      });

      // Finally, delete the learning task
      await tx.learningTask.delete({
        where: { id: procedureData.taskId }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Procedure and associated data deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting procedure:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete procedure" },
      { status: 500 }
    );
  }
} 