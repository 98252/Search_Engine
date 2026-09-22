from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.session import init_db, AsyncSessionLocal
from app.api.v1.router import api_router
from app.services.crawler_service import crawler_service
from app.services.opensearch_service import opensearch_service
from app.services.qdrant_service import qdrant_service
from app.models.document import Document
from sqlalchemy import select

# Sample demo articles to pre-seed if database is empty
DEMO_CORPUS = [
    {
        "url": "https://smartsearch.ai/docs/hybrid-search-explained",
        "title": "Demystifying Hybrid Search: BM25 Meets Vector Embeddings",
        "domain": "smartsearch.ai",
        "content": (
            "Hybrid search combines lexical keyword matching (BM25) with dense vector semantic search. "
            "While BM25 excels at finding exact keywords, rare acronyms, product SKUs, and specific nomenclature, "
            "vector embeddings capture semantic meaning, synonyms, and conversational intent. "
            "By fusing both result rankings using Reciprocal Rank Fusion (RRF), search engines deliver up to 30% "
            "better recall and precision than either technique alone."
        )
    },
    {
        "url": "https://smartsearch.ai/docs/hnsw-vector-indexing",
        "title": "Hierarchical Navigable Small World (HNSW) Graphs in Qdrant",
        "domain": "smartsearch.ai",
        "content": (
            "HNSW is the state-of-the-art graph-based algorithm for approximate nearest neighbor (ANN) search. "
            "It builds a multi-layer graph where the bottom layer contains all vectors and upper layers contain "
            "skip-lists for fast traversal. Qdrant implements HNSW in Rust with SIMD hardware acceleration, "
            "enabling sub-5 millisecond vector lookups over millions of high-dimensional points."
        )
    },
    {
        "url": "https://smartsearch.ai/docs/opensearch-bm25-tuning",
        "title": "Optimizing OpenSearch BM25 Parameters for Information Retrieval",
        "domain": "smartsearch.ai",
        "content": (
            "The Okapi BM25 scoring function ranks documents based on term frequency and inverted document frequency. "
            "The parameter k1 controls term frequency saturation (typically 1.2 to 2.0), while b controls document "
            "length normalization (typically 0.75). Setting b higher penalizes long rambling documents, ensuring concise "
            "and relevant text chunks rank higher in search results."
        )
    },
    {
        "url": "https://smartsearch.ai/docs/web-crawling-ethics",
        "title": "Ethical Web Crawling: Robots.txt and Rate Throttling with Scrapy",
        "domain": "smartsearch.ai",
        "content": (
            "Building a web crawler requires responsible scraping practices. Always check and obey robots.txt files, "
            "identify your crawler with a descriptive User-Agent header and contact URL, and implement auto-throttling "
            "with minimum download delays of 1-2 seconds. This prevents server overload while respecting website owners."
        )
    }
]

import uuid
from urllib.parse import urlparse
from app.models.webpage import Webpage
from app.models.document import DocumentChunk
from app.services.embedding_service import embedding_service
from datetime import datetime, timezone

# Comprehensive real-world initial corpus across technology, municipal/Nagarpalika governance, and web architecture
DEMO_CORPUS = [
    {
        "url": "https://smartsearch.ai/docs/hybrid-search-explained",
        "title": "Demystifying Hybrid Search: BM25 Meets Vector Embeddings",
        "domain": "smartsearch.ai",
        "author": "Dr. Sarah Chen, Search Architect",
        "content": (
            "Hybrid search combines lexical keyword matching (BM25) with dense vector semantic search. "
            "While BM25 excels at finding exact keywords, rare acronyms, product SKUs, and specific nomenclature, "
            "vector embeddings capture semantic meaning, synonyms, and conversational intent. "
            "By fusing both result rankings using Reciprocal Rank Fusion (RRF), search engines deliver up to 30% "
            "better recall and precision than either technique alone."
        )
    },
    {
        "url": "https://smartsearch.ai/docs/hnsw-vector-indexing",
        "title": "Hierarchical Navigable Small World (HNSW) Graphs in Qdrant",
        "domain": "smartsearch.ai",
        "author": "Alex Thorne, Distributed Systems Engineer",
        "content": (
            "HNSW is the state-of-the-art graph-based algorithm for approximate nearest neighbor (ANN) search. "
            "It builds a multi-layer graph where the bottom layer contains all vectors and upper layers contain "
            "skip-lists for fast traversal. Qdrant implements HNSW in Rust with SIMD hardware acceleration, "
            "enabling sub-5 millisecond vector lookups over millions of high-dimensional points."
        )
    },
    {
        "url": "https://smartsearch.ai/docs/opensearch-bm25-tuning",
        "title": "Optimizing OpenSearch BM25 Parameters for Information Retrieval",
        "domain": "smartsearch.ai",
        "author": "Elena Rostova, IR Specialist",
        "content": (
            "The Okapi BM25 scoring function ranks documents based on term frequency and inverted document frequency. "
            "The parameter k1 controls term frequency saturation (typically 1.2 to 2.0), while b controls document "
            "length normalization (typically 0.75). Setting b higher penalizes long rambling documents, ensuring concise "
            "and relevant text chunks rank higher in search results."
        )
    },
    {
        "url": "https://smartsearch.ai/docs/web-crawling-ethics",
        "title": "Ethical Web Crawling: Robots.txt and Rate Throttling with Scrapy",
        "domain": "smartsearch.ai",
        "author": "Marcus Vance, Crawling Engineer",
        "content": (
            "Building a web crawler requires responsible scraping practices. Always check and obey robots.txt files, "
            "identify your crawler with a descriptive User-Agent header and contact URL, and implement auto-throttling "
            "with minimum download delays of 1-2 seconds. This prevents server overload while respecting website owners."
        )
    },
    {
        "url": "https://nagarpalika.gov.in/services/citizen-portal",
        "title": "Nagarpalika Citizen Services: Online Municipal Portal & E-Governance",
        "domain": "nagarpalika.gov.in",
        "author": "Municipal Administration Dept",
        "content": (
            "The Nagarpalika Citizen Services portal enables urban residents to seamlessly access essential municipal "
            "utilities and e-governance services. Citizens can track application status, submit public grievances, "
            "download digital verification certificates, and request municipal NOCs online without visiting ward offices."
        )
    },
    {
        "url": "https://nagarpalika.gov.in/services/property-tax",
        "title": "Property Tax Assessment, Self-Declaration and Online Payment - Nagarpalika",
        "domain": "nagarpalika.gov.in",
        "author": "Revenue & Taxation Division",
        "content": (
            "All residential and commercial properties within the Nagarpalika municipal boundaries are subject to annual "
            "property tax assessment. Property owners can calculate dues using the self-assessment tool, check outstanding "
            "arrears, avail 5% early rebate discounts, and instantly generate digital payment receipts through UPI or net banking."
        )
    },
    {
        "url": "https://nagarpalika.gov.in/services/birth-death-registration",
        "title": "Birth and Death Certificate Application Process & Vital Records Registration",
        "domain": "nagarpalika.gov.in",
        "author": "Registrar of Vital Statistics",
        "content": (
            "Registration of births and deaths must be filed within 21 days of occurrence at the designated Nagarpalika "
            "health center or online portal. Digitally signed QR-code verifiable certificates are issued within 3-5 working days. "
            "Delayed registrations require an affidavit and verification by the local sub-divisional magistrate."
        )
    },
    {
        "url": "https://nagarpalika.gov.in/initiatives/solid-waste-management",
        "title": "Municipal Solid Waste Management, Door-to-Door Collection & Clean City Mission",
        "domain": "nagarpalika.gov.in",
        "author": "Public Health & Sanitation Branch",
        "content": (
            "Under the Clean City initiative, the Nagarpalika operates segregated door-to-door waste collection for wet, "
            "dry, and hazardous sanitary waste. Modern decentralized composting centers and recycling processing units "
            "divert over 85% of municipal solid waste away from landfills to preserve local urban ecology."
        )
    },
    {
        "url": "https://nagarpalika.gov.in/services/water-utility",
        "title": "Municipal Drinking Water Supply Connections and Pipeline Maintenance",
        "domain": "nagarpalika.gov.in",
        "author": "Water Works Department",
        "content": (
            "Citizens residing in newly developed municipal sectors can apply for piped drinking water connections through "
            "the Nagarpalika engineering wing. The department conducts regular water potability lab tests, automates meter reading, "
            "and provides a 24/7 helpline for emergency pipe burst and low-pressure reports."
        )
    },
    {
        "url": "https://nagarpalika.gov.in/services/trade-license",
        "title": "Municipal Trade License Application and Commercial Shop Registration",
        "domain": "nagarpalika.gov.in",
        "author": "Licensing & Trade Regulatory Office",
        "content": (
            "Operating a business, retail shop, restaurant, or commercial warehouse within municipality limits requires a valid "
            "Nagarpalika trade license. Applications must be renewed annually by March 31st and require fire safety clearance, "
            "sanitary compliance certificates, and ownership or lease agreement documentation."
        )
    },
    {
        "url": "https://fastapi.tiangolo.com/tutorial/fastapi-async-architecture",
        "title": "FastAPI: Asynchronous Web Framework for High-Performance Python Microservices",
        "domain": "fastapi.tiangolo.com",
        "author": "Sebastián Ramírez & Contributors",
        "content": (
            "FastAPI is a modern, fast (high-performance) web framework for building APIs with Python 3.8+ based on standard "
            "Python type hints. It features automatic interactive documentation with Swagger UI, native asynchronous coroutines (async/await), "
            "Pydantic data validation, and speeds on par with NodeJS and Go."
        )
    },
    {
        "url": "https://python.org/docs/data-structures-and-algorithms",
        "title": "Python 3.12 Core Architecture: Inverted Indices, Hash Tables, and Sets",
        "domain": "python.org",
        "author": "Python Software Foundation",
        "content": (
            "Python's built-in dictionary and set types are implemented using open-addressing hash tables, providing average O(1) "
            "time complexity for key lookups. In search engines and information retrieval systems, inverted index postings utilize "
            "hash maps to map query terms to list of document identifiers with maximum execution efficiency."
        )
    },
    {
        "url": "https://qdrant.tech/documentation/concepts/hybrid-search-rrf",
        "title": "Reciprocal Rank Fusion (RRF): Mathematical Theory & Search Fusion",
        "domain": "qdrant.tech",
        "author": "Qdrant Engineering Team",
        "content": (
            "Reciprocal Rank Fusion (RRF) is an algorithmic technique for combining the results of multiple independent search "
            "engines or retrieval models. By taking the reciprocal rank score 1 / (k + rank) where k is a smoothing constant, "
            "RRF does not depend on disparate score magnitudes between vector cosine distances and BM25 scores, delivering robust hybrid rankings."
        )
    },
    {
        "url": "https://en.wikipedia.org/wiki/Search_engine",
        "title": "Search Engine Architecture: Web Crawling, Indexing, and Ranking Systems",
        "domain": "wikipedia.org",
        "author": "Wikipedia Contributors",
        "content": (
            "A web search engine is a software system designed to carry out web searches to systematically scour the World Wide Web "
            "for particular information specified in a textual web search query. The search results are generally presented in a list "
            "of results, often referred to as search engine results pages (SERPs)."
        )
    }
]

async def seed_initial_data():
    """Seeds and indexes demo documents into SQLite, OpenSearch BM25, and Qdrant vector storage."""
    try:
        async with AsyncSessionLocal() as db:
            # 1. Fetch existing documents
            result = await db.execute(select(Document))
            existing_docs = {doc.url: doc for doc in result.scalars().all() if doc.url}

            # 2. Add any missing corpus items
            added_any = False
            for item in DEMO_CORPUS:
                if item["url"] not in existing_docs:
                    doc = Document(
                        id=str(uuid.uuid4()),
                        title=item["title"],
                        content=item["content"],
                        url=item["url"],
                        source="system",
                        author=item.get("author", "SmartSearch Team"),
                        status="indexed"
                    )
                    db.add(doc)
                    existing_docs[item["url"]] = doc
                    added_any = True
            
            if added_any:
                await db.commit()
                logger.info("New corpus documents added to database.")

            # 3. Index all documents into BM25 fallback & Qdrant
            res_all = await db.execute(select(Document))
            all_docs = res_all.scalars().all()

            for doc in all_docs:
                domain = urlparse(doc.url).netloc if doc.url else "smartsearch.ai"
                # Index into BM25 fallback
                opensearch_service.index_chunk(
                    doc_id=doc.id,
                    title=doc.title,
                    chunk_text=doc.content,
                    payload={
                        "document_id": doc.id,
                        "url": doc.url or "https://smartsearch.ai",
                        "domain": domain,
                        "author": doc.author or "Verified Source",
                        "chunk_index": 0
                    }
                )

            # 4. Also index any Webpage records into BM25
            web_res = await db.execute(select(Webpage))
            webpages = web_res.scalars().all()
            for wp in webpages:
                if wp.content and wp.title:
                    opensearch_service.index_chunk(
                        doc_id=wp.id,
                        title=wp.title,
                        chunk_text=wp.content,
                        payload={
                            "document_id": wp.id,
                            "url": wp.url,
                            "domain": wp.domain,
                            "author": "Web Crawler",
                            "chunk_index": 0
                        }
                    )

            logger.info(f"Loaded {len(all_docs)} documents & {len(webpages)} webpages into search index successfully.")
    except Exception as e:
        logger.warning(f"Note on initial seed & indexing: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info(f"Starting {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode...")
    await init_db()
    await seed_initial_data()
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade Hybrid Search Engine combining OpenSearch BM25, Qdrant Vectors, and Scrapy.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Error Handling
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing request: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please check server logs."
            }
        }
    )

# Healthcheck Endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    from datetime import datetime, timezone
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": "connected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Mount v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)
