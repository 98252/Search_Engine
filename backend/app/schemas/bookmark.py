from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class BookmarkCreate(BaseModel):
    title: str = Field(..., max_length=512)
    url: str = Field(..., max_length=2048)
    notes: Optional[str] = None
    document_id: Optional[str] = None
    webpage_id: Optional[str] = None

class BookmarkUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=512)
    notes: Optional[str] = None

class BookmarkResponse(BaseModel):
    id: str
    user_id: str
    title: str
    url: str
    notes: Optional[str] = None
    document_id: Optional[str] = None
    webpage_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
