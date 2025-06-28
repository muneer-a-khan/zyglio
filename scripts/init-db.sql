-- Database initialization script for self-hosted Zyglio
-- This script sets up the necessary extensions and configurations

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the match_chunks function for vector similarity search
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  text text,
  similarity float,
  sequence_number int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id::uuid,
    c."documentId"::uuid as document_id,
    c.text,
    1 - (c.embedding <=> query_embedding) as similarity,
    c."sequenceNumber" as sequence_number
  FROM "Chunk" c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON "Chunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON "Chunk" ("documentId");
CREATE INDEX IF NOT EXISTS idx_chunks_sequence ON "Chunk" ("sequenceNumber");

-- Create performance monitoring views
CREATE OR REPLACE VIEW ai_service_health AS
SELECT 
  'database' as service,
  'healthy' as status,
  current_timestamp as last_check;

-- Create a function to clean up old embeddings
CREATE OR REPLACE FUNCTION cleanup_old_embeddings(days_old integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM "Chunk" 
  WHERE "createdAt" < NOW() - INTERVAL '%s days' % days_old
  AND "documentId" IN (
    SELECT id FROM "Document" 
    WHERE "updatedAt" < NOW() - INTERVAL '%s days' % days_old
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zyglio;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zyglio;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO zyglio; 