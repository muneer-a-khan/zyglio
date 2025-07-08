import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Test connection
    const usersCount = await prisma.user.count();
    
    // Return a success response
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      usersCount 
    });
    
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 