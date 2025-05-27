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
      .list('', { sortBy: { column: 'created_at', order: 'desc' } });

    if (!error && storageFiles) {
      allBucketFiles = storageFiles;
    }
    
    // List files from subdirectories too (images, videos, etc.)
    const subdirectories = ['images', 'videos', 'audios', 'pdfs'];
    
    for (const dir of subdirectories) {
      const { data: dirFiles, error: dirError } = await supabase
        .storage
        .from('user-uploads')
        .list(dir, { sortBy: { column: 'created_at', order: 'desc' } });
        
      if (!dirError && dirFiles && dirFiles.length > 0) {
        // Add directory prefix to file names
        const filesWithPath = dirFiles.map(file => ({
          ...file,
          name: `${dir}/${file.name}`,
          path: `${dir}/${file.name}`
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
    const dbMediaItems = await prisma.mediaItem.findMany({
      where: {
        taskId: {
          in: await prisma.learningTask.findMany({
            where: { userId: session.user.id },
            select: { id: true }
          }).then(tasks => tasks.map(task => task.id))
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
          
          // Use the correct path for the file (either direct or with directory)
          const filePath = file.path || file.name;
          
          const { data, error: signedUrlError } = await supabase
            .storage
            .from('user-uploads')
            .createSignedUrl(filePath, TEN_YEARS_IN_SECONDS);
            
          if (signedUrlError) {
            console.error('Error creating signed URL:', signedUrlError);
          }
            
          return {
            ...existingItem,
            url: data?.signedUrl || existingItem.url
          };
        }

        // Determine media type from file name
        let type = 'IMAGE';
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        if (['mp4', 'webm', 'mov'].includes(extension || '')) {
          type = 'VIDEO';
        } else if (['mp3', 'wav', 'ogg'].includes(extension || '')) {
          type = 'AUDIO';
        } else if (['pdf'].includes(extension || '')) {
          type = 'PDF';
        }

        // Generate signed URL with 10-year expiry
        const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
        
        // Use the correct path for the file (either direct or with directory)
        const filePath = file.path || file.name;
        
        const { data, error: signedUrlError } = await supabase
          .storage
          .from('user-uploads')
          .createSignedUrl(filePath, TEN_YEARS_IN_SECONDS);

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError, filePath);
          return null;
        }

        // Create a new clean file name for display (remove user ID prefix)
        const displayName = file.name.includes('_') 
          ? file.name.split('_').slice(1).join('_') 
          : file.name;

        const mediaItem = {
          id: `storage-${filePath}`,
          type,
          caption: displayName,
          url: data?.signedUrl || '',
          filePath: filePath,
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

    // Check if this is a storage item (not in database)
    if (id.includes('/')) {
      // This is likely a path from Supabase storage
      try {
        console.log('Deleting file from storage:', id);
        
        // Delete the file from Supabase storage
        const { data, error } = await supabase.storage.from('user-uploads').remove([id]);
        
        if (error) {
          throw new Error(`Storage deletion error: ${error.message}`);
        }
        
        return NextResponse.json({
          success: true,
          message: "Media item deleted successfully from storage"
        });
      } catch (error: any) {
        console.error('Error deleting file from storage:', error);
        return NextResponse.json({ 
          success: false, 
          message: error.message || "An error occurred while deleting from storage"
        }, { status: 500 });
      }
    }

    // Otherwise this is a database item
    // Check if the media item exists and belongs to the user
    const mediaItem = await prisma.mediaItem.findFirst({
      where: {
        id,
        taskId: {
          in: await prisma.learningTask.findMany({
            where: { userId: session.user.id },
            select: { id: true }
          }).then(tasks => tasks.map(task => task.id))
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
        // Try to extract the path from the URL
        let filePath = '';
        
        // First try to get the file path from query params
        const urlObj = new URL(mediaItem.url);
        const filePathParam = urlObj.searchParams.get('path');
        
        if (filePathParam) {
          filePath = decodeURIComponent(filePathParam);
        } else {
          // Extract from the URL pattern
          const urlParts = mediaItem.url.split('/');
          // Try to find the bucket name in URL
          const bucketIndex = urlParts.findIndex(part => 
            part === 'user-uploads' || part === 'storage'
          );
          
          if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
            filePath = urlParts.slice(bucketIndex + 1).join('/').split('?')[0];
          }
        }
        
        if (filePath) {
          console.log('Attempting to delete file from storage:', filePath);
          // Delete the file from Supabase storage
          await supabase.storage.from('user-uploads').remove([filePath]);
        }
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