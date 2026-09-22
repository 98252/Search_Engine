import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_optional_user
from app.models.user import User
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentListResponse,
)
from app.crud.crud_document import crud_document

router = APIRouter()

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    _user: Optional[User] = Depends(get_optional_user)
):
    """
    Create a new document in the PostgreSQL/SQLite database.
    Validates title, content, URL, source, and author.
    """
    doc = await crud_document.create(db=db, obj_in=doc_in)
    return DocumentResponse.model_validate(doc)

@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    query: Optional[str] = Query(default=None, description="Search query filter for title or content"),
    source: Optional[str] = Query(default=None, description="Filter by document source tag"),
    status: Optional[str] = Query(default=None, description="Filter by status (pending, indexed, failed)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve paginated documents with optional text search and status/source filters.
    """
    skip = (page - 1) * page_size
    items, total = await crud_document.get_multi(
        db=db,
        skip=skip,
        limit=page_size,
        query=query,
        source=source,
        status=status,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve a specific document by its unique identifier (UUID).
    """
    doc = await crud_document.get(db=db, id=document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )
    return DocumentResponse.model_validate(doc)

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    doc_in: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    _user: Optional[User] = Depends(get_optional_user)
):
    """
    Update document metadata or content.
    """
    doc = await crud_document.get(db=db, id=document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )
    updated_doc = await crud_document.update(db=db, db_obj=doc, obj_in=doc_in)
    return DocumentResponse.model_validate(updated_doc)

@router.delete("/{document_id}", response_model=DocumentResponse)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    _user: Optional[User] = Depends(get_optional_user)
):
    """
    Delete a document from the database.
    """
    doc = await crud_document.remove(db=db, id=document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )
    return DocumentResponse.model_validate(doc)
