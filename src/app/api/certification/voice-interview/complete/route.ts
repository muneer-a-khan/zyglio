import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log("Voice interview complete API called");
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificationId, responses, timeElapsed } = await request.json();
    console.log(`Processing completion for certification ${certificationId} with ${responses.length} responses`);

    if (!certificationId || !responses) {
      return NextResponse.json(
        { error: 'Certification ID and responses are required' },
        { status: 400 }
      );
    }

    // Get the certification with voice interview data
    const certification = await prisma.certification.findUnique({
      where: { id: certificationId },
      include: {
        module: true
      }
    });

    if (!certification) {
      console.log(`Certification not found: ${certificationId}`);
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    console.log(`Certification status: ${certification.status}`);
    if (certification.status !== 'VOICE_INTERVIEW_IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Certification is not in progress' },
        { status: 400 }
      );
    }

    const voiceInterviewData = certification.voiceInterviewData as any;
    if (!voiceInterviewData || !voiceInterviewData.questions) {
      return NextResponse.json(
        { error: 'Voice interview data not found' },
        { status: 500 }
      );
    }

    // Calculate overall score
    const totalPoints = voiceInterviewData.questions.reduce((sum: number, q: any) => sum + (q.points || 5), 0);
    const earnedPoints = responses.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    const overallScore = Math.round((earnedPoints / totalPoints) * 100);
    
    // Determine if passed
    const passingThreshold = voiceInterviewData.passingThreshold || 70;
    const passed = overallScore >= passingThreshold;
    console.log(`Score: ${overallScore}/${passingThreshold}, Passed: ${passed}`);

    // Update certification status
    console.log("Updating certification status...");
    const updatedCertification = await prisma.certification.update({
      where: { id: certificationId },
      data: {
        status: passed ? 'COMPLETED' : 'FAILED',
        overallScore: overallScore,
        certifiedAt: passed ? new Date() : null,
        voiceInterviewData: {
          ...voiceInterviewData,
          responses: responses,
          overallScore,
          passed,
          timeElapsedSeconds: timeElapsed,
          completedAt: new Date().toISOString()
        }
      }
    });
    console.log("Certification updated successfully");

    // Log analytics
    console.log("Logging analytics...");
    await prisma.certificationAnalytics.create({
      data: {
        certificationId,
        userId: session.user.id,
        moduleId: certification.moduleId,
        eventType: passed ? 'CERTIFICATION_ACHIEVED' : 'CERTIFICATION_FAILED',
        eventData: {
          score: overallScore,
          passingThreshold,
          timeElapsedSeconds: timeElapsed,
          questionsAnswered: responses.length,
          totalQuestions: voiceInterviewData.questions.length
        }
      }
    }).catch((error) => {
      console.warn('Failed to log analytics', error);
    });

    console.log("Returning success response");
    return NextResponse.json({
      success: true,
      passed,
      overallScore,
      certificationId,
      completedAt: updatedCertification.certifiedAt,
      timeElapsed
    });

  } catch (error) {
    console.error('Error completing voice interview:', error);
    return NextResponse.json(
      { error: 'Failed to complete certification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 