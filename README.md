# SmartSearch AI: Production-Ready AI Search Engine

SmartSearch AI is an advanced, enterprise-grade search engine combining traditional keyword search (**OpenSearch BM25**) and dense vector semantic search (**Qdrant + SentenceTransformers**) with an integrated **Scrapy** web crawler, **FastAPI** asynchronous backend, and modern **React / Vite / Tailwind** frontend.

---

## Key Features

- **Hybrid Search with Reciprocal Rank Fusion (RRF)**: Blends exact lexical matches with deep semantic context without raw score distortions.
- **AI-Powered Semantic Understanding**: Uses `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) for sub-20ms query embedding on CPU.
- **Integrated Scrapy Web Crawler**: Crawl domains, extract clean article text, respect `robots.txt`, and chunk/index on the fly.
- **FastAPI Asynchronous Backend**: Parallel query dispatch, Pydantic v2 validation, OpenAPI/Swagger auto-docs, and JWT authentication.
- **Dual-Engine Graceful Fallback**: Automatically degrades to BM25 or Vector search if either storage engine is temporarily offline.
- **Modern Search UI**: Real-time typeahead suggestions, snippet highlights, search mode switcher (Hybrid, Semantic, Keyword), and Crawler Admin Dashboard.

---

## System Architecture

```
User Query (Frontend)
       │
       ▼
FastAPI Backend (Search Coordinator)
       ├──► OpenSearch (BM25 Lexical Matching + Highlights)
       └──► Qdrant (HNSW Cosine Vector Similarity via MiniLM)
       │
       ▼
Reciprocal Rank Fusion (RRF) Ranking Algorithm
       │
       ▼
Enriched Results with PostgreSQL Metadata & Snippets
```

---

## Quick Start (Docker Compose)

The fastest way to boot the full production stack:

```bash
docker-compose up -d --build
```

Access the services:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenSearch**: [http://localhost:9200](http://localhost:9200)
- **Qdrant Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

---

## Local Development (Without Docker)

You can run SmartSearch AI locally with zero external dependencies thanks to built-in SQLite support and Qdrant local storage:

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
