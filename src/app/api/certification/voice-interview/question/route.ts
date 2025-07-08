import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { certificationId } = await request.json();

    if (!certificationId) {
      return NextResponse.json(
        { error: 'Missing certification ID' },
        { status: 400 }
      );
    }

    // Get certification data
    const certification = await prisma.certification.findUnique({
      where: { id: certificationId }
    });

    if (!certification) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    const voiceInterviewData = certification.voiceInterviewData as any;
    const sessionId = voiceInterviewData?.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID not found in certification data' },
        { status: 400 }
      );
    }

    // Forward to the DeepSeek interview question API for the first question
    const questionResponse = await fetch(new URL('/api/deepseek/interview-question', process.env.NEXTAUTH_URL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        isFirstQuestion: true
      }),
    });

    if (!questionResponse.ok) {
      const errorData = await questionResponse.json();
      throw new Error(errorData.error || 'Failed to generate first question');
    }

    const questionData = await questionResponse.json();

    // Update certification with first question data
    await prisma.certification.update({
      where: { id: certificationId },
      data: {
        voiceInterviewData: {
          ...voiceInterviewData,
          firstQuestionAsked: true,
          firstQuestionAt: new Date().toISOString()
        }
      }
    });

    // Log analytics for first question
    await prisma.certificationAnalytics.create({
      data: {
        certificationId,
        userId: certification.userId,
        moduleId: certification.moduleId,
        eventType: 'TRAINING_STARTED',
        eventData: {
          question: questionData.aiQuestionText?.substring(0, 100) + "..."
        }
      }
    }).catch(() => {
      console.warn('Failed to log first question analytics');
    });

    return NextResponse.json({
      success: true,
      questionText: questionData.aiQuestionText,
      questionAudio: questionData.aiQuestionAudio
    });

  } catch (error) {
    console.error('Error getting certification question:', error);
    return NextResponse.json(
      { error: 'Failed to get certification question', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 