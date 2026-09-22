from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.api.deps import get_db
from app.models.analytics import SearchQuery
from app.models.document import Document, DocumentChunk
from app.models.crawl_job import CrawlJob
from app.services.opensearch_service import opensearch_service
from app.services.qdrant_service import qdrant_service

router = APIRouter()

@router.get("/stats")
async def get_system_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve comprehensive system telemetry and search analytics."""
    total_docs = await db.scalar(select(func.count(Document.id))) or 0
    total_chunks = await db.scalar(select(func.count(DocumentChunk.id))) or 0
    total_queries = await db.scalar(select(func.count(SearchQuery.id))) or 0
    avg_latency = await db.scalar(select(func.avg(SearchQuery.execution_time_ms))) or 0.0

    # Top search terms
    top_queries_stmt = (
        select(SearchQuery.query_text, func.count(SearchQuery.id).label("count"))
        .group_by(SearchQuery.query_text)
        .order_by(desc("count"))
        .limit(5)
    )
    top_queries_res = (await db.execute(top_queries_stmt)).all()
    top_queries = [{"query": row[0], "count": row[1]} for row in top_queries_res]

    # Qdrant & OpenSearch status
    qdrant_info = qdrant_service.get_stats()
    opensearch_info = opensearch_service.get_stats()

    return {
        "overview": {
            "total_documents": total_docs,
            "total_chunks": total_chunks,
            "total_queries": total_queries,
            "avg_latency_ms": round(float(avg_latency), 2),
        },
        "top_queries": top_queries,
        "search_engines": {
            "opensearch": opensearch_info,
            "qdrant": qdrant_info,
        }
    }
