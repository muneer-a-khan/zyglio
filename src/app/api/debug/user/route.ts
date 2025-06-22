import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: "Not authenticated",
        session: null
      });
    }

    console.log('Session user:', session.user);

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      session: {
        user: session.user
      },
      dbUser: dbUser,
      userExists: !!dbUser
    });

  } catch (error: any) {
    console.error('Debug user error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred",
      error: error.toString()
    }, { status: 500 });
  }
} 