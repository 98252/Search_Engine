import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Index
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Webpage(Base):
    __tablename__ = "webpages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    url = Column(String(2048), unique=True, index=True, nullable=False)
    domain = Column(String(255), index=True, nullable=False)
    title = Column(String(512), nullable=True)
    content = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    crawled_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    status = Column(String(50), default="crawled", nullable=False, index=True)  # crawled, indexed, failed

    __table_args__ = (
        Index("idx_webpage_domain_crawled", "domain", "crawled_at"),
    )
