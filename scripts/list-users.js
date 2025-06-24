// Script to list all users
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('Listing all users...');
    
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    users.forEach(user => {
      console.log(`${user.name || user.email}: ${user.id}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
listUsers()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 