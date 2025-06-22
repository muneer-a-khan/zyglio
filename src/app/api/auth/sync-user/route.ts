import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: "Not authenticated or missing user data"
      }, { status: 401 });
    }

    console.log('Syncing user:', session.user.id, session.user.email);

    // Check if user exists in database by ID
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      // Check if user exists by email (in case of ID mismatch)
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: session.user.email }
      });

      if (existingUserByEmail) {
        // Update the existing user's ID to match the session
        console.log('Found user by email, updating ID from', existingUserByEmail.id, 'to', session.user.id);
        
        try {
          user = await prisma.user.update({
            where: { email: session.user.email },
            data: {
              id: session.user.id,
              name: session.user.name || existingUserByEmail.name || session.user.email.split('@')[0] || 'User'
            }
          });
          console.log('Updated user ID in database:', user.id, user.email);
        } catch (updateError: any) {
          console.error('Error updating user ID:', updateError);
          return NextResponse.json({ 
            success: false, 
            message: "Failed to update user ID in database",
            error: updateError.message
          }, { status: 500 });
        }
      } else {
        // Create the user
        try {
          user = await prisma.user.create({
            data: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name || session.user.email.split('@')[0] || 'User',
              role: 'trainee'
            }
          });
          console.log('Created user in database:', user.id, user.email);
        } catch (createError: any) {
          console.error('Error creating user:', createError);
          
          // Try to find the user again in case of race condition
          user = await prisma.user.findUnique({
            where: { id: session.user.id }
          });
          
          if (!user) {
            return NextResponse.json({ 
              success: false, 
              message: "Failed to create user in database",
              error: createError.message
            }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "User synchronized successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error: any) {
    console.error('Sync user error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "An error occurred",
      error: error.toString()
    }, { status: 500 });
  }
} 