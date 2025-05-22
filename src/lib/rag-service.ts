import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Types
export interface SessionContext {
  sessionId: string;
  initialContext: string;
  conversationHistory: ConversationEntry[];
}

export interface ConversationEntry {
  role: 'ai' | 'user';
  content: string;
}

export interface RAGResult {
  context: string;
  sources: Array<{
    title: string;
    url: string;
    broadTopic: string;
  }>;
}

/**
 * Generate embeddings for text using DeepSeek
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await deepseek.embeddings.create({
      model: "deepseek-embed",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Retrieve relevant context for a query
 */
export async function retrieveRelevantContext(
  query: string, 
  maxChunks: number = 10
): Promise<RAGResult> {
  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    const embeddingString = `[${embedding.join(',')}]`;
    
    // Query the database using vector similarity search
    const { data: chunks, error } = await supabase.rpc('match_chunks', {
      query_embedding: embeddingString,
      match_threshold: 0.7,
      match_count: maxChunks
    });
    
    if (error) {
      console.error('Error retrieving chunks:', error);
      throw new Error('Failed to retrieve context');
    }
    
    if (!chunks || chunks.length === 0) {
      return { 
        context: "No relevant information found.",
        sources: []
      };
    }
    
    // Collect document IDs to fetch their metadata
    const documentIds = [...new Set(chunks.map(chunk => chunk.document_id))];
    
    // Fetch document metadata
    const { data: documents, error: docError } = await supabase
      .from('Document')
      .select('id, title, url, "broadTopic"')
      .in('id', documentIds);
    
    if (docError) {
      console.error('Error retrieving documents:', docError);
    }
    
    const documentMap = new Map();
    documents?.forEach(doc => {
      documentMap.set(doc.id, {
        title: doc.title,
        url: doc.url,
        broadTopic: doc.broadTopic
      });
    });
    
    // Combine chunks into a single context string
    const context = chunks
      .map(chunk => chunk.text)
      .join('\n\n');
    
    // Get unique sources
    const sources = Array.from(new Set(chunks.map(chunk => chunk.document_id)))
      .map(id => documentMap.get(id))
      .filter(Boolean);
    
    return { context, sources };
  } catch (error) {
    console.error('Error in retrieveRelevantContext:', error);
    throw new Error('Failed to retrieve context from RAG system');
  }
}

/**
 * Store context for a procedure in the session
 */
export async function storeUserProcedureContext(
  procedureId: string, 
  context: string
): Promise<string> {
  const sessionId = `procedure_${procedureId}_${Date.now()}`;
  
  // You can implement session storage using Redis, database, or in-memory
  // For now, let's use a simple in-memory store with Map
  // This will need to be replaced with a database solution in production
  
  const sessionData: SessionContext = {
    sessionId,
    initialContext: context,
    conversationHistory: []
  };
  
  // Store in a global map (replace with database in production)
  if (!global.sessionStore) {
    global.sessionStore = new Map();
  }
  global.sessionStore.set(sessionId, sessionData);
  
  return sessionId;
}

/**
 * Retrieve a session by ID
 */
export async function getSession(sessionId: string): Promise<SessionContext | null> {
  if (!global.sessionStore) {
    return null;
  }
  
  return global.sessionStore.get(sessionId) || null;
}

/**
 * Update conversation history in a session
 */
export async function updateConversationHistory(
  sessionId: string,
  entry: ConversationEntry
): Promise<boolean> {
  if (!global.sessionStore) {
    return false;
  }
  
  const session = global.sessionStore.get(sessionId);
  if (!session) {
    return false;
  }
  
  session.conversationHistory.push(entry);
  global.sessionStore.set(sessionId, session);
  
  return true;
}

/**
 * Create a new interview session with initial context
 */
export async function createSession(
  sessionId: string, 
  sessionData: {
    procedureId: string;
    initialContext: string;
    conversationHistory: Array<{role: 'ai' | 'user', content: string}>;
  }
): Promise<string> {
  try {
    // Store the session in the global sessions Map
    sessions.set(sessionId, sessionData);
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
} 