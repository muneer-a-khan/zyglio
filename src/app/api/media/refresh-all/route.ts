import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    // This is just a simple endpoint to trigger a refresh of media items
    // The actual refresh will happen in the main GET /api/media endpoint
    // when the client fetches the media items again
    
    return NextResponse.json({
      success: true,
      message: "Media refresh triggered. Fetch the media items again to get updated data."
    });
    
  } catch (error: any) {
    console.error('Error triggering media refresh:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred while triggering media refresh"
    }, { status: 500 });
  }
} 