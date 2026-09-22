import uuid
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate

class CRUDBookmark:
    async def get(self, db: AsyncSession, id: str) -> Optional[Bookmark]:
        stmt = select(Bookmark).where(Bookmark.id == id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_user(
        self, db: AsyncSession, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[Bookmark]:
        stmt = (
            select(Bookmark)
            .where(Bookmark.user_id == user_id)
            .order_by(desc(Bookmark.created_at))
            .offset(skip)
            .limit(limit)
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def create(self, db: AsyncSession, user_id: str, obj_in: BookmarkCreate) -> Bookmark:
        db_obj = Bookmark(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=obj_in.title,
            url=obj_in.url,
            notes=obj_in.notes,
            document_id=obj_in.document_id,
            webpage_id=obj_in.webpage_id
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Bookmark, obj_in: BookmarkUpdate) -> Bookmark:
        data = obj_in.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, id: str, user_id: Optional[str] = None) -> Optional[Bookmark]:
        stmt = select(Bookmark).where(Bookmark.id == id)
        if user_id:
            stmt = stmt.where(Bookmark.user_id == user_id)
        res = await db.execute(stmt)
        obj = res.scalar_one_or_none()
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

crud_bookmark = CRUDBookmark()
