-- Create function for vector similarity search
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