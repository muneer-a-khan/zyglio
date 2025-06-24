// Script to check quiz attempts for modules
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkQuizAttempts() {
  try {
    console.log('Checking quiz attempts...');
    
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`\nUser: ${user.name || user.email}`);
      console.log(`  ID: ${user.id}`);
      
      // Get quiz attempts for this user
      const quizAttempts = await prisma.quizAttempt.findMany({
        where: {
          userId: user.id
        },
        include: {
          quizBank: {
            include: {
              module: true
            }
          }
        }
      });
      
      console.log(`  Total quiz attempts: ${quizAttempts.length}`);
      
      // Group by module
      const moduleAttempts = {};
      quizAttempts.forEach(attempt => {
        const moduleId = attempt.quizBank.moduleId;
        const moduleName = attempt.quizBank.module.title;
        
        if (!moduleAttempts[moduleId]) {
          moduleAttempts[moduleId] = {
            name: moduleName,
            attempts: []
          };
        }
        
        moduleAttempts[moduleId].attempts.push({
          quizBankId: attempt.quizBankId,
          subtopic: attempt.quizBank.subtopic,
          score: attempt.score,
          passed: attempt.passed,
          completedAt: attempt.completedAt
        });
      });
      
      // Display module attempts
      for (const moduleId in moduleAttempts) {
        const module = moduleAttempts[moduleId];
        console.log(`  Module: ${module.name} (${moduleId})`);
        
        // Get all quiz banks for this module to check coverage
        const allQuizBanks = await prisma.quizBank.findMany({
          where: {
            moduleId
          }
        });
        
        const passedQuizBankIds = new Set(
          module.attempts
            .filter(a => a.passed)
            .map(a => a.quizBankId)
        );
        
        console.log(`    Total quizzes in module: ${allQuizBanks.length}`);
        console.log(`    Passed quizzes: ${passedQuizBankIds.size}`);
        console.log(`    All quizzes passed: ${passedQuizBankIds.size === allQuizBanks.length ? 'Yes' : 'No'}`);
        
        // Show detailed attempts
        module.attempts.forEach(attempt => {
          console.log(`    - ${attempt.subtopic}: Score ${attempt.score}% (${attempt.passed ? 'Passed' : 'Failed'}) on ${attempt.completedAt.toLocaleString()}`);
        });
      }
      
      // Check if eligible for certification
      console.log('\n  Certification eligibility:');
      for (const moduleId in moduleAttempts) {
        const module = moduleAttempts[moduleId];
        
        // Get all quiz banks for this module
        const allQuizBanks = await prisma.quizBank.findMany({
          where: {
            moduleId
          }
        });
        
        const passedQuizBankIds = new Set(
          module.attempts
            .filter(a => a.passed)
            .map(a => a.quizBankId)
        );
        
        const allPassed = passedQuizBankIds.size === allQuizBanks.length && allQuizBanks.length > 0;
        
        console.log(`    ${module.name}: ${allPassed ? 'Eligible' : 'Not eligible'} (${passedQuizBankIds.size}/${allQuizBanks.length} quizzes passed)`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkQuizAttempts()
  .then(() => console.log('\nScript completed'))
  .catch(error => console.error('Script failed:', error)); 