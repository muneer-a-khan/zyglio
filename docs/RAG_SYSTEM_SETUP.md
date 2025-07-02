# RAG System Setup Guide - Self-Hosted LLM Integration

## 🎯 Overview

This guide provides step-by-step instructions for implementing a complete **Retrieval-Augmented Generation (RAG)** system in Zyglio that works with **self-hosted LLMs**. The current RAG implementation is incomplete and will be rebuilt from scratch.

## 📋 Prerequisites

### Required Infrastructure:
- **PostgreSQL Database** with `pgvector` extension
- **Self-hosted LLM** (Ollama, LocalAI, or similar)
- **Embedding Model** (sentence-transformers, all-MiniLM, etc.)
- **Vector Database** (PostgreSQL with pgvector)

### Required Skills:
- Database management (PostgreSQL)
- Python scripting (for data ingestion)
- API integration
- Docker (optional but recommended)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Document      │───▶│   Text Chunking  │───▶│   Embeddings    │
│   Ingestion     │    │   & Processing   │    │   Generation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vector Store  │◀───│   PostgreSQL     │◀───│   Vector DB     │
│   (pgvector)    │    │   Integration    │    │   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Self-hosted    │◀───│   Query Engine   │◀───│   Similarity    │
│      LLM        │    │   Integration    │    │     Search      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🗄️ Step 1: Database Schema Setup

### 1.1 Add RAG Models to Prisma Schema

Add these models to your `prisma/schema.prisma`:

```prisma
// Document model for storing source documents
model Document {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title       String
  content     String?  // Full document content
  url         String?  // Source URL if applicable
  filePath    String?  // Local file path if uploaded
  sourceType  String   // "pdf", "web", "manual", "procedure"
  broadTopic  String?  // General category/topic
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  
  // Relations
  chunks      Chunk[]
  
  @@index([broadTopic])
  @@index([sourceType])
  @@index([createdAt])
}

// Chunk model for storing text chunks with embeddings
model Chunk {
  id             String                    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  documentId     String                    @db.Uuid
  text           String                    // Chunk text content
  embedding      Unsupported("vector")?    // Vector embedding (1536 dimensions)
  sequenceNumber Int                       // Order within document
  metadata       Json                      @default("{}")
  createdAt      DateTime                  @default(now()) @db.Timestamptz(6)
  
  // Relations
  document       Document                  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
  @@index([sequenceNumber])
}

// RAG Query Log for analytics and debugging
model RagQuery {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  query         String   // Original query
  retrievedDocs Json     // Retrieved document IDs and scores
  response      String?  // Generated response
  userId        String?  @db.Uuid
  sessionId     String?  // Voice interview session ID
  createdAt     DateTime @default(now()) @db.Timestamptz(6)
  
  @@index([userId])
  @@index([sessionId])
  @@index([createdAt])
}
```

### 1.2 Database Migration Commands

```bash
# 1. Add new models to schema
npx prisma db push

# 2. Generate new Prisma client
npx prisma generate

# 3. Run database initialization script
psql $DATABASE_URL -f scripts/init-rag-db.sql
```

## 🔧 Step 2: Database Setup Script

### 2.1 Create RAG Database Initialization Script

Create `scripts/init-rag-db.sql`:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create optimized indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON "Chunk" USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON "Chunk" ("documentId");
CREATE INDEX IF NOT EXISTS idx_chunks_sequence ON "Chunk" ("sequenceNumber");
CREATE INDEX IF NOT EXISTS idx_documents_source ON "Document" ("sourceType");
CREATE INDEX IF NOT EXISTS idx_documents_topic ON "Document" ("broadTopic");

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

-- Hybrid search function (vector + text search)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  text text,
  similarity float,
  text_rank float,
  combined_score float,
  document_title text
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
    ts_rank(to_tsvector('english', c.text), plainto_tsquery('english', query_text)) as text_rank,
    (1 - (c.embedding <=> query_embedding)) * 0.7 + 
    ts_rank(to_tsvector('english', c.text), plainto_tsquery('english', query_text)) * 0.3 as combined_score,
    d.title as document_title
  FROM "Chunk" c
  JOIN "Document" d ON c."documentId" = d.id
  WHERE (1 - (c.embedding <=> query_embedding)) > match_threshold
    OR to_tsvector('english', c.text) @@ plainto_tsquery('english', query_text)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Function to clean up old embeddings
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
    AND "sourceType" = 'temporary'
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
```

## 🤖 Step 3: Self-Hosted LLM Integration

### 3.1 Environment Configuration

Add to your `.env` file:

```env
# Self-hosted LLM Configuration
SELF_HOSTED_LLM_BASE_URL=http://localhost:11434  # Ollama default
SELF_HOSTED_LLM_MODEL=llama2:7b                  # Your chosen model
SELF_HOSTED_EMBEDDING_URL=http://localhost:11435 # Embedding service
SELF_HOSTED_EMBEDDING_MODEL=all-MiniLM-L6-v2     # Embedding model

# RAG Configuration
RAG_CHUNK_SIZE=512                               # Characters per chunk
RAG_CHUNK_OVERLAP=50                             # Overlap between chunks
RAG_SIMILARITY_THRESHOLD=0.7                     # Minimum similarity score
RAG_MAX_RESULTS=5                                # Max chunks to retrieve

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zyglio"
```

### 3.2 Self-Hosted LLM Service

Create `src/lib/self-hosted-llm.ts`:

```typescript
interface SelfHostedLLMConfig {
  baseURL: string;
  model: string;
  embeddingURL: string;
  embeddingModel: string;
}

class SelfHostedLLMService {
  private config: SelfHostedLLMConfig;
  
  constructor() {
    this.config = {
      baseURL: process.env.SELF_HOSTED_LLM_BASE_URL || 'http://localhost:11434',
      model: process.env.SELF_HOSTED_LLM_MODEL || 'llama2:7b',
      embeddingURL: process.env.SELF_HOSTED_EMBEDDING_URL || 'http://localhost:11435',
      embeddingModel: process.env.SELF_HOSTED_EMBEDDING_MODEL || 'all-MiniLM-L6-v2'
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.embeddingURL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        prompt: text
      })
    });
    
    const data = await response.json();
    return data.embedding;
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    const systemPrompt = context 
      ? `Use the following context to answer the question: ${context}`
      : 'You are a helpful assistant.';
      
    const response = await fetch(`${this.config.baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `${systemPrompt}\n\nQuestion: ${prompt}`,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.response;
  }
}

export const selfHostedLLM = new SelfHostedLLMService();
```

## 📊 Step 4: RAG Service Implementation

### 4.1 Create RAG Service

Create `src/lib/rag-service-v2.ts`:

```typescript
import prisma from './prisma';
import { selfHostedLLM } from './self-hosted-llm';

interface RetrievalResult {
  id: string;
  text: string;
  similarity: number;
  documentTitle: string;
  sourceType: string;
}

interface RAGResponse {
  answer: string;
  sources: RetrievalResult[];
  context: string;
}

export class RAGService {
  private chunkSize = parseInt(process.env.RAG_CHUNK_SIZE || '512');
  private chunkOverlap = parseInt(process.env.RAG_CHUNK_OVERLAP || '50');
  private similarityThreshold = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7');
  private maxResults = parseInt(process.env.RAG_MAX_RESULTS || '5');

  // Text chunking function
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += this.chunkSize - this.chunkOverlap) {
      const chunk = text.slice(i, i + this.chunkSize);
      if (chunk.trim()) chunks.push(chunk);
    }
    return chunks;
  }

  // Store document with embeddings
  async ingestDocument(
    title: string,
    content: string,
    sourceType: string,
    broadTopic?: string,
    url?: string
  ): Promise<string> {
    // Create document
    const document = await prisma.document.create({
      data: {
        title,
        content,
        sourceType,
        broadTopic,
        url,
        metadata: { ingestedAt: new Date().toISOString() }
      }
    });

    // Chunk the content
    const chunks = this.chunkText(content);
    
    // Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await selfHostedLLM.generateEmbedding(chunks[i]);
      
      await prisma.chunk.create({
        data: {
          documentId: document.id,
          text: chunks[i],
          embedding: `[${embedding.join(',')}]`,
          sequenceNumber: i,
          metadata: { chunkIndex: i }
        }
      });
    }

    return document.id;
  }

  // Retrieve relevant chunks
  async retrieveRelevantChunks(query: string): Promise<RetrievalResult[]> {
    // Generate query embedding
    const queryEmbedding = await selfHostedLLM.generateEmbedding(query);
    
    // Search for similar chunks
    const results = await prisma.$queryRaw<RetrievalResult[]>`
      SELECT * FROM match_chunks(
        ${`[${queryEmbedding.join(',')}]`}::vector,
        ${this.similarityThreshold},
        ${this.maxResults}
      )
    `;

    return results;
  }

  // Generate RAG response
  async generateResponse(query: string, sessionId?: string): Promise<RAGResponse> {
    // Retrieve relevant chunks
    const retrievedChunks = await this.retrieveRelevantChunks(query);
    
    // Build context from retrieved chunks
    const context = retrievedChunks
      .map(chunk => `Source: ${chunk.documentTitle}\n${chunk.text}`)
      .join('\n\n---\n\n');

    // Generate response using self-hosted LLM
    const answer = await selfHostedLLM.generateResponse(query, context);

    // Log the query for analytics
    await prisma.ragQuery.create({
      data: {
        query,
        retrievedDocs: retrievedChunks.map(c => ({ id: c.id, similarity: c.similarity })),
        response: answer,
        sessionId
      }
    });

    return {
      answer,
      sources: retrievedChunks,
      context
    };
  }

  // Hybrid search (vector + text)
  async hybridSearch(query: string): Promise<RetrievalResult[]> {
    const queryEmbedding = await selfHostedLLM.generateEmbedding(query);
    
    const results = await prisma.$queryRaw<RetrievalResult[]>`
      SELECT * FROM hybrid_search(
        ${query},
        ${`[${queryEmbedding.join(',')}]`}::vector,
        ${this.similarityThreshold},
        ${this.maxResults}
      )
    `;

    return results;
  }
}

export const ragService = new RAGService();
```

### 4.2 API Endpoints

Create `src/app/api/rag/ingest/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { ragService } from '@/lib/rag-service-v2';

export async function POST(request: Request) {
  try {
    const { title, content, sourceType, broadTopic, url } = await request.json();
    
    const documentId = await ragService.ingestDocument(
      title,
      content,
      sourceType,
      broadTopic,
      url
    );

    return NextResponse.json({ 
      success: true, 
      documentId,
      message: 'Document ingested successfully' 
    });
  } catch (error) {
    console.error('RAG ingestion error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest document' },
      { status: 500 }
    );
  }
}
```

Create `src/app/api/rag/query/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { ragService } from '@/lib/rag-service-v2';

export async function POST(request: Request) {
  try {
    const { query, sessionId } = await request.json();
    
    const response = await ragService.generateResponse(query, sessionId);

    return NextResponse.json({ 
      success: true, 
      ...response 
    });
  } catch (error) {
    console.error('RAG query error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
```

## 📄 Step 5: Document Ingestion Pipeline

### 5.1 Python Ingestion Script

Create `scripts/ingest-medical-docs.py`:

```python
import os
import json
import requests
import uuid
from typing import List, Dict
import psycopg2
import PyPDF2
from io import BytesIO
from dotenv import load_dotenv
import logging

load_dotenv()

class MedicalDocumentIngester:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.embedding_url = os.getenv("SELF_HOSTED_EMBEDDING_URL")
        self.embedding_model = os.getenv("SELF_HOSTED_EMBEDDING_MODEL")
        self.chunk_size = int(os.getenv("RAG_CHUNK_SIZE", "512"))
        
    def get_embeddings(self, text: str) -> List[float]:
        """Generate embeddings using self-hosted model"""
        response = requests.post(
            f"{self.embedding_url}/api/embeddings",
            json={"model": self.embedding_model, "prompt": text}
        )
        return response.json()["embedding"]
    
    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks"""
        chunks = []
        for i in range(0, len(text), self.chunk_size - 50):
            chunk = text[i:i + self.chunk_size]
            if chunk.strip():
                chunks.append(chunk)
        return chunks
    
    def ingest_pdf(self, file_path: str, title: str, topic: str):
        """Ingest a PDF document"""
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            content = "\n".join([page.extract_text() for page in reader.pages])
        
        self.ingest_document(title, content, "pdf", topic, file_path)
    
    def ingest_document(self, title: str, content: str, source_type: str, topic: str, url: str = None):
        """Store document and chunks in database"""
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor()
        
        # Create document
        doc_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO "Document" (id, title, content, "sourceType", "broadTopic", url, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (doc_id, title, content, source_type, topic, url))
        
        # Chunk and embed content
        chunks = self.chunk_text(content)
        for i, chunk in enumerate(chunks):
            chunk_id = str(uuid.uuid4())
            embedding = self.get_embeddings(chunk)
            embedding_array = f"[{','.join(map(str, embedding))}]"
            
            cursor.execute("""
                INSERT INTO "Chunk" (id, "documentId", text, embedding, "sequenceNumber", metadata, "createdAt")
                VALUES (%s, %s, %s, %s::vector, %s, %s, CURRENT_TIMESTAMP)
            """, (chunk_id, doc_id, chunk, embedding_array, i, json.dumps({"chunkIndex": i})))
        
        conn.commit()
        conn.close()
        print(f"Ingested: {title} ({len(chunks)} chunks)")

if __name__ == "__main__":
    ingester = MedicalDocumentIngester()
    
    # Example usage
    ingester.ingest_document(
        "Basic Surgical Procedures",
        "Sample medical procedure content...",
        "manual",
        "surgery"
    )
```

### 5.2 Batch Ingestion Script

Create `scripts/batch-ingest.py`:

```python
import os
import glob
from ingest_medical_docs import MedicalDocumentIngester

def batch_ingest_pdfs(directory: str, topic: str):
    """Ingest all PDFs in a directory"""
    ingester = MedicalDocumentIngester()
    
    pdf_files = glob.glob(os.path.join(directory, "*.pdf"))
    
    for pdf_file in pdf_files:
        title = os.path.basename(pdf_file).replace(".pdf", "")
        try:
            ingester.ingest_pdf(pdf_file, title, topic)
            print(f"✅ Ingested: {title}")
        except Exception as e:
            print(f"❌ Failed to ingest {title}: {e}")

if __name__ == "__main__":
    # Usage: python batch-ingest.py
    batch_ingest_pdfs("./medical-docs", "general-surgery")
```

## 🔗 Step 6: Integration with Voice Interview System

### 6.1 Update Voice Interview to Use RAG

Modify voice interview components to use RAG:

```typescript
// In voice interview session
const enhanceQuestionWithRAG = async (baseQuestion: string, context: string) => {
  const ragResponse = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: `${baseQuestion} ${context}`,
      sessionId: sessionId 
    })
  });
  
  const { answer, sources } = await ragResponse.json();
  
  return {
    enhancedQuestion: `${baseQuestion}\n\nContext: ${answer}`,
    sources: sources
  };
};
```

## 🧪 Step 7: Testing & Validation

### 7.1 Test Script

Create `scripts/test-rag-system.py`:

```python
import requests
import json

def test_rag_system():
    base_url = "http://localhost:3000/api/rag"
    
    # Test ingestion
    ingest_response = requests.post(f"{base_url}/ingest", json={
        "title": "Test Medical Procedure",
        "content": "This is a test procedure for cardiac surgery involving bypass techniques...",
        "sourceType": "test",
        "broadTopic": "cardiology"
    })
    print("Ingestion:", ingest_response.json())
    
    # Test query
    query_response = requests.post(f"{base_url}/query", json={
        "query": "What are the key steps in cardiac bypass surgery?"
    })
    print("Query:", query_response.json())

if __name__ == "__main__":
    test_rag_system()
```

## 📊 Step 8: Monitoring & Analytics

### 8.1 RAG Analytics Dashboard

Create monitoring queries:

```sql
-- Most queried topics
SELECT 
  SUBSTRING(query FROM 1 FOR 50) as query_preview,
  COUNT(*) as frequency,
  AVG(array_length(("retrievedDocs"::json)::text[], 1)) as avg_sources
FROM "RagQuery" 
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY SUBSTRING(query FROM 1 FOR 50)
ORDER BY frequency DESC;

-- Query performance
SELECT 
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as query_count,
  AVG(LENGTH(response)) as avg_response_length
FROM "RagQuery"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

## 🚀 Step 9: Deployment Checklist

### 9.1 Pre-deployment Tasks

- [ ] **Database Setup**
  - [ ] pgvector extension enabled
  - [ ] RAG models migrated
  - [ ] Indexes created
  - [ ] Functions deployed

- [ ] **Self-hosted LLM**
  - [ ] Ollama/LocalAI running
  - [ ] Embedding model loaded
  - [ ] API endpoints accessible
  - [ ] Performance tested

- [ ] **Data Ingestion**
  - [ ] Sample documents ingested
  - [ ] Embeddings generated
  - [ ] Vector search working
  - [ ] Query responses validated

- [ ] **Integration Testing**
  - [ ] RAG API endpoints working
  - [ ] Voice interview integration
  - [ ] Context enhancement functional
  - [ ] Error handling implemented

### 9.2 Performance Optimization

- [ ] **Database Tuning**
  - [ ] Vector index optimized
  - [ ] Query plans analyzed
  - [ ] Connection pooling configured

- [ ] **Caching Strategy**
  - [ ] Frequent queries cached
  - [ ] Embedding cache implemented
  - [ ] Response caching enabled

## 🆘 Troubleshooting

### Common Issues:

1. **pgvector Extension Error**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Embedding Dimension Mismatch**
   - Ensure all embeddings use same dimension (1536 for text-embedding-ada-002)

3. **Self-hosted LLM Connection**
   - Check firewall settings
   - Verify model is loaded
   - Test endpoint manually

4. **Low Similarity Scores**
   - Adjust `RAG_SIMILARITY_THRESHOLD`
   - Check embedding quality
   - Review document preprocessing

## 🔄 Maintenance

### Regular Tasks:
- **Weekly**: Clean up old embeddings
- **Monthly**: Reindex vector tables
- **Quarterly**: Update embedding models
- **As needed**: Retrain on new documents

---

## 📞 Support

For technical issues:
1. Check logs in `scripts/ingest.log`
2. Verify database connectivity
3. Test self-hosted LLM endpoints
4. Review embedding generation

**Next Steps**: Once this system is implemented, you can enhance it with:
- Multi-modal embeddings (images, videos)
- Semantic chunking strategies
- Advanced retrieval algorithms
- Real-time document updates 