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
    
    console.log(`Uploading to bucket: user-uploads, folder: ${folder}, file: ${fileName}`);
    
    // Create a Supabase client with the service role key to bypass RLS
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
    
    // Upload to Supabase Storage with admin privileges
    const { data, error } = await supabaseAdmin.storage
      .from('user-uploads')
      .upload(`${folder}/${session.user.id}_${fileName}`, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json({ 
        success: false, 
        message: error.message || "Failed to upload file" 
      }, { status: 500 });
    }
    
    // For private buckets, we need to create a signed URL (with expiry time)
    // You can adjust the expiresIn value as needed (in seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(`${folder}/${session.user.id}_${fileName}`, 60 * 60 * 24 * 365 * 10); // 10 years expiry
    
    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to generate access URL for file' 
      }, { status: 500 });
    }
    
    const fileUrl = signedUrlData.signedUrl;
    
    // Store the file path in the database so we can generate new signed URLs later if needed
    const filePath = `${folder}/${session.user.id}_${fileName}`;
    
    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        filePath: filePath, // Store this in your database along with the media item
        fileName,
        contentType: file.type,
        folder
      }
    });
    
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 