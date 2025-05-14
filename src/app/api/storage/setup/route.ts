import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create a Supabase admin client with the service role key
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

    // Check if the 'user-uploads' bucket exists, if not create it
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    let bucketExists = false;
    
    if (buckets) {
      bucketExists = buckets.some(bucket => bucket.name === 'user-uploads');
    }
    
    if (!bucketExists) {
      const { data, error } = await supabaseAdmin.storage.createBucket('user-uploads', {
        public: true,
        allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      });
      
      if (error) {
        return NextResponse.json({
          success: false,
          message: `Failed to create bucket: ${error.message}`
        }, { status: 500 });
      }
    }
    
    // Update bucket to be public
    const { error } = await supabaseAdmin.storage.updateBucket('user-uploads', {
      public: true
    });
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: `Failed to update bucket: ${error.message}`
      }, { status: 500 });
    }
    
    // Create folders if they don't exist
    const folders = ['images', 'videos', 'audios', 'pdfs'];
    
    for (const folder of folders) {
      // Check if folder exists first
      const { data: files } = await supabaseAdmin.storage.from('user-uploads').list(folder);
      
      if (!files || files.length === 0) {
        // Create an empty file to create the folder (since Supabase doesn't have a create folder API)
        const emptyFile = new Uint8Array(0);
        await supabaseAdmin.storage.from('user-uploads').upload(`${folder}/.gitkeep`, emptyFile);
      }
    }
    
    // Get bucket URL for verification
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('user-uploads')
      .getPublicUrl('images/.gitkeep');
    
    return NextResponse.json({
      success: true,
      message: 'Storage bucket setup complete',
      bucketUrl: publicUrl.split('/images/')[0]
    });
    
  } catch (error: any) {
    console.error('Error setting up storage:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'An unknown error occurred'
    }, { status: 500 });
  }
} 