import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('[ElevenLabs Cert] Completing certification');
    
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, conversationHistory } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId' },
        { status: 400 }
      );
    }

    console.log(`Completing ElevenLabs certification for session: ${sessionId}`);

    // Get the certification with voice interview data
    const certification = await prisma.certification.findFirst({
      where: {
        voiceInterviewData: {
          path: ['sessionId'],
          equals: sessionId
        }
      },
      include: {
        module: true
      }
    });

    if (!certification) {
      console.log(`Certification not found for session: ${sessionId}`);
      return NextResponse.json(
        { error: 'Certification session not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (certification.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log(`Certification status: ${certification.status}`);
    if (certification.status !== 'VOICE_INTERVIEW_IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Certification is not in progress' },
        { status: 400 }
      );
    }

    const voiceInterviewData = certification.voiceInterviewData as any;
    if (!voiceInterviewData) {
      return NextResponse.json(
        { error: 'Voice interview data not found' },
        { status: 500 }
      );
    }

    // Update the conversation history
    const updatedVoiceData = {
      ...voiceInterviewData,
      conversationHistory: conversationHistory || voiceInterviewData.conversationHistory || [],
      completedAt: new Date().toISOString()
    };

    // Calculate overall score from the responses stored by the scoring tool
    const responses = updatedVoiceData.responses || [];
    let overallScore = 0;
    
    if (responses.length > 0) {
      const totalPoints = responses.reduce((sum: number, r: any) => sum + (r.maxScore || 10), 0);
      const earnedPoints = responses.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
      overallScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    } else {
      // Fallback: estimate score based on conversation quality
      const userResponses = conversationHistory?.filter((msg: any) => msg.role === 'user') || [];
      if (userResponses.length > 0) {
        // Simple heuristic based on response count and length
        const avgResponseLength = userResponses.reduce((sum: number, msg: any) => 
          sum + (msg.content?.length || 0), 0) / userResponses.length;
        
        // Score based on engagement and response quality
        const baseScore = Math.min(85, Math.max(40, userResponses.length * 15));
        const lengthBonus = Math.min(15, avgResponseLength / 10);
        overallScore = Math.round(baseScore + lengthBonus);
      } else {
        overallScore = 0; // No responses recorded
      }
    }
    
    // Determine if passed based on threshold
    const passingThreshold = voiceInterviewData.passingThreshold || 70;
    const passed = overallScore >= passingThreshold;
    
    console.log(`Final score: ${overallScore}/${passingThreshold}, Passed: ${passed}`);

    // Calculate session duration
    const startTime = new Date(voiceInterviewData.startedAt);
    const endTime = new Date();
    const timeElapsedSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // Update certification status
    console.log("Updating certification status...");
    const updatedCertification = await prisma.certification.update({
      where: { id: certification.id },
      data: {
        status: passed ? 'COMPLETED' : 'FAILED',
        overallScore: overallScore,
        certifiedAt: passed ? new Date() : null,
        voiceInterviewData: {
          ...updatedVoiceData,
          overallScore,
          passed,
          timeElapsedSeconds,
          completedAt: new Date().toISOString()
        }
      }
    });
    console.log("Certification updated successfully");

    // Log analytics
    console.log("Logging analytics...");
    await prisma.certificationAnalytics.create({
      data: {
        certificationId: certification.id,
        userId: session.user.id,
        moduleId: certification.moduleId,
        eventType: passed ? 'CERTIFICATION_COMPLETED' : 'CERTIFICATION_FAILED',
        eventData: {
          provider: 'elevenlabs',
          score: overallScore,
          passingThreshold,
          timeElapsedSeconds,
          conversationTurns: conversationHistory?.length || 0,
          responseCount: responses.length,
          sessionId
        }
      }
    }).catch((error) => {
      console.warn('Failed to log analytics', error);
    });

    console.log("Returning success response");
    return NextResponse.json({
      success: true,
      passed,
      score: overallScore,
      certificationId: certification.id,
      completedAt: updatedCertification.certifiedAt,
      timeElapsed: timeElapsedSeconds,
      passingThreshold
    });

  } catch (error) {
    console.error('[ElevenLabs Cert] Error completing certification:', error);
    return NextResponse.json(
      { error: 'Failed to complete voice certification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 