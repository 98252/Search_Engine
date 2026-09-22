from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512, description="Title of the document")
    content: str = Field(..., min_length=1, description="Full text content of the document")
    url: Optional[str] = Field(default=None, max_length=2048, description="Source or reference URL")
    source: Optional[str] = Field(default="manual", max_length=100, description="Origin source tag")
    author: Optional[str] = Field(default=None, max_length=255, description="Author name if available")
    status: Optional[str] = Field(default="pending", description="Status (pending, indexed, failed, archived)")

class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=512)
    content: Optional[str] = Field(default=None, min_length=1)
    url: Optional[str] = Field(default=None, max_length=2048)
    source: Optional[str] = Field(default=None, max_length=100)
    author: Optional[str] = Field(default=None, max_length=255)
    status: Optional[str] = None
    indexed_at: Optional[datetime] = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    url: Optional[str] = None
    source: str
    author: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    indexed_at: Optional[datetime] = None
    status: str

    model_config = ConfigDict(from_attributes=True)

class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
