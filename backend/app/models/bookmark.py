import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    webpage_id = Column(String(36), ForeignKey("webpages.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(512), nullable=False)
    url = Column(String(2048), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    __table_args__ = (
        Index("idx_bookmark_user_created", "user_id", "created_at"),
    )
