// Script to directly check the eligible modules API endpoint
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEligibleModules() {
  try {
    console.log('Checking eligible modules...');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const userIdArg = args.find(arg => arg.startsWith('--userId='));
    const userId = userIdArg ? userIdArg.split('=')[1] : null;
    
    if (!userId) {
      console.error('Usage: node check-eligible-modules.js --userId=<userId>');
      return;
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      return;
    }
    
    console.log(`User: ${user.name || user.email} (${userId})`);
    
    // Get all modules where the user has completed at least one quiz
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        passed: true
      },
      select: {
        quizBank: {
          select: {
            moduleId: true
          }
        }
      },
      distinct: ['quizBankId']
    });
    
    const moduleIdsWithAttempts = quizAttempts.map(
      attempt => attempt.quizBank.moduleId
    );
    
    console.log(`Modules with attempts: ${moduleIdsWithAttempts.length}`);
    
    if (moduleIdsWithAttempts.length === 0) {
      console.log('No modules with any passed quizzes');
      return;
    }
    
    // Get relevant modules
    const modules = await prisma.trainingModule.findMany({
      where: {
        id: {
          in: moduleIdsWithAttempts
        },
        isApproved: true
      },
      include: {
        procedure: {
          select: {
            title: true
          }
        },
        quizBanks: {
          select: {
            id: true,
            attempts: {
              where: {
                userId,
                passed: true
              },
              select: {
                id: true
              }
            }
          }
        }
      }
    });
    
    console.log(`Eligible modules: ${modules.length}`);
    
    for (const module of modules) {
      const totalQuizzes = module.quizBanks.length;
      const passedQuizzes = module.quizBanks.filter(
        quiz => quiz.attempts.length > 0
      ).length;
      
      console.log(`\nModule: ${module.title} (${module.id})`);
      console.log(`  Procedure: ${module.procedure?.title || 'Unknown Procedure'}`);
      console.log(`  Approved: ${module.isApproved}`);
      console.log(`  Quizzes: ${passedQuizzes}/${totalQuizzes}`);
      console.log(`  Eligible: ${passedQuizzes === totalQuizzes ? 'Yes' : 'No'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkEligibleModules()
  .then(() => console.log('\nScript completed'))
  .catch(error => console.error('Script failed:', error)); 