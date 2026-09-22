import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Index
from app.db.base import Base

class SearchResult(Base):
    __tablename__ = "search_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query_id = Column(String(36), ForeignKey("search_queries.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    webpage_id = Column(String(36), ForeignKey("webpages.id", ondelete="CASCADE"), nullable=True, index=True)
    rank_position = Column(Integer, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    clicked = Column(Boolean, default=False, nullable=False)
    clicked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_search_result_query_rank", "query_id", "rank_position"),
    )
