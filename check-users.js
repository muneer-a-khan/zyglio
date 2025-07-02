const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log('All users in database:', users);
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers(); 