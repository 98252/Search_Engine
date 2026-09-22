from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.webpage import WebpageCreate, WebpageUpdate, WebpageResponse, WebpageListResponse
from app.crud.crud_webpage import crud_webpage

router = APIRouter()

@router.post("", response_model=WebpageResponse, status_code=status.HTTP_201_CREATED)
async def create_webpage(
    webpage_in: WebpageCreate,
    db: AsyncSession = Depends(get_db)
):
    """Store a scraped/crawled webpage record."""
    existing = await crud_webpage.get_by_url(db=db, url=webpage_in.url)
    if existing:
        updated = await crud_webpage.update(db=db, db_obj=existing, obj_in=WebpageUpdate(**webpage_in.model_dump()))
        return WebpageResponse.model_validate(updated)
    page = await crud_webpage.create(db=db, obj_in=webpage_in)
    return WebpageResponse.model_validate(page)

@router.get("", response_model=WebpageListResponse)
async def list_webpages(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    domain: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db)
):
    """List crawled webpages with domain and status filters."""
    skip = (page - 1) * page_size
    items, total = await crud_webpage.get_multi(
        db=db, skip=skip, limit=page_size, domain=domain, status=status
    )
    return WebpageListResponse(
        items=[WebpageResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/{webpage_id}", response_model=WebpageResponse)
async def get_webpage(webpage_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch single webpage record by ID."""
    item = await crud_webpage.get(db=db, id=webpage_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webpage not found.")
    return WebpageResponse.model_validate(item)
