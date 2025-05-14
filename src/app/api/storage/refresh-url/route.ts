import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { filePath } = await req.json();
    
    if (!filePath) {
      return NextResponse.json({ 
        success: false, 
        message: "File path is required" 
      }, { status: 400 });
    }
    
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
    
    // Create a new signed URL with a 7-day expiry
    const { data, error } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days
      
    if (error) {
      console.error('Error refreshing signed URL:', error);
      return NextResponse.json({ 
        success: false, 
        message: error.message || "Failed to refresh URL" 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        url: data.signedUrl
      }
    });
    
  } catch (error: any) {
    console.error('Error refreshing signed URL:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred" 
    }, { status: 500 });
  }
} 