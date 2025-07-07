import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ElevenLabsService } from '@/lib/elevenlabs-service';

const elevenLabsService = new ElevenLabsService();

// GET - Retrieve agent for a module or list all agents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const scenarioId = searchParams.get('scenarioId');

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID required' }, { status: 400 });
    }

    if (scenarioId) {
      // Get specific scenario agent
      const agent = await prisma.elevenLabsAgent.findFirst({
        where: {
          moduleId,
          scenarioId,
          isActive: true
        }
      });

      return NextResponse.json({ agent });
    } else {
      // Get all scenario agents for this module
      const agents = await prisma.elevenLabsAgent.findMany({
        where: {
          moduleId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json({ agents });
    }

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST - Create new agent for a module
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId, scenarioId, scenarioData } = await request.json();

    if (!moduleId || !scenarioId || !scenarioData) {
      return NextResponse.json(
        { error: 'Module ID, scenario ID, and scenario data are required' },
        { status: 400 }
      );
    }

    console.log(`Creating ElevenLabs agent for scenario: ${scenarioId} in module: ${moduleId}`);

    // Check if agent already exists for this scenario
    const existingAgent = await prisma.elevenLabsAgent.findFirst({
      where: {
        moduleId,
        scenarioId,
        isActive: true
      }
    });

    if (existingAgent) {
      return NextResponse.json({ 
        success: true, 
        agent: existingAgent,
        message: 'Agent already exists for this scenario' 
      });
    }

    // Get module data for context
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        quizzes: true,
        procedure: true
      }
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Extract competencies from quiz questions and module content
    const competencies = await extractCompetencies(module);

    // Prepare scenario data for agent creation
    const agentScenarioData = {
      title: scenarioData.title,
      description: scenarioData.description,
      moduleTitle: module.title,
      content: scenarioData.content || module.description,
      competencies,
      passingThreshold: 70, // Default threshold
      difficulty: (scenarioData.difficulty || 'NORMAL') as 'EASY' | 'NORMAL' | 'HARD'
    };

    // Create the ElevenLabs agent
    const agent = await elevenLabsService.createCertificationAgent(
      scenarioId,
      agentScenarioData
    );

    // Store agent metadata in database
    const savedAgent = await prisma.elevenLabsAgent.create({
      data: {
        agentId: agent.agent_id,
        moduleId,
        scenarioId,
        name: agent.name,
        description: agent.description,
        configuration: agent.conversation_config,
        competencies,
        passingThreshold: 70,
        difficulty: agentScenarioData.difficulty,
        isActive: true,
        createdBy: session.user.id
      }
    });

    console.log(`Successfully created ElevenLabs agent ${agent.agent_id} for scenario ${scenarioId}`);

    return NextResponse.json({
      success: true,
      agent: savedAgent,
      elevenLabsAgent: agent
    });

  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create agent', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete agent
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    // Get agent from database
    const agent = await prisma.elevenLabsAgent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete from ElevenLabs
    try {
      await elevenLabsService.deleteAgent(agent.agentId);
    } catch (error) {
      console.warn('Failed to delete agent from ElevenLabs:', error);
      // Continue with database deletion even if ElevenLabs deletion fails
    }

    // Mark as inactive in database
    await prisma.elevenLabsAgent.update({
      where: { id: agentId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}

async function extractCompetencies(module: any): Promise<string[]> {
  const competencies: Set<string> = new Set();

  // Extract from quiz questions
  if (module.quizzes) {
    for (const quiz of module.quizzes) {
      const questions = quiz.questions as any[] || [];
      for (const question of questions) {
        if (question.category) {
          competencies.add(question.category);
        }
        if (question.topic) {
          competencies.add(question.topic);
        }
        // Extract key concepts from question text
        const concepts = extractConceptsFromText(question.question);
        concepts.forEach(concept => competencies.add(concept));
      }
    }
  }

  // Extract from module description and title
  const moduleTexts = [module.title, module.description].filter(Boolean);
  for (const text of moduleTexts) {
    const concepts = extractConceptsFromText(text);
    concepts.forEach(concept => competencies.add(concept));
  }

  // Default competencies if none found
  if (competencies.size === 0) {
    competencies.add('Technical Knowledge');
    competencies.add('Safety Practices');
    competencies.add('Problem Solving');
    competencies.add('Practical Application');
  }

  return Array.from(competencies).slice(0, 8); // Limit to 8 competencies
}

function extractConceptsFromText(text: string): string[] {
  if (!text) return [];
  
  const concepts: string[] = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // Common technical and safety keywords
  const keywordMap: Record<string, string> = {
    'safety': 'Safety Procedures',
    'secure': 'Safety Procedures',
    'risk': 'Risk Assessment',
    'hazard': 'Hazard Recognition',
    'procedure': 'Standard Procedures',
    'process': 'Process Knowledge',
    'equipment': 'Equipment Operation',
    'tool': 'Tool Usage',
    'maintenance': 'Maintenance Procedures',
    'troubleshoot': 'Troubleshooting',
    'problem': 'Problem Solving',
    'quality': 'Quality Control',
    'inspection': 'Inspection Procedures',
    'communication': 'Communication Skills',
    'documentation': 'Documentation',
    'compliance': 'Regulatory Compliance'
  };

  for (const word of words) {
    if (keywordMap[word]) {
      concepts.push(keywordMap[word]);
    }
  }

  return [...new Set(concepts)];
} 