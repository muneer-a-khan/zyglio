// Script to check and approve training modules
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function approveModules() {
  try {
    console.log('Checking training modules...');
    
    // Get all training modules
    const modules = await prisma.trainingModule.findMany();
    console.log(`Found ${modules.length} training modules`);
    
    // Display module status
    for (const module of modules) {
      console.log(`Module: ${module.title}`);
      console.log(`  ID: ${module.id}`);
      console.log(`  Approved: ${module.isApproved}`);
      console.log(`  Approved By: ${module.approvedBy || 'None'}`);
      console.log(`  Approved At: ${module.approvedAt || 'None'}`);
      console.log('-----------------------------------');
    }
    
    // Check if we should approve modules
    const args = process.argv.slice(2);
    const approveAll = args.includes('--approve-all');
    const moduleIdArg = args.find(arg => arg.startsWith('--moduleId='));
    const moduleId = moduleIdArg ? moduleIdArg.split('=')[1] : null;
    
    if (approveAll || moduleId) {
      console.log('Approving modules...');
      
      if (moduleId) {
        // Approve specific module
        const module = modules.find(m => m.id === moduleId);
        if (!module) {
          console.error(`Module not found with ID: ${moduleId}`);
          return;
        }
        
        await approveModule(moduleId);
        console.log(`Approved module: ${module.title}`);
      } else if (approveAll) {
        // Approve all modules
        for (const module of modules) {
          await approveModule(module.id);
          console.log(`Approved module: ${module.title}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function approveModule(moduleId) {
  return prisma.trainingModule.update({
    where: { id: moduleId },
    data: {
      isApproved: true,
      approvedAt: new Date()
    }
  });
}

// Run the script
approveModules()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 