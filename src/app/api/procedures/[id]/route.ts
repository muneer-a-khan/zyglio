import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const procedureId = params.id;
    
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

    // Get media items
    const mediaData = await prisma.mediaItem.findMany({
      where: { procedureId: procedureId }
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
        let filePath = media.filePath || '';
        
        // Try to extract from storage URL structure if no filePath
        if (!filePath && media.url && media.url.includes('user-uploads')) {
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
      comments: step.notes ? [step.notes] : []
    }));

    // Get the learning task associated with this procedure
    const task = await prisma.learningTask.findFirst({
      where: { id: procedureData.taskId }
    });

    // Format procedure with fresh data
    const procedure = {
      id: procedureData.id,
      title: procedureData.title,
      description: procedureData.title, // Assuming no separate description field
      presenter: task?.presenter || '',
      affiliation: task?.affiliation || '',
      kpiTech: task?.kpiTech ? [task.kpiTech] : [],
      kpiConcept: task?.kpiConcept ? [task.kpiConcept] : [],
      date: task?.date?.toISOString() || new Date().toISOString(),
      steps,
      mediaItems,
      transcript: '', // Add transcript if available in your schema
      yamlContent: '', // Add YAML content if available in your schema
      flowchartCode: '' // Add flowchart code if available in your schema
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