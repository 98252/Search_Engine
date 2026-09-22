import uuid
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.crawl_job import CrawlJob
from app.schemas.crawl_job import CrawlJobCreate, CrawlJobUpdate

class CRUDCrawlJob:
    async def get(self, db: AsyncSession, id: str) -> Optional[CrawlJob]:
        stmt = select(CrawlJob).where(CrawlJob.id == id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None
    ) -> Tuple[List[CrawlJob], int]:
        base_stmt = select(CrawlJob)
        count_stmt = select(func.count(CrawlJob.id))

        if status:
            base_stmt = base_stmt.where(CrawlJob.status == status)
            count_stmt = count_stmt.where(CrawlJob.status == status)

        total = await db.scalar(count_stmt) or 0
        stmt = base_stmt.order_by(desc(CrawlJob.created_at)).offset(skip).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all()), total

    async def create(self, db: AsyncSession, obj_in: CrawlJobCreate) -> CrawlJob:
        db_obj = CrawlJob(
            id=str(uuid.uuid4()),
            seed_url=obj_in.seed_url,
            status="pending",
            pages_found=0,
            pages_processed=0
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: CrawlJob, obj_in: CrawlJobUpdate) -> CrawlJob:
        data = obj_in.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_progress(
        self, db: AsyncSession, id: str, pages_found: int, pages_processed: int, status: Optional[str] = None
    ) -> Optional[CrawlJob]:
        job = await self.get(db, id)
        if job:
            job.pages_found = pages_found
            job.pages_processed = pages_processed
            if status:
                job.status = status
                if status == "completed" or status == "failed":
                    job.completed_at = datetime.now(timezone.utc)
                elif status == "running" and not job.started_at:
                    job.started_at = datetime.now(timezone.utc)
            db.add(job)
            await db.commit()
            await db.refresh(job)
        return job

crud_crawl_job = CRUDCrawlJob()
