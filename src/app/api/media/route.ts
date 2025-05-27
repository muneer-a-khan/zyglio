import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

    // Primarily fetch directly from Supabase storage
    let allBucketFiles: any[] = [];
    
    // First check if the bucket exists
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
      
    if (bucketError) {
      return NextResponse.json({ 
        success: false, 
        message: "Error listing buckets: " + bucketError.message 
      }, { status: 500 });
    }
    
    // Verify user-uploads bucket exists
    const userUploadsBucket = buckets.find(b => b.name === 'user-uploads');
    if (!userUploadsBucket) {
      return NextResponse.json({ 
        success: false, 
        message: "user-uploads bucket not found" 
      }, { status: 404 });
    }
    
    // List all files from main bucket
    const { data: storageFiles, error } = await supabase
      .storage
      .from('user-uploads')
      .list();

    if (!error && storageFiles) {
      allBucketFiles = storageFiles;
    }
    
    // List files from subdirectories too (images, videos, etc.)
    const subdirectories = ['images', 'videos', 'audios', 'pdfs'];
    
    for (const dir of subdirectories) {
      const { data: dirFiles, error: dirError } = await supabase
        .storage
        .from('user-uploads')
        .list(dir);
        
      if (!dirError && dirFiles && dirFiles.length > 0) {
        // Add directory prefix to file names
        const filesWithPath = dirFiles.map(file => ({
          ...file,
          name: `${dir}/${file.name}`
        }));
        allBucketFiles = [...allBucketFiles, ...filesWithPath];
      }
    }
    
    // Try multiple user ID formats - sometimes the ID formatting can be inconsistent
    const possibleUserIds = [
      session.user.id,
      session.user.id.replace(/-/g, ''),
      // Add any other possible formats your system might use
    ];
    
    // Filter files to include those belonging to this user with any ID format
    const userFiles = allBucketFiles.filter(file => {
      // Check if file name contains any of the possible user IDs
      return possibleUserIds.some(id => file.name.includes(id));
    });
    
    // Also fetch from database as backup
    const userTasks = await prisma.learningTask.findMany({
      where: {
        userId: session.user.id
      },
      select: { id: true }
    });
    
    const userTaskIds = userTasks.map(task => task.id);
    
    const dbMediaItems = await prisma.mediaItem.findMany({
      where: {
        taskId: {
          in: userTaskIds
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Generate media items from storage files
    const storageMediaItems = await Promise.all(
      userFiles.map(async (file) => {
        // Check if this file is already in our database items
        const existingItem = dbMediaItems.find(item => 
          item.url.includes(file.name)
        );
        
        if (existingItem) {
          // If in database, use that record but refresh URL
          const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
          const { data, error: signedUrlError } = await supabase
            .storage
            .from('user-uploads')
            .createSignedUrl(file.name, TEN_YEARS_IN_SECONDS);
            
          return {
            ...existingItem,
            url: data?.signedUrl || existingItem.url
          };
        }

        // Determine media type from file name
        let type = 'IMAGE';
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (['mp4', 'webm', 'mov'].includes(extension || '')) type = 'VIDEO';
        else if (['mp3', 'wav', 'ogg'].includes(extension || '')) type = 'AUDIO';
        else if (['pdf'].includes(extension || '')) type = 'PDF';

        // Generate signed URL with 10-year expiry
        const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
        const { data, error: signedUrlError } = await supabase
          .storage
          .from('user-uploads')
          .createSignedUrl(file.name, TEN_YEARS_IN_SECONDS);

        // Create a new clean file name for display (remove user ID prefix)
        const displayName = file.name.includes('_') 
          ? file.name.split('_').slice(1).join('_') 
          : file.name;

        const mediaItem = {
          id: `storage-${file.name}`,
          type,
          caption: displayName,
          url: data?.signedUrl || '',
          filePath: file.name,
          createdAt: file.created_at || new Date(),
          presenter: ''
        };
        
        return mediaItem;
      })
    );
    
    // Combine all media items, prioritizing storage items
    const allMediaItems = storageMediaItems.filter(Boolean);

    return NextResponse.json({
      success: true,
      mediaItems: allMediaItems
    });
    
  } catch (error: any) {
    console.error('Error fetching media items:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred while fetching media items",
      stack: error.stack 
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
        id
      }
    });

    if (!mediaItem) {
      return NextResponse.json({ 
        success: false, 
        message: "Media item not found" 
      }, { status: 404 });
    }

    // Check user ownership by verifying the associated task
    const task = await prisma.learningTask.findFirst({
      where: {
        id: mediaItem.taskId,
        userId: session.user.id
      }
    });

    if (!task) {
      return NextResponse.json({ 
        success: false, 
        message: "Access denied" 
      }, { status: 403 });
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

// Helper function to get presenter for a task
async function getPresenterForTask(taskId: string): Promise<string | undefined> {
  try {
    const task = await prisma.learningTask.findUnique({
      where: { id: taskId }
    });
    return task?.presenter || undefined;
  } catch (error) {
    console.error('Error fetching presenter for task:', error);
    return undefined;
  }
} 