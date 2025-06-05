# RAG Data Ingestion

This directory contains scripts for ingesting data into the RAG (Retrieval-Augmented Generation) system.

## Prerequisites

- Python 3.8+
- PostgreSQL with pgvector extension enabled
- DeepSeek API key
- NCBI/PubMed API key (for medical/surgical articles)

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Add your environment variables in the project root `.env` file:

```
DEEPSEEK_API_KEY=your_deepseek_api_key
NCBI_API_KEY=your_ncbi_api_key
DATABASE_URL=your_database_connection_string
```

## Running the ingest script

Execute the ingest script with:

```bash
python ingest_data.py
```

By default, it will ingest documents from:
- PubMed (primary source for medical articles)
- Google Scholar (supplementary academic papers)
- Web searches (if implemented)

The script focuses on 15 surgical specialties:
- General surgery
- Neurosurgery
- Orthopedic surgery
- Cardiothoracic surgery
- Plastic surgery
- Pediatric surgery
- Vascular surgery
- Trauma surgery
- Colorectal surgery
- Surgical oncology
- Bariatric surgery
- Transplant surgery
- Endocrine surgery
- Robotic surgery techniques
- Minimally invasive surgical procedures

## Customizing topics

To ingest documents for different surgical fields or topics, modify the `surgical_fields` list in the `main()` function of `ingest_data.py`.

## PubMed API Rate Limits

The script respects PubMed's API rate limit of 10 requests per second. It uses the `ratelimit` package to manage this restriction automatically. If you have registered for an NCBI API key, make sure to include it in your `.env` file to get higher rate limits.

## Output

The script will:
1. Search for the top 100 most relevant articles for each surgical field
2. Extract article metadata and abstract content
3. Process and chunk the text
4. Generate embeddings using DeepSeek
5. Store everything in your vector database 