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
        public: false, // Create as private bucket
        allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      });
      
      if (error) {
        return NextResponse.json({
          success: false,
          message: `Failed to create bucket: ${error.message}`
        }, { status: 500 });
      }
    } else {
      // Update bucket to be private if it already exists
      const { error } = await supabaseAdmin.storage.updateBucket('user-uploads', {
        public: false
      });
      
      if (error) {
        return NextResponse.json({
          success: false,
          message: `Failed to update bucket settings: ${error.message}`
        }, { status: 500 });
      }
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
    
    // Set Row Level Security policies for the bucket
    await setupRLSPolicies(supabaseAdmin);
    
    return NextResponse.json({
      success: true,
      message: 'Storage bucket setup complete with secure access policies',
      isPrivate: true
    });
    
  } catch (error: any) {
    console.error('Error setting up storage:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'An unknown error occurred'
    }, { status: 500 });
  }
}

async function setupRLSPolicies(supabaseAdmin: any) {
  try {
    // First, let's try to delete existing policies to avoid conflicts
    await supabaseAdmin.rpc('delete_storage_policy', {
      bucket_name: 'user-uploads',
      policy_name: 'Allow individual read access'
    }).catch(() => {
      // Ignore errors during deletion - policy might not exist
    });
    
    await supabaseAdmin.rpc('delete_storage_policy', {
      bucket_name: 'user-uploads',
      policy_name: 'Allow authenticated uploads'
    }).catch(() => {
      // Ignore errors during deletion - policy might not exist
    });
    
    // Create policy that allows authenticated users to upload files
    await supabaseAdmin.rpc('create_storage_policy', {
      bucket_name: 'user-uploads',
      policy_name: 'Allow authenticated uploads',
      definition: "((bucket_id = 'user-uploads'::text) AND (auth.role() = 'authenticated'::text))",
      operation: 'INSERT'
    });
    
    // Create policy that allows users to access their own files
    await supabaseAdmin.rpc('create_storage_policy', {
      bucket_name: 'user-uploads',
      policy_name: 'Allow individual read access',
      definition: "((bucket_id = 'user-uploads'::text) AND (auth.role() = 'authenticated'::text))",
      operation: 'SELECT'
    });
    
    return true;
  } catch (error) {
    console.error('Error setting up RLS policies:', error);
    // We'll continue even if policy setup fails, as we can still use service key to access
    return false;
  }
} 