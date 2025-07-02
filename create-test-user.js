const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    // Create a regular user
    const regularUser = await prisma.user.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'trainee'
      }
    });
    console.log('Created regular user:', regularUser);

    // Create an SME user
    const smeUser = await prisma.user.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'sme@example.com',
        name: 'SME User',
        role: 'sme'
      }
    });
    console.log('Created SME user:', smeUser);

  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers(); 