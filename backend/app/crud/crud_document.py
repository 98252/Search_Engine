import uuid
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate

class CRUDDocument:
    async def get(self, db: AsyncSession, id: str) -> Optional[Document]:
        """Fetch a single document by its UUID."""
        stmt = select(Document).where(Document.id == id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_url(self, db: AsyncSession, url: str) -> Optional[Document]:
        """Fetch a document by its URL."""
        stmt = select(Document).where(Document.url == url)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        query: Optional[str] = None,
        source: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[Document], int]:
        """Fetch multiple documents with filtering, search, and pagination."""
        base_stmt = select(Document)
        count_stmt = select(func.count(Document.id))

        # Filters
        conditions = []
        if query:
            q_pattern = f"%{query.strip()}%"
            conditions.append(
                or_(
                    Document.title.ilike(q_pattern),
                    Document.content.ilike(q_pattern),
                    Document.author.ilike(q_pattern)
                )
            )
        if source:
            conditions.append(Document.source == source)
        if status:
            conditions.append(Document.status == status)

        if conditions:
            base_stmt = base_stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        total = await db.scalar(count_stmt) or 0
        stmt = base_stmt.order_by(desc(Document.created_at)).offset(skip).limit(limit)
        result = await db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(self, db: AsyncSession, obj_in: DocumentCreate) -> Document:
        """Create and persist a new document."""
        db_obj = Document(
            id=str(uuid.uuid4()),
            title=obj_in.title,
            content=obj_in.content,
            url=obj_in.url,
            source=obj_in.source or "manual",
            author=obj_in.author,
            status=obj_in.status or "pending",
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, db_obj: Document, obj_in: DocumentUpdate
    ) -> Document:
        """Update an existing document."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, id: str) -> Optional[Document]:
        """Delete a document by ID."""
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

crud_document = CRUDDocument()
