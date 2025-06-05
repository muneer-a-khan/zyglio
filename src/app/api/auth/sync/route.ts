import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { id, email, name } = session.user;

    if (!id || !email) {
      return NextResponse.json({ 
        success: false, 
        message: "Missing user information in session" 
      }, { status: 400 });
    }

    // Check if the user already exists in the database
    let user = await prisma.users.findUnique({
      where: { email }
    });

    if (user) {
      return NextResponse.json({ 
        success: true, 
        message: "User already exists in database", 
        user: { id: user.id, email: user.email, name: user.name }
      });
    }

    // Create the user in the database
    user = await prisma.users.create({
      data: {
        id,
        email,
        name: name || email.split('@')[0],
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "User synced to database successfully", 
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "An error occurred" 
    }, { status: 500 });
  }
} 