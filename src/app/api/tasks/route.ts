import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET handler to fetch all learning tasks
export async function GET() {
  try {
    const tasks = await prisma.learningTask.findMany({
      include: {
        users: true,
      },
    });
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST handler to create a new learning task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { title, kpiTech, kpiConcept, presenter, affiliation, date, userId } = body;
    
    if (!title || !presenter || !date || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const task = await prisma.learningTask.create({
      data: {
        title,
        kpiTech,
        kpiConcept,
        presenter,
        affiliation,
        date: new Date(date),
        userId,
      },
    });
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 