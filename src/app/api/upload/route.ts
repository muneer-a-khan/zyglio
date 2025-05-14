import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
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
    // Determine bucket based on file type
    let bucket = 'media';
    if (file.type.startsWith('image/')) bucket = 'media';
    else if (file.type.startsWith('video/')) bucket = 'media';
    else if (file.type.startsWith('audio/')) bucket = 'media';
    else bucket = 'documents';
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`${session.user.id}/${fileName}`, fileBuffer, {
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
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${session.user.id}/${fileName}`);
    
    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        fileName,
        contentType: file.type
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