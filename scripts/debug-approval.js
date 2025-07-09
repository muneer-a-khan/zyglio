const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugApprovalProcess(moduleId, smeId) {
  console.log('🔍 Debugging Training Module Approval Process');
  console.log('='.repeat(50));
  
  try {
    // Check if SME user exists
    console.log('1. Checking SME user...');
    const smeUser = await prisma.user.findUnique({
      where: { id: smeId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    if (smeUser) {
      console.log('✅ SME user found:', {
        id: smeUser.id,
        email: smeUser.email,
        name: smeUser.name,
        role: smeUser.role
      });
    } else {
      console.log('❌ SME user NOT found with ID:', smeId);
      return;
    }
    
    // Check if training module exists
    console.log('\n2. Checking training module...');
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        procedure: {
          include: {
            LearningTask: {
              select: {
                userId: true,
                title: true
              }
            }
          }
        }
      }
    });
    
    if (module) {
      console.log('✅ Training module found:', {
        id: module.id,
        title: module.title,
        isApproved: module.isApproved,
        procedureTitle: module.procedure.title,
        createdBy: module.procedure.LearningTask?.userId
      });
      
      // Check permissions
      console.log('\n3. Checking permissions...');
      const hasPermission = module.procedure.LearningTask?.userId === smeId;
      if (hasPermission) {
        console.log('✅ SME has permission to approve this module');
      } else {
        console.log('❌ SME does NOT have permission to approve this module');
        console.log('   Module created by:', module.procedure.LearningTask?.userId);
        console.log('   Requesting SME:', smeId);
      }
    } else {
      console.log('❌ Training module NOT found with ID:', moduleId);
      return;
    }
    
    // Check for existing certifications
    console.log('\n4. Checking existing certifications...');
    const certification = await prisma.certification.findFirst({
      where: {
        moduleId: moduleId,
        userId: smeId
      }
    });
    
    if (certification) {
      console.log('✅ Existing certification found:', {
        id: certification.id,
        status: certification.status,
        passed: certification.passed
      });
    } else {
      console.log('ℹ️  No existing certification found (this is normal)');
    }
    
    console.log('\n5. Summary:');
    console.log('- User exists:', !!smeUser);
    console.log('- Module exists:', !!module);
    console.log('- Has permission:', module && smeUser && module.procedure.LearningTask?.userId === smeId);
    console.log('- Can approve:', !!(smeUser && module && module.procedure.LearningTask?.userId === smeId && !module.isApproved));
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug if arguments are provided
if (process.argv.length >= 4) {
  const moduleId = process.argv[2];
  const smeId = process.argv[3];
  
  if (!moduleId || !smeId) {
    console.log('Usage: node debug-approval.js <moduleId> <smeId>');
    process.exit(1);
  }
  
  debugApprovalProcess(moduleId, smeId);
} else {
  console.log('Usage: node debug-approval.js <moduleId> <smeId>');
  console.log('Example: node debug-approval.js "123e4567-e89b-12d3-a456-426614174000" "123e4567-e89b-12d3-a456-426614174001"');
}

module.exports = { debugApprovalProcess }; 