// Script to check if voice question banks exist for a module
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVoiceQuestions() {
  try {
    console.log('Checking voice question banks...');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const moduleIdArg = args.find(arg => arg.startsWith('--moduleId='));
    const moduleId = moduleIdArg ? moduleIdArg.split('=')[1] : null;
    
    let modules;
    
    if (moduleId) {
      // Check specific module
      modules = await prisma.trainingModule.findMany({
        where: { id: moduleId },
        include: {
          voiceQuestionBanks: true
        }
      });
    } else {
      // Check all modules
      modules = await prisma.trainingModule.findMany({
        include: {
          voiceQuestionBanks: true
        }
      });
    }
    
    console.log(`Found ${modules.length} modules`);
    
    for (const module of modules) {
      console.log(`\nModule: ${module.title} (${module.id})`);
      console.log(`  Voice question banks: ${module.voiceQuestionBanks.length}`);
      
      if (module.voiceQuestionBanks.length === 0) {
        console.log('  No voice question banks found for this module');
        continue;
      }
      
      for (const bank of module.voiceQuestionBanks) {
        console.log(`  Bank ID: ${bank.id}`);
        console.log(`    Difficulty: ${bank.difficulty}`);
        
        let questions = [];
        try {
          if (typeof bank.questions === 'string') {
            questions = JSON.parse(bank.questions);
          } else {
            questions = bank.questions;
          }
        } catch (e) {
          console.error('    Error parsing questions:', e);
        }
        
        console.log(`    Questions: ${questions.length}`);
        
        if (questions.length > 0) {
          console.log(`    First question: ${questions[0].question}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkVoiceQuestions()
  .then(() => console.log('\nScript completed'))
  .catch(error => console.error('Script failed:', error)); 