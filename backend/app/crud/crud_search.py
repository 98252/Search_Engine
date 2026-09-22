import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.search_query import SearchQuery
from app.models.search_result import SearchResult

class CRUDSearch:
    async def log_query(
        self,
        db: AsyncSession,
        query_text: str,
        search_mode: str = "hybrid",
        execution_time_ms: int = 0,
        results_count: int = 0,
        user_id: Optional[str] = None
    ) -> SearchQuery:
        query_obj = SearchQuery(
            id=str(uuid.uuid4()),
            user_id=user_id,
            query_text=query_text,
            search_mode=search_mode,
            execution_time_ms=execution_time_ms,
            results_count=results_count
        )
        db.add(query_obj)
        await db.commit()
        await db.refresh(query_obj)
        return query_obj

    async def log_results(
        self,
        db: AsyncSession,
        query_id: str,
        results: List[Dict[str, Any]]
    ) -> List[SearchResult]:
        records = []
        for r in results:
            item = SearchResult(
                id=str(uuid.uuid4()),
                query_id=query_id,
                document_id=r.get("document_id"),
                webpage_id=r.get("webpage_id"),
                rank_position=r.get("rank", 1),
                score=r.get("score", 0.0),
                clicked=False
            )
            db.add(item)
            records.append(item)
        await db.commit()
        return records

    async def record_click(self, db: AsyncSession, result_id: str) -> Optional[SearchResult]:
        stmt = select(SearchResult).where(SearchResult.id == result_id)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if record:
            record.clicked = True
            record.clicked_at = datetime.now(timezone.utc)
            db.add(record)
            await db.commit()
            await db.refresh(record)
        return record

    async def get_recent_queries(
        self, db: AsyncSession, limit: int = 10, user_id: Optional[str] = None
    ) -> List[SearchQuery]:
        stmt = select(SearchQuery)
        if user_id:
            stmt = stmt.where(SearchQuery.user_id == user_id)
        stmt = stmt.order_by(desc(SearchQuery.created_at)).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())

crud_search = CRUDSearch()
