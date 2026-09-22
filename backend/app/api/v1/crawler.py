import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.api.deps import get_db, get_optional_user
from app.db.session import AsyncSessionLocal
from app.models.crawl_job import CrawlJob
from app.models.user import User
from app.schemas.crawler import CrawlJobCreate, CrawlJobResponse, CrawlStatsResponse
from app.services.crawler_service import crawler_service

router = APIRouter()

@router.post("/jobs", response_model=CrawlJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_crawl_job(
    job_in: CrawlJobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    """
    Launch a web crawler job for the given seed URL.
    Crawls recursively up to the specified depth limit and max pages limit.
    """
    job_id = str(uuid.uuid4())
    job = CrawlJob(
        id=job_id,
        user_id=current_user.id if current_user else None,
        seed_url=job_in.seed_url,
        allowed_domains=job_in.allowed_domains,
        depth_limit=job_in.depth_limit,
        max_pages=job_in.max_pages,
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch crawl asynchronously as background task
    background_tasks.add_task(
        crawler_service.execute_crawl,
        job_id=job.id,
        seed_url=job.seed_url,
        allowed_domains=job.allowed_domains,
        depth_limit=job.depth_limit,
        max_pages=job.max_pages,
        db_factory=AsyncSessionLocal
    )

    return CrawlJobResponse.model_validate(job)

@router.get("/jobs", response_model=List[CrawlJobResponse])
async def list_crawl_jobs(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List recent crawl jobs and their execution states."""
    stmt = select(CrawlJob).order_by(desc(CrawlJob.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    return [CrawlJobResponse.model_validate(j) for j in jobs]

@router.get("/jobs/{job_id}", response_model=CrawlJobResponse)
async def get_crawl_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve details and progress of a specific crawl job."""
    stmt = select(CrawlJob).where(CrawlJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crawl job not found.")
    return CrawlJobResponse.model_validate(job)

@router.get("/stats", response_model=CrawlStatsResponse)
async def get_crawler_stats(db: AsyncSession = Depends(get_db)):
    """Summary statistics for all crawl jobs."""
    total_jobs = await db.scalar(select(func.count(CrawlJob.id))) or 0
    active_jobs = await db.scalar(select(func.count(CrawlJob.id)).where(CrawlJob.status == "running")) or 0
    total_crawled = await db.scalar(select(func.sum(CrawlJob.pages_crawled))) or 0
    total_indexed = await db.scalar(select(func.sum(CrawlJob.pages_indexed))) or 0

    recent_stmt = select(CrawlJob).order_by(desc(CrawlJob.created_at)).limit(5)
    recent_jobs = (await db.execute(recent_stmt)).scalars().all()

    return CrawlStatsResponse(
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        total_pages_crawled=total_crawled,
        total_pages_indexed=total_indexed,
        recent_jobs=[CrawlJobResponse.model_validate(j) for j in recent_jobs]
    )
