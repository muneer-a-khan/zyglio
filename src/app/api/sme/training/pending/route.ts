import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const smeId = searchParams.get('smeId');

    if (!smeId) {
      return NextResponse.json(
        { error: 'SME ID is required' },
        { status: 400 }
      );
    }

    // Get all training modules that need approval
    // SMEs can approve modules for procedures they created
    const pendingModules = await prisma.trainingModule.findMany({
      where: {
        isApproved: false,
        procedure: {
          LearningTask: {
            userId: smeId // Using userId instead of createdBy
          }
        }
      },
      include: {
        procedure: {
          include: {
            LearningTask: {
              select: {
                title: true,
                id: true
              }
            }
          }
        },
        content: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        quizBanks: {
          include: {
            _count: {
              select: {
                attempts: true
              }
            }
          }
        },
        _count: {
          select: {
            certifications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedModules = pendingModules.map(module => {
      const totalQuestions = module.quizBanks.reduce((sum, quiz) => {
        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        return sum + questions.length;
      }, 0);

      const totalEstimatedTime = module.content.reduce((sum, content) => sum + content.estimatedTime, 0);

      return {
        id: module.id,
        title: module.title,
        procedureTitle: module.procedure.title,
        taskTitle: module.procedure.LearningTask.title,
        subtopics: Array.isArray(module.subtopics) ? module.subtopics : [],
        createdAt: module.createdAt.toISOString(),
        version: module.version,
        contentCount: module.content.length,
        quizCount: module.quizBanks.length,
        totalQuestions,
        estimatedTime: totalEstimatedTime,
        waitingCertifications: module._count.certifications,
        status: 'pending_approval',
        contentTypes: module.content.reduce((types: string[], content) => {
          if (!types.includes(content.contentType)) {
            types.push(content.contentType);
          }
          return types;
        }, [])
      };
    });

    return NextResponse.json({
      success: true,
      pendingModules: formattedModules,
      count: formattedModules.length
    });

  } catch (error) {
    console.error('Error loading pending training modules:', error);
    return NextResponse.json(
      { error: 'Failed to load pending training modules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 Starting training module approval process...');
  
  try {
    const { moduleId, smeId, action, feedback } = await request.json();
    console.log('📝 Request data:', { moduleId, smeId, action, feedback });

    if (!moduleId || !smeId || !action) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Module ID, SME ID, and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      console.log('❌ Invalid action:', action);
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or request_changes' },
        { status: 400 }
      );
    }

    // Verify that the SME user exists
    console.log('🔍 Checking if SME user exists...');
    const smeUser = await prisma.user.findUnique({
      where: { id: smeId }
    });

    if (!smeUser) {
      console.log('❌ SME user not found:', smeId);
      return NextResponse.json(
        { error: 'SME user not found' },
        { status: 404 }
      );
    }
    console.log('✅ SME user found:', smeUser.email);

    // Get the training module
    console.log('🔍 Checking if training module exists...');
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        procedure: {
          include: {
            LearningTask: true
          }
        }
      }
    });

    if (!module) {
      console.log('❌ Training module not found:', moduleId);
      return NextResponse.json(
        { error: 'Training module not found' },
        { status: 404 }
      );
    }
    console.log('✅ Training module found:', module.title);

    // Verify SME has permission to approve this module
    console.log('🔍 Checking permissions...');
    console.log('Module creator:', module.procedure.LearningTask?.userId);
    console.log('Requesting SME:', smeId);
    
    if (module.procedure.LearningTask?.userId !== smeId) {
      console.log('❌ Permission denied');
      return NextResponse.json(
        { error: 'You do not have permission to approve this module' },
        { status: 403 }
      );
    }
    console.log('✅ Permission granted');

    if (action === 'approve') {
      console.log('🚀 Starting approval process...');
      
      // Approve the module
      console.log('📝 Updating module approval status...');
      const now = new Date();
      
      // Use raw SQL to bypass the Prisma client bug
      console.log('🔄 Updating approval status with raw SQL...');
      const result = await prisma.$executeRaw`
        UPDATE "TrainingModule" 
        SET "isApproved" = true, 
            "approvedAt" = ${now}, 
            "approvedBy" = ${smeId}::uuid
        WHERE id = ${moduleId}::uuid
      `;
      console.log('✅ Raw SQL update completed, rows affected:', result);
      
      // Get the updated module
      const updatedModule = await prisma.trainingModule.findUnique({
        where: { id: moduleId }
      });
      
      if (!updatedModule) {
        throw new Error('Failed to retrieve updated module');
      }
      
      console.log('✅ Module approval status updated');

      // Check if there's an existing certification for this module and user
      console.log('🔍 Checking for existing certification...');
      const existingCertification = await prisma.certification.findFirst({
        where: {
          moduleId: moduleId,
          userId: smeId
        }
      });

      if (existingCertification) {
        console.log('✅ Existing certification found, creating analytics...');
        try {
          await prisma.certificationAnalytics.create({
            data: {
              userId: smeId,
              moduleId: moduleId,
              eventType: 'TRAINING_STARTED',
              eventData: {
                action: 'module_approved',
                approvedAt: now.toISOString(),
                feedback: feedback || null
              },
              certificationId: existingCertification.id
            }
          });
          console.log('✅ Analytics created successfully');
        } catch (analyticsError) {
          console.warn('⚠️ Failed to log approval analytics:', analyticsError);
          // Don't fail the entire approval process if analytics fails
        }
      } else {
        console.log('ℹ️ No existing certification found (this is normal)');
      }

      console.log('🎉 Approval process completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Training module approved successfully',
        module: {
          id: updatedModule.id,
          isApproved: updatedModule.isApproved,
          approvedAt: updatedModule.approvedAt?.toISOString(),
          approvedBy: updatedModule.approvedBy
        }
      });

    } else if (action === 'reject') {
      console.log('📝 Processing rejection...');
      // For rejection, we'll add a comment or feedback but keep the module
      // We don't have a rejectionReason field in the schema, so we'll handle this differently
      // For now, we'll just return a response without updating the module
      
      return NextResponse.json({
        success: true,
        message: 'Training module rejected',
        feedback: feedback || 'Module was rejected by SME'
      });

    } else if (action === 'request_changes') {
      console.log('📝 Processing change request...');
      // Mark as needing changes
      // Similar to rejection, we don't have specific fields for this yet
      
      return NextResponse.json({
        success: true,
        message: 'Changes requested for training module',
        feedback: feedback || 'Changes requested by SME'
      });
    }

    // This should never be reached due to validation above, but just in case
    console.log('❌ Invalid action processed (should never happen)');
    return NextResponse.json(
      { error: 'Invalid action processed' },
      { status: 400 }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR in training module approval:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    // Provide more specific error information if possible
    if (error instanceof Error) {
      console.error('Error type check:', error.constructor.name);
      
      // Check for specific database constraint errors
      if (error.message.includes('foreign key constraint')) {
        console.error('🔗 Foreign key constraint violation');
        return NextResponse.json(
          { error: 'Invalid user reference - please ensure the approver exists' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('unique constraint')) {
        console.error('🔒 Unique constraint violation');
        return NextResponse.json(
          { error: 'This action has already been performed' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process training module approval' },
      { status: 500 }
    );
  }
} 