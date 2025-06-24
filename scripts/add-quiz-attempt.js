// Script to add a passing quiz attempt for a module
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addQuizAttempt() {
  try {
    console.log('Adding quiz attempt...');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const userIdArg = args.find(arg => arg.startsWith('--userId='));
    const moduleIdArg = args.find(arg => arg.startsWith('--moduleId='));
    
    const userId = userIdArg ? userIdArg.split('=')[1] : null;
    const moduleId = moduleIdArg ? moduleIdArg.split('=')[1] : null;
    
    if (!userId || !moduleId) {
      console.error('Usage: node add-quiz-attempt.js --userId=<userId> --moduleId=<moduleId>');
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
    
    // Check if module exists
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        quizBanks: true
      }
    });
    
    if (!module) {
      console.error(`Module not found with ID: ${moduleId}`);
      return;
    }
    
    console.log(`Module: ${module.title} (${moduleId})`);
    console.log(`Quiz banks: ${module.quizBanks.length}`);
    
    if (module.quizBanks.length === 0) {
      console.error('Module has no quiz banks');
      return;
    }
    
    // Add a passing quiz attempt for each quiz bank
    for (const quizBank of module.quizBanks) {
      console.log(`Adding attempt for quiz bank: ${quizBank.id} (${quizBank.subtopic})`);
      
      // Check if attempt already exists
      const existingAttempt = await prisma.quizAttempt.findFirst({
        where: {
          userId,
          quizBankId: quizBank.id
        }
      });
      
      if (existingAttempt) {
        console.log(`  Attempt already exists with score: ${existingAttempt.score}%`);
        continue;
      }
      
      // Create a new passing attempt
      const attempt = await prisma.quizAttempt.create({
        data: {
          userId,
          quizBankId: quizBank.id,
          answers: JSON.stringify([0, 1, 2]), // Dummy answers
          score: 90, // Passing score
          passed: true,
          timeSpent: 300, // 5 minutes
          attemptNumber: 1,
          completedAt: new Date()
        }
      });
      
      console.log(`  Created attempt: ${attempt.id} with score: ${attempt.score}%`);
    }
    
    console.log('Quiz attempts added successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addQuizAttempt()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 