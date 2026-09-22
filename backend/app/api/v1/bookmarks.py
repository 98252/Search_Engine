from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, get_optional_user
from app.models.user import User
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate, BookmarkResponse
from app.crud.crud_bookmark import crud_bookmark

router = APIRouter()

@router.post("", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    bookmark_in: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save a search result, document, or webpage as a bookmark for the authenticated user."""
    bookmark = await crud_bookmark.create(db=db, user_id=current_user.id, obj_in=bookmark_in)
    return BookmarkResponse.model_validate(bookmark)

@router.get("", response_model=List[BookmarkResponse])
async def list_bookmarks(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve bookmarks saved by the current user."""
    bookmarks = await crud_bookmark.get_by_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return [BookmarkResponse.model_validate(b) for b in bookmarks]

@router.delete("/{bookmark_id}", response_model=BookmarkResponse)
async def delete_bookmark(
    bookmark_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a bookmark by its ID."""
    removed = await crud_bookmark.remove(db=db, id=bookmark_id, user_id=current_user.id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found.")
    return BookmarkResponse.model_validate(removed)
