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
                print("You need to run: CREATE EXTENSION IF NOT EXISTS vector;")
                
            # Check for Document table with case sensitivity in mind
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'Document'
                );
            """)
            document_exists = cursor.fetchone()[0]
            
            # If not found, check for lowercase variant
            if not document_exists:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = 'document'
                    );
                """)
                document_exists = cursor.fetchone()[0]
                document_name = "document" if cursor.fetchone() else "Document"
            else:
                document_name = "Document"
                
            if document_exists:
                print(f"{document_name} table exists")
                
                # Count documents
                cursor.execute(f'SELECT COUNT(*) FROM "{document_name}";')
                count = cursor.fetchone()[0]
                print(f"Current document count: {count}")
                
                # Show schema
                cursor.execute(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{document_name.lower()}';
                """)
                print(f"{document_name} table schema:")
                for col in cursor.fetchall():
                    print(f"  - {col[0]}: {col[1]}")
            else:
                print("WARNING: Document table does NOT exist!")
                
            # Check for Chunk table with case sensitivity in mind
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'Chunk'
                );
            """)
            chunk_exists = cursor.fetchone()[0]
            
            # If not found, check for lowercase variant
            if not chunk_exists:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = 'chunk'
                    );
                """)
                chunk_exists = cursor.fetchone()[0]
                chunk_name = "chunk" if cursor.fetchone() else "Chunk"
            else:
                chunk_name = "Chunk"
                
            if chunk_exists:
                print(f"{chunk_name} table exists")
                
                # Count chunks
                cursor.execute(f'SELECT COUNT(*) FROM "{chunk_name}";')
                count = cursor.fetchone()[0]
                print(f"Current chunk count: {count}")
                
                # Show schema
                cursor.execute(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{chunk_name.lower()}';
                """)
                print(f"{chunk_name} table schema:")
                for col in cursor.fetchall():
                    print(f"  - {col[0]}: {col[1]}")
            else:
                print("WARNING: Chunk table does NOT exist!")
        
        conn.close()
        return True, document_name if document_exists else "Document", chunk_name if chunk_exists else "Chunk"
    except Exception as e:
        print(f"Database test failed: {e}")
        return False, "Document", "Chunk"

def insert_test_document(document_name="Document", chunk_name="Chunk"):
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
                f"""
                INSERT INTO "{document_name}" (id, title, url, "broadTopic", "sourceType", content, "createdAt", "updatedAt")
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
            
            # Check if pgvector extension is enabled before attempting to insert
            cursor.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
            if not cursor.fetchone():
                print("ERROR: pgvector extension is not enabled. Cannot insert vector data.")
                print("You need to run: CREATE EXTENSION IF NOT EXISTS vector;")
                return False
                
            try:
                cursor.execute(
                    f"""
                    INSERT INTO "{chunk_name}" (
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
            except psycopg2.errors.UndefinedObject as e:
                print(f"ERROR: Vector type not defined: {e}")
                print("Make sure pgvector is installed and the vector extension is enabled.")
                return False
        
        conn.close()
        return True
    except Exception as e:
        print(f"Error inserting test document: {e}")
        return False

if __name__ == "__main__":
    print("Testing database connection...")
    success, document_name, chunk_name = test_db_connection()
    if success:
        print("\nInserting test document...")
        if insert_test_document(document_name, chunk_name):
            print("\nVerifying insertion...")
            test_db_connection()
        else:
            print("Failed to insert test document. Check errors above.")
    else:
        print("Database connection failed. Check your DATABASE_URL environment variable.") 