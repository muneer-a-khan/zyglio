import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: "No file provided" 
      }, { status: 400 });
    }
    
    // Get file extension
    const fileExt = file.name.split('.').pop();
    // Generate unique filename
    const fileName = `${uuidv4()}.${fileExt}`;
    
    // Determine folder based on file type
    let folder = '';
    if (file.type.startsWith('image/')) folder = 'images';
    else if (file.type.startsWith('video/')) folder = 'videos';
    else if (file.type.startsWith('audio/')) folder = 'audios';
    else folder = 'pdfs';
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        success: false, 
        message: "Server configuration error - missing Supabase credentials" 
      }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Check if bucket exists and create it if it doesn't
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      return NextResponse.json({ 
        success: false, 
        message: "Error listing buckets: " + bucketsError.message 
      }, { status: 500 });
    }
    
    const userUploadsBucket = buckets.find(b => b.name === 'user-uploads');
    
    if (!userUploadsBucket) {
      const { data: newBucket, error: createBucketError } = await supabaseAdmin.storage.createBucket('user-uploads', {
        public: false,
        allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      });
      
      if (createBucketError) {
        return NextResponse.json({ 
          success: false, 
          message: "Failed to create storage bucket: " + createBucketError.message 
        }, { status: 500 });
      }
    }
    
    // Construct the final file path
    const filePath = `${folder}/${session.user.id}_${fileName}`;
    
    // Upload to Supabase Storage with admin privileges
    const { data, error } = await supabaseAdmin.storage
      .from('user-uploads')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: error.message || "Failed to upload file" 
      }, { status: 500 });
    }
    
    // For private buckets, we need to create a signed URL (with expiry time)
    // You can adjust the expiresIn value as needed (in seconds)
    const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(filePath, TEN_YEARS_IN_SECONDS);
    
    if (signedUrlError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to generate access URL for file' 
      }, { status: 500 });
    }
    
    const fileUrl = signedUrlData.signedUrl;
    
    // Write to the database
    try {
      const prisma = require('@/lib/prisma').default;
      
      // Create a media item in the database
      const mediaItem = await prisma.mediaItem.create({
        data: {
          id: uuidv4(),
          type: file.type.startsWith('image/') ? 'IMAGE' : 
                file.type.startsWith('video/') ? 'VIDEO' : 
                file.type.startsWith('audio/') ? 'AUDIO' : 'PDF',
          caption: file.name,
          url: fileUrl,
          filePath: filePath,
          task: {
            connect: {
              userId: session.user.id
            }
          }
        }
      });
    } catch (dbError) {
      console.error('Warning: Failed to create database record:', dbError);
      // Continue even if database fails - we'll still use the file from storage
    }
    
    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        filePath: filePath,
        fileName,
        contentType: file.type,
        folder
      }
    });
    
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred",
      stack: error.stack
    }, { status: 500 });
  }
} 