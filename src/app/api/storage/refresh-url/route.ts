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

    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        success: false, 
        message: "Server configuration error - missing Supabase credentials" 
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate a new signed URL with a long expiry
    const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years
    const { data, error } = await supabase.storage
      .from('user-uploads')
      .createSignedUrl(filePath, TEN_YEARS_IN_SECONDS);
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: error.message || "Failed to refresh URL"
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        url: data.signedUrl,
        filePath
      }
    });
    
  } catch (error: any) {
    console.error('Error refreshing URL:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred while refreshing the URL"
    }, { status: 500 });
  }
} 