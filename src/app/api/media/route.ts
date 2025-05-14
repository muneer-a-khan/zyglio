import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    // Fetch all media items for the authenticated user
    const mediaItems = await prisma.mediaItem.findMany({
      where: {
        task: {
          userId: session.user.id
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Generate signed URLs for each media item
    const mediaItemsWithSignedUrls = await Promise.all(
      mediaItems.map(async (item) => {
        let signedUrl = item.url;
        
        // If the URL is a Supabase storage URL, get a signed URL
        if (item.url.includes('storage.googleapis.com') || item.url.includes(supabaseUrl)) {
          try {
            // Extract the path from the URL
            const urlParts = item.url.split('/');
            const bucket = urlParts[urlParts.length - 2];
            const filePath = urlParts[urlParts.length - 1];
            
            // Get a signed URL that expires in 1 hour
            const { data } = await supabase
              .storage
              .from(bucket)
              .createSignedUrl(filePath, 3600);
            
            if (data?.signedUrl) {
              signedUrl = data.signedUrl;
            }
          } catch (error) {
            console.error('Error generating signed URL:', error);
            // Fall back to the original URL
          }
        }
        
        return {
          id: item.id,
          type: item.type,
          caption: item.caption || undefined,
          url: signedUrl,
          filePath: item.filePath || undefined,
          createdAt: item.createdAt
        };
      })
    );

    return NextResponse.json({
      success: true,
      mediaItems: mediaItemsWithSignedUrls
    });
    
  } catch (error: any) {
    console.error('Error fetching media items:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred while fetching media items" 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

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
        // Extract the path from the URL
        const urlParts = mediaItem.url.split('/');
        const bucket = urlParts[urlParts.length - 2];
        const filePath = urlParts[urlParts.length - 1];
        
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