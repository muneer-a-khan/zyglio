import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const certificationId = formData.get('certificationId') as string;
    const audioBlob = formData.get('audioBlob') as Blob;

    if (!certificationId || !audioBlob) {
      return NextResponse.json(
        { error: 'Missing certification ID or audio data' },
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

    // Forward to the RAG interview turn API
    const turnFormData = new FormData();
    turnFormData.append('sessionId', sessionId);
    turnFormData.append('audioBlob', audioBlob);

    const turnResponse = await fetch(new URL('/api/rag/interview-turn', process.env.NEXTAUTH_URL).toString(), {
      method: 'POST',
      body: turnFormData,
    });

    if (!turnResponse.ok) {
      const errorData = await turnResponse.json();
      throw new Error(errorData.error || 'Failed to process interview turn');
    }

    const turnData = await turnResponse.json();

    // Update certification with the conversation history
    await prisma.certification.update({
      where: { id: certificationId },
      data: {
        voiceInterviewData: {
          ...voiceInterviewData,
          conversationHistory: turnData.conversationHistory,
          lastTurnAt: new Date().toISOString()
        }
      }
    });

    // Log analytics for certification
    if (!turnData.interviewCompleted) {
      await prisma.certificationAnalytics.create({
        data: {
          certificationId,
          userId: certification.userId,
          moduleId: certification.moduleId,
          eventType: 'VOICE_INTERVIEW_STARTED',
          eventData: {
            turnNumber: turnData.conversationHistory?.length || 0,
            questionsAsked: turnData.questionsAsked || 0
          }
        }
      }).catch(() => {
        console.warn('Failed to log turn analytics');
      });
    }

    return NextResponse.json(turnData);

  } catch (error) {
    console.error('Error in certification interview turn:', error);
    return NextResponse.json(
      { error: 'Failed to process certification turn', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 