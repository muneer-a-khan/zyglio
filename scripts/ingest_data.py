import os
import json
import requests
import time
import re
import uuid
import random
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import Json
from scholarly import scholarly
from bs4 import BeautifulSoup
import PyPDF2
from io import BytesIO
import xml.etree.ElementTree as ET
from ratelimit import limits, sleep_and_retry
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ingest.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configuration
CHUNK_SIZE = 500  # Number of characters per chunk
CHUNK_OVERLAP = 100  # Overlap between chunks
MAX_DOCUMENTS_PER_TOPIC = 100  # Increased to get top 100 per surgical field
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
NCBI_API_KEY = os.getenv("NCBI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# Rate limiting for NCBI API - 10 requests per second
NCBI_RATE_LIMIT = 10
NCBI_PERIOD = 1  # 1 second

# List of user agents to rotate
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11.5; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (iPad; CPU OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1'
]

# Connect to database
def get_db_connection():
    try:
        logger.info(f"Connecting to database with URL: {DATABASE_URL[:20]}...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        logger.info("Database connection established successfully")
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

# Test database connection
def test_db_connection():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            logger.info(f"Connected to PostgreSQL: {version[0]}")
            
            # Check if vector extension is enabled
            cursor.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
            if cursor.fetchone():
                logger.info("pgvector extension is enabled")
            else:
                logger.warning("pgvector extension is NOT enabled!")
                
            # Check if our tables exist
            cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Document');")
            if cursor.fetchone()[0]:
                logger.info("Document table exists")
            else:
                logger.warning("Document table does NOT exist!")
                
            cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Chunk');")
            if cursor.fetchone()[0]:
                logger.info("Chunk table exists")
            else:
                logger.warning("Chunk table does NOT exist!")
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return False

# DeepSeek Embedding API
def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts using DeepSeek API"""
    if not DEEPSEEK_API_KEY:
        logger.error("DEEPSEEK_API_KEY environment variable not set")
        raise ValueError("DEEPSEEK_API_KEY environment variable not set")
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # DeepSeek API endpoint for embeddings
    url = "https://api.deepseek.com/v1/embeddings"  
    
    # Process in batches to avoid API limitations
    all_embeddings = []
    batch_size = 10
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        
        try:
            logger.info(f"Generating embeddings for batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size}")
            response = requests.post(
                url,
                headers=headers,
                json={"model": "deepseek-embed", "input": batch}
            )
            response.raise_for_status()
            
            # Extract embeddings from response
            result = response.json()
            embeddings = [item["embedding"] for item in result["data"]]
            all_embeddings.extend(embeddings)
            
            # Respect rate limits
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            # Return empty embeddings on error
            all_embeddings.extend([[0.0] * 1536] * len(batch))
    
    return all_embeddings

# PubMed API Functions
@sleep_and_retry
@limits(calls=NCBI_RATE_LIMIT, period=NCBI_PERIOD)
def fetch_pubmed_articles(topic: str) -> List[Dict[str, Any]]:
    """Fetch articles from PubMed API"""
    logger.info(f"Fetching PubMed articles for: {topic}")
    
    # Base URL for NCBI E-utilities
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    
    # Search parameters
    search_params = {
        "db": "pubmed",
        "term": f"{topic}[Title/Abstract]",
        "retmode": "json",
        "retmax": MAX_DOCUMENTS_PER_TOPIC,
        "sort": "relevance",
    }
    
    # Add API key if available
    if NCBI_API_KEY:
        search_params["api_key"] = NCBI_API_KEY
    
    try:
        # Search for articles
        search_url = f"{base_url}/esearch.fcgi"
        search_response = requests.get(search_url, params=search_params)
        search_response.raise_for_status()
        search_data = search_response.json()
        
        # Get list of PMIDs
        pmids = search_data.get("esearchresult", {}).get("idlist", [])
        
        if not pmids:
            logger.warning(f"No PubMed articles found for: {topic}")
            return []
        
        logger.info(f"Found {len(pmids)} PubMed articles for: {topic}")
        
        # Fetch article details
        articles = []
        for pmid in pmids:
            try:
                fetch_params = {
                    "db": "pubmed",
                    "id": pmid,
                    "retmode": "xml",
                }
                
                # Add API key if available
                if NCBI_API_KEY:
                    fetch_params["api_key"] = NCBI_API_KEY
                
                # Fetch article details
                fetch_url = f"{base_url}/efetch.fcgi"
                fetch_response = requests.get(fetch_url, params=fetch_params)
                fetch_response.raise_for_status()
                
                # Parse XML
                root = ET.fromstring(fetch_response.text)
                
                # Process each article
                for article in root.findall(".//PubmedArticle"):
                    title_elem = article.find(".//ArticleTitle")
                    title = title_elem.text if title_elem is not None else "No title"
                    
                    abstract_elem = article.find(".//AbstractText")
                    abstract = abstract_elem.text if abstract_elem is not None else ""
                    
                    # Handle abstract with multiple sections
                    if not abstract:
                        abstract_sections = article.findall(".//AbstractText")
                        if abstract_sections:
                            abstract = " ".join([
                                section.text for section in abstract_sections 
                                if section.text is not None
                            ])
                    
                    if abstract:
                        logger.info(f"Retrieved PubMed article: {title}")
                        articles.append({
                            "title": title,
                            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                            "content": abstract,
                            "sourceType": "pubmed",
                            "broadTopic": topic
                        })
                
                # Respect rate limits
                time.sleep(0.1)
            
            except Exception as e:
                logger.error(f"Error fetching PubMed article {pmid}: {e}")
                continue
                
        return articles
        
    except Exception as e:
        logger.error(f"Error searching PubMed: {e}")
        return []

def fetch_google_scholar(topic: str) -> List[Dict[str, Any]]:
    """Fetch articles from Google Scholar"""
    logger.warning("Google Scholar search is disabled due to rate limitations")
    return []

def fetch_web_search(topic: str) -> List[Dict[str, Any]]:
    """Fetch articles from web search"""
    logger.warning("Web search is disabled due to rate limitations")
    return []

# Text processing
def split_text_into_chunks(text: str) -> List[str]:
    """Split a text into smaller chunks with overlap"""
    if not text:
        return []
    
    chunks = []
    for i in range(0, len(text), CHUNK_SIZE - CHUNK_OVERLAP):
        # Ensure we don't go beyond text length
        end_idx = min(i + CHUNK_SIZE, len(text))
        
        # Extract chunk
        chunk = text[i:end_idx]
        
        # Only add non-empty chunks
        if chunk.strip():
            chunks.append(chunk)
            
    return chunks

def fetch_document_content(url: str) -> Optional[str]:
    """Fetch document content based on URL type"""
    if not url:
        return None
    
    if url.endswith(".pdf"):
        return fetch_pdf_content(url)
    else:
        return fetch_html_content(url)

def fetch_pdf_content(url: str) -> Optional[str]:
    """Fetch and parse PDF content"""
    try:
        logger.info(f"Fetching PDF from {url}")
        headers = {'User-Agent': random.choice(USER_AGENTS)}
        
        # Add retry logic for resilience
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.get(url, headers=headers, timeout=20)
                response.raise_for_status()
                break
            except requests.exceptions.RequestException as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Retry {attempt + 1}/{max_retries} for {url} after error: {e}")
                time.sleep(2 * (attempt + 1))
        
        # Read PDF content
        pdf_content = BytesIO(response.content)
        reader = PyPDF2.PdfReader(pdf_content)
        
        # Extract text from all pages
        text = ""
        for page_num in range(len(reader.pages)):
            text += reader.pages[page_num].extract_text() + " "
        
        # Clean up text
        text = re.sub(r'\s+', ' ', text).strip()
        
        if not text:
            logger.warning(f"No text extracted from PDF at {url}")
            return None
            
        return text
    except Exception as e:
        logger.error(f"Error fetching PDF from {url}: {e}")
        return None

def fetch_html_content(url: str) -> Optional[str]:
    """Fetch and parse HTML content with rotating user agents and retries"""
    # Add retry logic for resilience
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            # Use a random user agent
            headers = {
                'User-Agent': random.choice(USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/',
                'DNT': '1',
            }
            
            logger.info(f"Fetching HTML from {url} (attempt {attempt+1}/{max_retries})")
            response = requests.get(url, headers=headers, timeout=15)
            
            # Handle 403 forbidden or other error status
            if response.status_code == 403:
                logger.warning(f"403 Forbidden error for {url} - skipping")
                return None
            
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove non-content elements
            for element in soup(['script', 'style', 'nav', 'header', 'footer', 'ads']):
                element.extract()
            
            # Extract text
            text = soup.get_text(separator=' ', strip=True)
            
            # Clean up whitespace
            text = re.sub(r'\s+', ' ', text).strip()
            
            if not text:
                logger.warning(f"No text extracted from {url}")
                return None
                
            return text
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                logger.error(f"Error fetching HTML from {url} after {max_retries} attempts: {e}")
                return None
            logger.warning(f"Retry {attempt + 1}/{max_retries} for {url} after error: {e}")
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.error(f"Error fetching HTML from {url}: {e}")
            return None

# Database operations
def store_document(conn, document: Dict[str, Any]) -> str:
    """Store a document in the database and return its ID"""
    cursor = conn.cursor()
    
    document_id = str(uuid.uuid4())
    try:
        logger.info(f"Storing document: {document['title'][:50]}...")
        cursor.execute(
            """
            INSERT INTO "Document" (id, title, url, "broadTopic", "sourceType", content, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
            """,
            (
                document_id,
                document['title'],
                document['url'],
                document['broadTopic'],
                document['sourceType'],
                document.get('content', None)
            )
        )
        
        conn.commit()
        logger.info(f"Document stored with ID: {document_id}")
    except Exception as e:
        logger.error(f"Error storing document: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        
    return document_id

def store_chunks(conn, document_id: str, chunks: List[str], embeddings: List[List[float]]):
    """Store text chunks and their embeddings in the database"""
    cursor = conn.cursor()
    
    try:
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = str(uuid.uuid4())
            embedding_array = f"[{','.join(map(str, embedding))}]"
            
            # Store the chunk
            logger.info(f"Storing chunk {i+1}/{len(chunks)} for document {document_id}")
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
                    document_id,
                    chunk,
                    embedding_array,
                    i,
                    Json({"position": i})
                )
            )
        
        conn.commit()
        logger.info(f"All {len(chunks)} chunks stored for document {document_id}")
    except Exception as e:
        logger.error(f"Error storing chunks: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()

# Main ingest function
def ingest_topic(topic: str):
    """Ingest documents for a specific topic"""
    logger.info(f"Starting ingestion for topic: {topic}")
    
    # Fetch documents from various sources
    pubmed_docs = fetch_pubmed_articles(topic)
    
    try:
        # Skip Google Scholar if it's causing issues
        logger.info("Skipping Google Scholar due to high rate of 403 errors")
        google_scholar_docs = []  # Skip fetching from Google Scholar
        web_docs = []  # Skip web search
    except Exception as e:
        logger.error(f"Error fetching additional sources: {e}")
        google_scholar_docs = []
        web_docs = []
    
    all_docs = pubmed_docs + google_scholar_docs + web_docs
    logger.info(f"Total documents to process: {len(all_docs)}")
    
    if not all_docs:
        logger.warning(f"No documents found for topic: {topic}")
        return
    
    # Process each document
    try:
        conn = get_db_connection()
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return
        
    documents_saved = 0
    chunks_saved = 0
    
    for doc in all_docs:
        try:
            logger.info(f"Processing document: {doc['title']}")
            
            if 'content' not in doc or not doc['content']:
                logger.warning("  Skipping document with no content")
                continue
            
            # Store document
            document_id = store_document(conn, doc)
            documents_saved += 1
            
            # Split content into chunks
            chunks = split_text_into_chunks(doc['content'])
            logger.info(f"  Split into {len(chunks)} chunks")
            
            if not chunks:
                logger.warning("  No chunks created, skipping")
                continue
            
            # Generate embeddings
            embeddings = get_embeddings(chunks)
            logger.info(f"  Generated {len(embeddings)} embeddings")
            
            # Store chunks and embeddings
            store_chunks(conn, document_id, chunks, embeddings)
            chunks_saved += len(chunks)
            logger.info("  Stored chunks and embeddings")
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            continue
    
    conn.close()
    logger.info(f"Completed ingestion for topic: {topic}. Saved {documents_saved} documents and {chunks_saved} chunks.")

# Main function - update to use command line arguments
def main():
    import sys
    
    # First test the database connection
    if not test_db_connection():
        logger.error("Database connection test failed. Exiting.")
        return
    
    # Surgical fields for targeted knowledge base
    surgical_fields = [
        "General surgery",
        "Neurosurgery",
        "Orthopedic surgery",
        "Cardiothoracic surgery",
        "Plastic surgery",
        "Pediatric surgery",
        "Vascular surgery",
        "Trauma surgery",
        "Colorectal surgery",
        "Surgical oncology",
        "Bariatric surgery",
        "Transplant surgery",
        "Endocrine surgery",
        "Robotic surgery techniques",
        "Minimally invasive surgical procedures"
    ]
    
    # Process only a subset or specific field if specified
    if len(sys.argv) > 1:
        if sys.argv[1].isdigit():
            # Process only a specific number of fields
            num_fields = min(int(sys.argv[1]), len(surgical_fields))
            fields_to_process = surgical_fields[:num_fields]
        else:
            # Process only the specified field
            field_name = sys.argv[1]
            if field_name in surgical_fields:
                fields_to_process = [field_name]
            else:
                logger.error(f"Field '{field_name}' not found. Available fields: {', '.join(surgical_fields)}")
                return
    else:
        # Process all fields
        fields_to_process = surgical_fields
    
    logger.info(f"Will process {len(fields_to_process)} fields: {', '.join(fields_to_process)}")
    
    for field in fields_to_process:
        try:
            ingest_topic(field)
            time.sleep(2)  # Pause between topics
        except KeyboardInterrupt:
            logger.info("Process interrupted by user. Exiting gracefully.")
            break
        except Exception as e:
            logger.error(f"Error processing field {field}: {e}")
            continue

if __name__ == "__main__":
    main() 