import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(512), nullable=False, index=True)
    content = Column(Text, nullable=False)
    url = Column(String(2048), nullable=True, index=True)
    source = Column(String(100), default="manual", nullable=False, index=True)
    author = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    indexed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, indexed, failed, archived

    __table_args__ = (
        Index("idx_document_status_created", "status", "created_at"),
        Index("idx_document_source_status", "source", "status"),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    qdrant_point_id = Column(String(36), nullable=False)
    opensearch_doc_id = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
