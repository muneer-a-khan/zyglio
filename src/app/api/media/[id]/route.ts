import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Media item ID is required" 
      }, { status: 400 });
    }

    // Check if the media item exists and belongs to the user
    const mediaItem = await prisma.mediaItem.findFirst({
      where: {
        id,
        task: {
          userId: session.user.id
        }
      }
    });

    if (!mediaItem) {
      return NextResponse.json({ 
        success: false, 
        message: "Media item not found or access denied" 
      }, { status: 404 });
    }

    // Delete from Supabase storage if URL is from Supabase
    if (mediaItem.url.includes('storage.googleapis.com') || mediaItem.url.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || '')) {
      try {
        // Extract path parts from the URL
        const urlParts = mediaItem.url.split('/');
        const bucket = 'user-uploads'; // Use the correct bucket name per RLS policy
        
        // Extract the file name/path - could be images/filename.jpg, videos/filename.mp4, etc.
        let fileName = urlParts[urlParts.length - 1];
        let folderName = urlParts.length > 1 ? urlParts[urlParts.length - 2] : '';
        
        // Ensure the filename includes the user ID for security
        if (!fileName.startsWith(`${session.user.id}_`)) {
          fileName = `${session.user.id}_${fileName}`;
        }
        
        // Construct the file path based on folder structure
        const filePath = folderName ? `${folderName}/${fileName}` : fileName;
        
        // Delete the file from Supabase storage
        await supabase.storage.from(bucket).remove([filePath]);
      } catch (error) {
        console.error('Error deleting file from storage:', error);
        // Continue with deleting the database record even if storage deletion fails
      }
    }

    // Delete the media item from the database
    await prisma.mediaItem.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Media item deleted successfully"
    });
    
  } catch (error: any) {
    console.error('Error deleting media item:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred while deleting the media item" 
    }, { status: 500 });
  }
} 