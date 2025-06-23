import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
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
    const { questions, passingScore } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }
    
    // Find the quiz to update
    const existingQuiz = await prisma.quizBank.findUnique({
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
    
    if (!existingQuiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is the owner of the procedure
    const isOwner = existingQuiz.module.procedure.LearningTask.userId === session.user.id;
    if (!isOwner && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to edit this quiz' },
        { status: 403 }
      );
    }
    
    // Update the quiz
    const updateData: any = {};
    if (questions) {
      updateData.questions = questions;
    }
    if (passingScore) {
      updateData.passingScore = passingScore;
    }
    
    const updatedQuiz = await prisma.quizBank.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      quiz: updatedQuiz
    });
    
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to update quiz' },
      { status: 500 }
    );
  }
} 