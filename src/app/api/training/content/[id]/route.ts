import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication and authorization
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'sme' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const { id } = await context.params;
    const { content, title } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }
    
    // Find the content to update
    const existingContent = await prisma.trainingContent.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            procedure: {
              include: {
                LearningTask: true
              }
            }
          }
        }
      }
    });
    
    if (!existingContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is the owner of the procedure
    const isOwner = existingContent.module.procedure.LearningTask.userId === session.user.id;
    if (!isOwner && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to edit this content' },
        { status: 403 }
      );
    }
    
    // Update the content
    const updateData: any = { content };
    if (title) {
      updateData.title = title;
    }
    
    const updatedContent = await prisma.trainingContent.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      content: updatedContent
    });
    
  } catch (error) {
    console.error('Error updating training content:', error);
    return NextResponse.json(
      { error: 'Failed to update training content' },
      { status: 500 }
    );
  }
} 