import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class SearchQuery(Base):
    __tablename__ = "search_queries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    query_text = Column(String(512), nullable=False, index=True)
    search_mode = Column(String(50), default="hybrid", nullable=False)  # hybrid, semantic, keyword
    execution_time_ms = Column(Integer, default=0, nullable=False)
    results_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    __table_args__ = (
        Index("idx_search_query_created", "created_at"),
    )
