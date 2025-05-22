import os
import psycopg2
import logging
import uuid
import json
import re
from psycopg2.extras import Json
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get database URL from environment and clean it
raw_db_url = os.getenv("DATABASE_URL")
# Remove pgbouncer parameter which causes issues
if raw_db_url and "pgbouncer" in raw_db_url:
    DATABASE_URL = re.sub(r'\?pgbouncer=true', '', raw_db_url)
else:
    DATABASE_URL = raw_db_url

def test_db_connection():
    """Test connection to the database and check tables"""
    try:
        print(f"Connecting to database with URL: {DATABASE_URL[:20]}...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        
        with conn.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"Connected to PostgreSQL: {version[0]}")
            
            # Check if vector extension is enabled
            cursor.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
            if cursor.fetchone():
                print("pgvector extension is enabled")
            else:
                print("WARNING: pgvector extension is NOT enabled!")
                
            # Check if our tables exist
            cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Document');")
            if cursor.fetchone()[0]:
                print("Document table exists")
                
                # Count documents
                cursor.execute('SELECT COUNT(*) FROM "Document";')
                count = cursor.fetchone()[0]
                print(f"Current document count: {count}")
                
                # Show schema
                cursor.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'Document';
                """)
                print("Document table schema:")
                for col in cursor.fetchall():
                    print(f"  - {col[0]}: {col[1]}")
            else:
                print("WARNING: Document table does NOT exist!")
                
            cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Chunk');")
            if cursor.fetchone()[0]:
                print("Chunk table exists")
                
                # Count chunks
                cursor.execute('SELECT COUNT(*) FROM "Chunk";')
                count = cursor.fetchone()[0]
                print(f"Current chunk count: {count}")
                
                # Show schema
                cursor.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'Chunk';
                """)
                print("Chunk table schema:")
                for col in cursor.fetchall():
                    print(f"  - {col[0]}: {col[1]}")
            else:
                print("WARNING: Chunk table does NOT exist!")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Database test failed: {e}")
        return False

def insert_test_document():
    """Insert a test document and chunk into the database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        
        # Create test document
        doc_id = str(uuid.uuid4())
        document = {
            "title": "Test Document",
            "url": "https://example.com/test",
            "broadTopic": "General surgery",
            "sourceType": "test",
            "content": "This is a test document to verify database insertion is working properly."
        }
        
        with conn.cursor() as cursor:
            # Insert document
            cursor.execute(
                """
                INSERT INTO "Document" (id, title, url, "broadTopic", "sourceType", content, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
                """,
                (
                    doc_id,
                    document['title'],
                    document['url'],
                    document['broadTopic'],
                    document['sourceType'],
                    document.get('content', None)
                )
            )
            
            print(f"Test document inserted with ID: {doc_id}")
            
            # Insert test chunk
            chunk_id = str(uuid.uuid4())
            chunk_text = document['content']
            # Create vector of appropriate dimension (1536 for DeepSeek)
            mock_embedding = [0.1] * 1536
            embedding_array = f"[{','.join(map(str, mock_embedding))}]"
            
            cursor.execute(
                """
                INSERT INTO "Chunk" (
                    id, "documentId", text, embedding, "sequenceNumber", 
                    metadata, "createdAt", "updatedAt"
                )
                VALUES (%s, %s, %s, %s::vector, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (
                    chunk_id,
                    doc_id,
                    chunk_text,
                    embedding_array,
                    0,
                    Json({"position": 0})
                )
            )
            
            print(f"Test chunk inserted with ID: {chunk_id}")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Error inserting test document: {e}")
        return False

if __name__ == "__main__":
    print("Testing database connection...")
    if test_db_connection():
        print("\nInserting test document...")
        insert_test_document()
        print("\nVerifying insertion...")
        test_db_connection()
    else:
        print("Database connection failed. Check your DATABASE_URL environment variable.") 