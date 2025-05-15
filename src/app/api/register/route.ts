import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import prisma from "@/lib/prisma";

// Create an admin client with the service role key
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

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // First, create the user in Supabase Auth with admin privileges
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { name }
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, message: "Failed to create user" },
        { status: 500 }
      );
    }

    // Then, create the user in Prisma database
    try {
      const dbUser = await prisma.user.create({
        data: {
          id: authData.user.id,
          email: authData.user.email!,
          name: name || authData.user.email!.split('@')[0],
        }
      });

      return NextResponse.json({
        success: true,
        message: "User registered successfully",
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name
        }
      });
    } catch (dbError: any) {
      console.error("Prisma error:", dbError);
      
      // If we can't create in the database, revert the auth creation
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { success: false, message: dbError.message || "Database error" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
} 