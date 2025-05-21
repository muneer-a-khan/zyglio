import os
import json
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import Json
import uuid
from scholarly import scholarly
import time
import re
from bs4 import BeautifulSoup
import PyPDF2
from io import BytesIO

# Load environment variables
load_dotenv()

# Configuration
CHUNK_SIZE = 500  # Number of characters per chunk
CHUNK_OVERLAP = 100  # Overlap between chunks
MAX_DOCUMENTS_PER_TOPIC = 5  # Limit number of documents per topic
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# Connect to database
def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

# DeepSeek Embedding API
def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts using DeepSeek API"""
    if not DEEPSEEK_API_KEY:
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
            print(f"Error generating embeddings: {e}")
            # Return empty embeddings on error
            all_embeddings.extend([[0.0] * 1536] * len(batch))
    
    return all_embeddings

# Fetching functions
def fetch_google_scholar(topic: str, max_results: int = MAX_DOCUMENTS_PER_TOPIC) -> List[Dict[str, Any]]:
    """Fetch papers from Google Scholar on a specific topic"""
    print(f"Fetching Google Scholar results for: {topic}")
    results = []
    
    try:
        # Search for the topic
        search_query = scholarly.search_pubs(topic)
        count = 0
        
        # Get results
        for paper in search_query:
            if count >= max_results:
                break
                
            # Extract relevant information
            if 'url_pdf' in paper and paper['url_pdf']:
                url = paper['url_pdf']
            elif 'pub_url' in paper and paper['pub_url']:
                url = paper['pub_url']
            else:
                continue  # Skip if no URL available
                
            document = {
                'title': paper.get('bib', {}).get('title', f"Untitled Paper {count}"),
                'url': url,
                'broadTopic': topic,
                'sourceType': 'GOOGLE_SCHOLAR'
            }
            
            # Try to fetch content
            content = fetch_document_content(url)
            if content:
                document['content'] = content
                results.append(document)
                count += 1
            
            # Respect rate limits
            time.sleep(2)
            
    except Exception as e:
        print(f"Error fetching from Google Scholar: {e}")
    
    print(f"Found {len(results)} valid results from Google Scholar")
    return results

def fetch_web_search(topic: str, max_results: int = MAX_DOCUMENTS_PER_TOPIC) -> List[Dict[str, Any]]:
    """
    Fetch web search results (simplified version)
    In a production environment, use a proper search API like SerpAPI, Google Custom Search, etc.
    """
    print(f"Note: This is a placeholder for web search. In production, integrate with a proper search API.")
    # This is a placeholder. In a real implementation, you would:
    # 1. Use a search API like SerpAPI, Google Custom Search, Bing API, etc.
    # 2. Extract URLs from search results
    # 3. Fetch and process content from each URL
    return []

def fetch_document_content(url: str) -> Optional[str]:
    """Fetch and extract content from a URL"""
    try:
        # Simple check for PDF
        if url.lower().endswith('.pdf'):
            return fetch_pdf_content(url)
        else:
            return fetch_html_content(url)
    except Exception as e:
        print(f"Error fetching content from {url}: {e}")
        return None

def fetch_html_content(url: str) -> Optional[str]:
    """Fetch and parse HTML content"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove non-content elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'ads']):
            element.extract()
        
        # Extract text
        text = soup.get_text(separator=' ', strip=True)
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    except Exception as e:
        print(f"Error fetching HTML from {url}: {e}")
        return None

def fetch_pdf_content(url: str) -> Optional[str]:
    """Fetch and parse PDF content"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        pdf_file = BytesIO(response.content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page_num in range(len(pdf_reader.pages)):
            text += pdf_reader.pages[page_num].extract_text() + " "
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    except Exception as e:
        print(f"Error fetching PDF from {url}: {e}")
        return None

# Text processing
def split_text_into_chunks(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into chunks with overlap"""
    if not text:
        return []
        
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        
        # If we're not at the beginning, try to find a space to break at
        if start > 0 and end < text_length:
            next_space = text.find(' ', end)
            if next_space != -1 and next_space - end < 50:  # Look ahead up to 50 chars
                end = next_space
        
        chunks.append(text[start:end])
        start = end - overlap if end < text_length else text_length
    
    return chunks

# Database operations
def store_document(conn, document: Dict[str, Any]) -> str:
    """Store a document in the database and return its ID"""
    cursor = conn.cursor()
    
    document_id = str(uuid.uuid4())
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
    cursor.close()
    return document_id

def store_chunks(conn, document_id: str, chunks: List[str], embeddings: List[List[float]]):
    """Store text chunks and their embeddings in the database"""
    cursor = conn.cursor()
    
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = str(uuid.uuid4())
        embedding_array = f"[{','.join(map(str, embedding))}]"
        
        # Store the chunk
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
    cursor.close()

# Main ingest function
def ingest_topic(topic: str):
    """Ingest documents for a specific topic"""
    print(f"Starting ingestion for topic: {topic}")
    
    # Fetch documents
    google_scholar_docs = fetch_google_scholar(topic)
    web_docs = fetch_web_search(topic)
    
    all_docs = google_scholar_docs + web_docs
    print(f"Total documents to process: {len(all_docs)}")
    
    if not all_docs:
        print(f"No documents found for topic: {topic}")
        return
    
    # Process each document
    conn = get_db_connection()
    
    for doc in all_docs:
        print(f"Processing document: {doc['title']}")
        
        if 'content' not in doc or not doc['content']:
            print("  Skipping document with no content")
            continue
        
        # Store document
        document_id = store_document(conn, doc)
        
        # Split content into chunks
        chunks = split_text_into_chunks(doc['content'])
        print(f"  Split into {len(chunks)} chunks")
        
        if not chunks:
            print("  No chunks created, skipping")
            continue
        
        # Generate embeddings
        embeddings = get_embeddings(chunks)
        print(f"  Generated {len(embeddings)} embeddings")
        
        # Store chunks and embeddings
        store_chunks(conn, document_id, chunks, embeddings)
        print("  Stored chunks and embeddings")
    
    conn.close()
    print(f"Completed ingestion for topic: {topic}")

def main():
    # Example topics
    topics = [
        "Medical procedures",
        "Surgical techniques",
        "Manufacturing processes",
        "Engineering workflows",
        "Laboratory protocols"
    ]
    
    for topic in topics:
        ingest_topic(topic)
        time.sleep(5)  # Pause between topics

if __name__ == "__main__":
    main() 