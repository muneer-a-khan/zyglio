import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySession } from '@/lib/auth';
import { createSession } from '@/lib/session-service';
import { enhanceInitialContext } from '@/lib/agents/rag-agent';

/**
 * API endpoint to generate initial context for voice interview
 * POST /api/rag/generate-context
 */
export async function POST(request: Request) {
  try {
    // Basic auth verification
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request data
    const data = await request.json();
    const { procedureId, taskDefinition } = data;
    
    if (!procedureId || !taskDefinition) {
      return NextResponse.json(
        { error: 'Missing required fields: procedureId and taskDefinition' },
        { status: 400 }
      );
    }

    // Generate a session ID
    const sessionId = uuidv4();
    
    // Use DeepSeek to generate context based on the task definition
    const ragResult = await enhanceInitialContext(taskDefinition);
    
    // Create a combined context with both the enhanced context and additional information
    const combinedContext = `
# Task Definition
${taskDefinition.title}
${taskDefinition.description ? `Description: ${taskDefinition.description}` : ''}
${taskDefinition.goal ? `Goal: ${taskDefinition.goal}` : ''}

# Enhanced Procedure Context
${ragResult.enhancedContext}

# Key Topics to Explore
${ragResult.suggestedTopics.map((topic, i) => `${i+1}. ${topic}`).join('\n')}

# Relevant Factors
${ragResult.relevantFactors.map((factor, i) => `${i+1}. ${factor}`).join('\n')}
`;

    // Create session with the initial context
    await createSession(sessionId, {
      procedureId,
      initialContext: combinedContext,
      conversationHistory: []
    });
    
    return NextResponse.json({
      success: true,
      sessionId,
      initialContext: combinedContext
    });

  } catch (error) {
    console.error('Error generating context:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to generate context', details: errorMessage },
      { status: 500 }
    );
  }
} 