import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      moduleId,
      subtopic,
      score,
      passed,
      questionsAnswered,
      sessionDuration,
      conversation,
      agentUsed,
      certificationLevel,
      certificationDate
    } = body;

    // Validate required fields
    if (!moduleId || !subtopic || score === undefined || passed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: moduleId, subtopic, score, passed' },
        { status: 400 }
      );
    }

    // Ensure the requesting user matches the userId or user has admin privileges
    if (session.user.id !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`💾 Saving subtopic certification: ${subtopic} for user ${userId} in module ${moduleId}`);

    // Get or create the main certification record
    let certification = await prisma.certification.findUnique({
      where: {
        userId_moduleId: {
          userId: userId,
          moduleId: moduleId
        }
      }
    });

    // Get existing subtopic certifications from voiceInterviewData
    const existingData = certification?.voiceInterviewData as any || {};
    const subtopicCertifications = existingData.subtopicCertifications || {};

    // Create subtopic certification data
    const subtopicCertificationData = {
      score: score,
      passed: passed,
      questionsAnswered: questionsAnswered || 0,
      sessionDuration: sessionDuration || 0,
      conversation: conversation || [],
      agentUsed: agentUsed,
      certificationLevel: certificationLevel,
      completedAt: certificationDate ? new Date(certificationDate) : new Date(),
      lastAttempt: new Date()
    };

    // Add this subtopic certification to the collection
    subtopicCertifications[subtopic] = subtopicCertificationData;

    // Calculate overall module progress
    const allSubtopicsPassed = Object.values(subtopicCertifications).every((cert: any) => cert.passed);
    const averageScore = Object.values(subtopicCertifications).reduce((sum: number, cert: any) => sum + cert.score, 0) / Object.keys(subtopicCertifications).length;

    // Create the updated voiceInterviewData
    const updatedVoiceInterviewData = {
      ...existingData,
      subtopicCertifications: subtopicCertifications,
      lastUpdated: new Date(),
      overallModuleProgress: {
        totalSubtopics: Object.keys(subtopicCertifications).length,
        passedSubtopics: Object.values(subtopicCertifications).filter((cert: any) => cert.passed).length,
        averageScore: averageScore,
        allSubtopicsPassed: allSubtopicsPassed
      }
    };

    if (!certification) {
      // Create new certification record
      // We need a procedureId, let's try to get it from the module or create a default
      let procedureId: string;
      
      try {
        const trainingModule = await prisma.trainingModule.findUnique({
          where: { id: moduleId },
          include: { procedure: true }
        });
        
        if (!trainingModule?.procedure?.id) {
          // If no procedure is linked, we'll skip creating the certification
          // Instead, we'll store the data in a separate way or return an error
          return NextResponse.json(
            { error: 'No procedure linked to this module. Cannot create certification.' },
            { status: 400 }
          );
        }
        
        procedureId = trainingModule.procedure.id;
      } catch (error) {
        console.error('Error getting procedure ID:', error);
        return NextResponse.json(
          { error: 'Failed to get procedure information' },
          { status: 500 }
        );
      }

      certification = await prisma.certification.create({
        data: {
          userId: userId,
          moduleId: moduleId,
          procedureId: procedureId,
          status: passed ? 'IN_PROGRESS' : 'NOT_STARTED',
          voiceInterviewData: updatedVoiceInterviewData,
          voiceInterviewScore: { subtopic: subtopic, score: score },
          overallScore: Math.round(averageScore),
          passed: allSubtopicsPassed,
          certifiedAt: allSubtopicsPassed ? new Date() : null
        }
      });
    } else {
      // Update existing certification record
      certification = await prisma.certification.update({
        where: {
          userId_moduleId: {
            userId: userId,
            moduleId: moduleId
          }
        },
        data: {
          voiceInterviewData: updatedVoiceInterviewData,
          voiceInterviewScore: { subtopic: subtopic, score: score },
          overallScore: Math.round(averageScore),
          passed: allSubtopicsPassed,
          certifiedAt: allSubtopicsPassed ? new Date() : certification.certifiedAt,
          status: allSubtopicsPassed ? 'COMPLETED' : 'IN_PROGRESS'
        }
      });
    }

    console.log(`✅ Subtopic certification saved for ${subtopic}`);

    // If this subtopic was passed, update the user's training progress
    if (passed) {
      try {
        // Check if user has training progress for this module
        const trainingProgress = await prisma.trainingProgress.findUnique({
          where: {
            userId_moduleId: {
              userId: userId,
              moduleId: moduleId
            }
          }
        });

        if (trainingProgress) {
          // Add this subtopic to completed subtopics if not already there
          const completedSubtopics = trainingProgress.completedSubtopics as string[] || [];
          if (!completedSubtopics.includes(subtopic)) {
            completedSubtopics.push(subtopic);
            
            // Update training progress
            await prisma.trainingProgress.update({
              where: {
                userId_moduleId: {
                  userId: userId,
                  moduleId: moduleId
                }
              },
              data: {
                completedSubtopics: completedSubtopics
              }
            });
            
            console.log(`📈 Updated training progress: added ${subtopic} to completed subtopics`);
          }
        }
      } catch (progressError) {
        console.error('Error updating training progress:', progressError);
        // Don't fail the whole request if progress update fails
      }
    }

    return NextResponse.json({
      success: true,
      certification: {
        id: certification.id,
        moduleId: certification.moduleId,
        subtopic: subtopic,
        score: score,
        passed: passed,
        certificationLevel: certificationLevel,
        completedAt: subtopicCertificationData.completedAt,
        overallModulePassed: allSubtopicsPassed,
        averageScore: Math.round(averageScore)
      }
    });

  } catch (error) {
    console.error('Error saving subtopic certification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save certification results',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const moduleId = searchParams.get('moduleId');
    const subtopic = searchParams.get('subtopic');

    // Ensure the requesting user matches the userId or user has admin privileges
    if (session.user.id !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let whereClause: any = { userId: userId };
    
    if (moduleId) {
      whereClause.moduleId = moduleId;
    }

    const certifications = await prisma.certification.findMany({
      where: whereClause,
      orderBy: {
        certifiedAt: 'desc'
      }
    });

    // Extract subtopic certifications from voiceInterviewData
    const subtopicCertifications: any[] = [];
    
    certifications.forEach(cert => {
      const voiceData = cert.voiceInterviewData as any;
      if (voiceData?.subtopicCertifications) {
        Object.entries(voiceData.subtopicCertifications).forEach(([subtopicName, data]: [string, any]) => {
          if (!subtopic || subtopicName === subtopic) {
            subtopicCertifications.push({
              id: `${cert.id}_${subtopicName}`,
              moduleId: cert.moduleId,
              subtopic: subtopicName,
              ...data
            });
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      certifications: subtopicCertifications
    });

  } catch (error) {
    console.error('Error fetching subtopic certifications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch certification results',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 