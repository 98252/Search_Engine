from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class WebpageCreate(BaseModel):
    url: str = Field(..., max_length=2048, description="Canonical URL of the webpage")
    domain: str = Field(..., max_length=255, description="Domain name (e.g. wikipedia.org)")
    title: Optional[str] = Field(default=None, max_length=512)
    content: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "crawled"

class WebpageUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=512)
    content: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class WebpageResponse(BaseModel):
    id: str
    url: str
    domain: str
    title: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None
    crawled_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)

class WebpageListResponse(BaseModel):
    items: List[WebpageResponse]
    total: int
    page: int
    page_size: int
