import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { certificationId, scenarioProgress, overallScore, passed } = await request.json();

    if (!certificationId) {
      return NextResponse.json(
        { error: 'Certification ID is required' },
        { status: 400 }
      );
    }

    console.log('🏁 Completing certification:', {
      certificationId,
      overallScore,
      passed,
      scenarioCount: scenarioProgress?.length || 0
    });

    // Update certification record
    const updatedCertification = await prisma.certification.update({
      where: { id: certificationId },
      data: {
        status: 'COMPLETED',
        voiceInterviewScore: overallScore,
        overallScore: overallScore,
        passed: passed,
        certifiedAt: passed ? new Date() : null,
        voiceInterviewData: {
          ...(await prisma.certification.findUnique({ 
            where: { id: certificationId },
            select: { voiceInterviewData: true }
          }))?.voiceInterviewData as any,
          completedAt: new Date().toISOString(),
          finalScore: overallScore,
          scenarioResults: scenarioProgress
        }
      }
    });

    // Log completion analytics
    await prisma.certificationAnalytics.create({
      data: {
        certificationId,
        userId: updatedCertification.userId,
        moduleId: updatedCertification.moduleId,
        eventType: 'CERTIFICATION_ACHIEVED',
        eventData: {
          overallScore,
          passed,
          scenarioCount: scenarioProgress?.length || 0,
          scenarioResults: scenarioProgress?.map((p: any) => ({
            scenarioId: p.scenarioId,
            finalScore: p.finalScore,
            passed: p.passed,
            questionsAsked: p.questionsAsked
          })) || []
        }
      }
    }).catch(() => {
      console.warn('Failed to log completion analytics');
    });

    console.log('✅ Certification completion saved successfully');

    return NextResponse.json({
      success: true,
      certification: {
        id: updatedCertification.id,
        passed: updatedCertification.passed,
        score: updatedCertification.overallScore,
        certifiedAt: updatedCertification.certifiedAt
      }
    });

  } catch (error) {
    console.error('Error completing certification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete certification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 