import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ConversationEntry, getSession, updateConversationHistory } from './session-service';
import prisma from './prisma';

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize DeepSeek client (alternative for certain tasks)
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Export the getSession and updateConversationHistory functions from session-service
export { getSession, updateConversationHistory };

/**
 * Generate embeddings for the given text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use the OpenAI embedding API to get vector embeddings
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Retrieve relevant context from the document vector store
 */
export async function retrieveRelevantContext(query: string, limit: number = 3): Promise<{ context: string }> {
  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Query PostgreSQL/Supabase with vector search
    const { data: chunks, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit
    });
    
    if (error) {
      console.error('Error retrieving context:', error);
      return { context: '' };
    }
    
    if (!chunks || chunks.length === 0) {
      return { context: '' };
    }
    
    // Format retrieved chunks into coherent context
    const context = chunks
      .map((chunk: { text: string }) => chunk.text)
      .join('\n\n');
    
    return { context };
  } catch (error) {
    console.error('Error in retrieveRelevantContext:', error);
    
    // Provide a fallback if vector search fails
    return { context: '' };
  }
}

/**
 * Fallback retrieval method using keyword-based search
 */
export async function retrieveByKeywords(query: string, limit: number = 5): Promise<{ context: string }> {
  try {
    // Extract keywords from the query using DeepSeek
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: 'system', content: 'Extract the 3-5 most important keywords from the text, output only comma-separated keywords without explanation.' },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 50
    });
    
    const keywords = completion.choices[0].message.content?.split(',').map(k => k.trim()) || [];
    
    if (keywords.length === 0) {
      return { context: '' };
    }
    
    // Search for documents with these keywords
    const { data: chunks, error } = await supabase
      .from('chunks')
      .select('*')
      .textSearch('text', keywords.join(' | '))
      .limit(limit);
    
    if (error || !chunks || chunks.length === 0) {
      return { context: '' };
    }
    
    // Format the chunks into a coherent context
    const context = chunks
      .map((chunk: { text: string }) => chunk.text)
      .join('\n\n');
    
    return { context };
  } catch (error) {
    console.error('Error in retrieveByKeywords:', error);
    return { context: '' };
  }
} 