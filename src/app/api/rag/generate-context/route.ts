import { NextResponse } from 'next/server';
import { retrieveRelevantContext, storeUserProcedureContext } from '@/lib/rag-service';
import { verifySession } from '@/lib/auth'; // Assuming you have a session verification function

/**
 * API endpoint to generate initial context for a procedure
 * POST /api/rag/generate-context
 */
export async function POST(request: Request) {
  try {
    // Basic auth verification - replace with your auth logic
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request data
    const { procedureId, taskDefinition } = await request.json();

    if (!procedureId || !taskDefinition) {
      return NextResponse.json(
        { error: 'Missing required fields: procedureId and taskDefinition' },
        { status: 400 }
      );
    }

    // Build a search query from task definition
    const { title, description, goal } = taskDefinition;
    const searchQuery = `
      ${title}. 
      ${description ? description : ''}
      ${goal ? `Goal: ${goal}` : ''}
    `.trim();

    // Get relevant context from RAG system
    const ragResult = await retrieveRelevantContext(searchQuery, 10);
    
    // Store the context in a session
    const sessionId = await storeUserProcedureContext(procedureId, ragResult.context);

    return NextResponse.json({
      success: true,
      sessionId,
      context: ragResult.context,
      sources: ragResult.sources
    });

  } catch (error) {
    console.error('Error in generate-context API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to generate context', details: errorMessage },
      { status: 500 }
    );
  }
} 