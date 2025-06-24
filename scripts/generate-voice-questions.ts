import { prisma } from '../src/lib/prisma';
import { VoiceQuestionsService } from '../src/lib/services/voice-questions.service';

/**
 * This script generates voice certification questions for all existing modules
 * Run with: npx ts-node scripts/generate-voice-questions.ts
 */
async function generateVoiceQuestions() {
  try {
    console.log('Starting voice question generation for all modules...');
    
    // Get all training modules
    const modules = await prisma.trainingModule.findMany();
    console.log(`Found ${modules.length} training modules`);
    
    // Generate questions for each module
    for (const module of modules) {
      console.log(`Generating questions for module: ${module.id} - ${module.title}`);
      
      try {
        const result = await VoiceQuestionsService.generateQuestionsForModule(module.id, false);
        console.log(`Question generation for module ${module.id}: ${result ? 'Success' : 'Skipped (already exists)'}`);
      } catch (error) {
        console.error(`Error generating questions for module ${module.id}:`, error);
      }
      
      // Wait a bit between API calls to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Voice question generation completed');
  } catch (error) {
    console.error('Error in voice question generation script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateVoiceQuestions()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 