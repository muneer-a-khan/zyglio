// Script to update training progress for a user
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTrainingProgress() {
  try {
    console.log('Updating training progress...');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const userIdArg = args.find(arg => arg.startsWith('--userId='));
    const moduleIdArg = args.find(arg => arg.startsWith('--moduleId='));
    
    const userId = userIdArg ? userIdArg.split('=')[1] : null;
    const moduleId = moduleIdArg ? moduleIdArg.split('=')[1] : null;
    
    if (!userId || !moduleId) {
      console.error('Usage: node update-training-progress.js --userId=<userId> --moduleId=<moduleId>');
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
    
    // Get subtopics from the module
    const subtopics = [];
    try {
      if (typeof module.subtopics === 'string') {
        const parsedSubtopics = JSON.parse(module.subtopics);
        if (Array.isArray(parsedSubtopics)) {
          parsedSubtopics.forEach(s => {
            if (typeof s === 'string') {
              subtopics.push(s);
            } else if (s && s.title) {
              subtopics.push(s.title);
            }
          });
        }
      } else if (Array.isArray(module.subtopics)) {
        module.subtopics.forEach(s => {
          if (typeof s === 'string') {
            subtopics.push(s);
          } else if (s && s.title) {
            subtopics.push(s.title);
          }
        });
      }
    } catch (e) {
      console.error('Error parsing subtopics:', e);
    }
    
    console.log(`Subtopics: ${subtopics.join(', ')}`);
    
    // Check if progress exists
    let progress = await prisma.trainingProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      }
    });
    
    if (progress) {
      console.log('Existing progress found');
      console.log(`  Current subtopic: ${progress.currentSubtopic}`);
      console.log(`  Completed subtopics: ${JSON.stringify(progress.completedSubtopics)}`);
      console.log(`  Progress percentage: ${progress.progressPercentage}%`);
    } else {
      console.log('No existing progress found, creating new progress');
      
      // Create new progress
      progress = await prisma.trainingProgress.create({
        data: {
          userId,
          moduleId,
          currentSubtopic: subtopics[0] || null,
          completedSubtopics: JSON.stringify([]),
          timeSpent: 0,
          progressPercentage: 0
        }
      });
      
      console.log('Created new progress');
    }
    
    // Update progress to mark all subtopics as completed
    const updatedProgress = await prisma.trainingProgress.update({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      },
      data: {
        completedSubtopics: JSON.stringify(subtopics),
        progressPercentage: 100,
        lastAccessedAt: new Date()
      }
    });
    
    console.log('Updated progress:');
    console.log(`  Completed subtopics: ${JSON.stringify(updatedProgress.completedSubtopics)}`);
    console.log(`  Progress percentage: ${updatedProgress.progressPercentage}%`);
    
    console.log('Training progress updated successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateTrainingProgress()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 