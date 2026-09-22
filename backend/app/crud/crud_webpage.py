import uuid
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.webpage import Webpage
from app.schemas.webpage import WebpageCreate, WebpageUpdate

class CRUDWebpage:
    async def get(self, db: AsyncSession, id: str) -> Optional[Webpage]:
        stmt = select(Webpage).where(Webpage.id == id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_url(self, db: AsyncSession, url: str) -> Optional[Webpage]:
        stmt = select(Webpage).where(Webpage.url == url)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        domain: Optional[str] = None,
        status: Optional[str] = None
    ) -> Tuple[List[Webpage], int]:
        base_stmt = select(Webpage)
        count_stmt = select(func.count(Webpage.id))

        conditions = []
        if domain:
            conditions.append(Webpage.domain == domain)
        if status:
            conditions.append(Webpage.status == status)

        if conditions:
            base_stmt = base_stmt.where(*conditions)
            count_stmt = count_stmt.where(*conditions)

        total = await db.scalar(count_stmt) or 0
        stmt = base_stmt.order_by(desc(Webpage.crawled_at)).offset(skip).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all()), total

    async def create(self, db: AsyncSession, obj_in: WebpageCreate) -> Webpage:
        db_obj = Webpage(
            id=str(uuid.uuid4()),
            url=obj_in.url,
            domain=obj_in.domain,
            title=obj_in.title,
            content=obj_in.content,
            description=obj_in.description,
            status=obj_in.status or "crawled"
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Webpage, obj_in: WebpageUpdate) -> Webpage:
        data = obj_in.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, id: str) -> Optional[Webpage]:
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

crud_webpage = CRUDWebpage()
