# Next Steps: Self-Hosted LLM + Database Setup

## 🎯 Immediate Action Items

You are about to start self-hosting. Here are the **exact next steps** to connect your local database to your self-hosted LLM and implement RAG.

---

## 📋 Phase 1: Database Preparation (YOU - Before Self-Hosting)

### 1.1 Clean Up Existing RAG Code
**Time: 15 minutes**

```bash
# Remove broken RAG implementations
rm src/lib/rag-service.ts
rm src/lib/agents/rag-agent.ts
rm src/app/api/rag/generate-context/route.ts
rm scripts/ingest_data.py
rm scripts/ingest_test.py
```

### 1.2 Add RAG Models to Database Schema
**Time: 10 minutes**

Add these models to `prisma/schema.prisma`:

```prisma
// Add at the end of your schema file
model Document {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title       String
  content     String?
  url         String?
  filePath    String?
  sourceType  String   // "pdf", "web", "manual", "procedure"
  broadTopic  String?
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  chunks      Chunk[]
  
  @@index([broadTopic])
  @@index([sourceType])
  @@index([createdAt])
}

model Chunk {
  id             String                    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  documentId     String                    @db.Uuid
  text           String
  embedding      Unsupported("vector")?    // 1536 dimensions
  sequenceNumber Int
  metadata       Json                      @default("{}")
  createdAt      DateTime                  @default(now()) @db.Timestamptz(6)
  document       Document                  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
  @@index([sequenceNumber])
}

model RagQuery {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  query         String
  retrievedDocs Json
  response      String?
  userId        String?  @db.Uuid
  sessionId     String?
  createdAt     DateTime @default(now()) @db.Timestamptz(6)
  
  @@index([userId])
  @@index([sessionId])
  @@index([createdAt])
}
```

### 1.3 Create RAG Database Setup Script
**Time: 5 minutes**

Create `scripts/init-rag-db.sql`:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for vector search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON "Chunk" USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  text text,
  similarity float,
  sequence_number int,
  document_title text,
  source_type text
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
    c."sequenceNumber" as sequence_number,
    d.title as document_title,
    d."sourceType" as source_type
  FROM "Chunk" c
  JOIN "Document" d ON c."documentId" = d.id
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 1.4 Apply Database Changes
**Time: 5 minutes**

```bash
# Push schema changes
npx prisma db push

# Generate new client
npx prisma generate

# Apply RAG database setup
psql $DATABASE_URL -f scripts/init-rag-db.sql
```

---

## 🤖 Phase 2: During Self-Hosting Setup

### 2.1 Install Ollama (Your Self-Hosted LLM)
**Time: 20 minutes**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a good model for medical content
ollama pull llama2:7b

# Pull an embedding model
ollama pull nomic-embed-text
```

### 2.2 Test LLM Installation

```bash
# Test basic generation
ollama run llama2:7b "What are the key steps in surgical procedures?"

# Test embedding (may need different syntax depending on version)
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test embedding"
}'
```

### 2.3 Add Environment Variables

Add to your `.env` file:

```env
# Self-hosted LLM Configuration
SELF_HOSTED_LLM_BASE_URL=http://localhost:11434
SELF_HOSTED_LLM_MODEL=llama2:7b
SELF_HOSTED_EMBEDDING_URL=http://localhost:11434
SELF_HOSTED_EMBEDDING_MODEL=nomic-embed-text

# RAG Configuration
RAG_CHUNK_SIZE=512
RAG_CHUNK_OVERLAP=50
RAG_SIMILARITY_THRESHOLD=0.7
RAG_MAX_RESULTS=5
```

---

## 👥 Phase 3: Tasks for Another Developer

**If someone else will handle the database/RAG implementation, give them this:**

### 3.1 Required Skills
- TypeScript/Node.js
- PostgreSQL with pgvector
- REST API development
- Basic understanding of embeddings/vector search

### 3.2 Implementation Tasks

**Task A: Self-Hosted LLM Service (2 hours)**
Create `src/lib/self-hosted-llm.ts`:
- HTTP client for Ollama API
- Functions for text generation and embeddings
- Error handling and retries
- See full implementation in `docs/RAG_SYSTEM_SETUP.md`

**Task B: RAG Service (3 hours)**
Create `src/lib/rag-service-v2.ts`:
- Document ingestion with text chunking
- Embedding generation and storage
- Vector similarity search
- Response generation with context
- See full implementation in `docs/RAG_SYSTEM_SETUP.md`

**Task C: API Endpoints (1 hour)**
Create these endpoints:
- `POST /api/rag/ingest` - Document ingestion
- `POST /api/rag/query` - RAG queries
- See full implementation in `docs/RAG_SYSTEM_SETUP.md`

**Task D: Integration (2 hours)**
- Update voice interview to use RAG
- Enhance procedure creation with context
- Add RAG to training module generation

### 3.3 Testing Requirements

The developer should create and run:
1. **Unit Tests**: Test each RAG service function
2. **Integration Tests**: Test full ingestion→query flow
3. **Performance Tests**: Measure embedding generation time
4. **API Tests**: Verify all endpoints work correctly

### 3.4 Deliverables

**Code Files:**
- `src/lib/self-hosted-llm.ts`
- `src/lib/rag-service-v2.ts`
- `src/app/api/rag/ingest/route.ts`
- `src/app/api/rag/query/route.ts`
- `scripts/ingest-medical-docs.py`

**Documentation:**
- API documentation with example requests
- Configuration guide for different LLM models
- Troubleshooting guide for common issues

**Tests:**
- Test that document ingestion works
- Test that vector search returns relevant results
- Test that LLM integration generates good responses

---

## 🚀 Phase 4: After Implementation

### 4.1 Testing the Complete System

```bash
# Test 1: Ingest a test document
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cardiac Surgery Basics",
    "content": "Cardiac surgery involves opening the chest and heart...",
    "sourceType": "manual",
    "broadTopic": "cardiology"
  }'

# Test 2: Query the RAG system
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the key steps in cardiac surgery?"
  }'
```

### 4.2 Integration with Voice Interviews

Once RAG is working, update your voice interview system:

```typescript
// In voice interview components, replace existing RAG calls with:
const ragResponse = await fetch('/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    query: `Generate contextual questions about: ${procedureTitle}`,
    sessionId: sessionId 
  })
});
```

---

## 📊 Expected Timeline

**For You (Pre-Self-Hosting):**
- Database cleanup: 30 minutes
- Schema updates: 15 minutes
- **Total: 45 minutes**

**For Another Developer:**
- LLM service: 2 hours
- RAG service: 3 hours  
- API endpoints: 1 hour
- Integration: 2 hours
- Testing: 2 hours
- **Total: 10 hours**

**After Self-Hosting:**
- System testing: 1 hour
- Voice interview integration: 2 hours
- **Total: 3 hours**

---

## 🎯 Success Criteria

✅ **Phase 1 Complete When:**
- Database has Document/Chunk/RagQuery models
- pgvector extension enabled
- Vector similarity function created
- Prisma client regenerated

✅ **Phase 2 Complete When:**
- Ollama running locally
- Can generate text responses
- Can generate embeddings
- Environment variables configured

✅ **Phase 3 Complete When:**
- Can ingest documents via API
- Can query documents and get relevant responses
- RAG integrated with voice interviews
- Performance is acceptable (<2s response time)

✅ **System Ready When:**
- Voice interviews use RAG for context
- Training modules enhanced with RAG
- Procedure creation benefits from context
- Analytics show RAG is being used

---

## 🆘 Common Issues & Solutions

### Issue: pgvector Extension Not Found
```sql
-- Install pgvector (Ubuntu/Debian)
sudo apt install postgresql-14-pgvector

-- Then in psql:
CREATE EXTENSION vector;
```

### Issue: Ollama Not Responding
```bash
# Check if running
ollama ps

# Restart service
systemctl restart ollama

# Check logs
journalctl -u ollama
```

### Issue: Embeddings Wrong Dimension
- Verify embedding model matches expected dimensions
- Check if model supports the embedding API
- Consider using different model (all-MiniLM-L6-v2 = 384 dim)

### Issue: Slow Vector Search
```sql
-- Tune vector index
DROP INDEX idx_chunks_embedding;
CREATE INDEX idx_chunks_embedding 
ON "Chunk" USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 200);  -- Increase lists for better performance
```

---

**Remember**: The goal is to replace your current broken RAG system with a working one that uses your self-hosted LLM. Focus on getting basic functionality working first, then optimize for performance. 