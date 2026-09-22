import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Index
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class CrawlJob(Base):
    __tablename__ = "crawl_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seed_url = Column(String(1024), nullable=False)
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, running, completed, failed
    pages_found = Column(Integer, default=0, nullable=False)
    pages_processed = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    __table_args__ = (
        Index("idx_crawl_job_status_created", "status", "created_at"),
    )
