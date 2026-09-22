from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class CrawlJobCreate(BaseModel):
    seed_url: str = Field(..., max_length=1024, description="Root URL to start crawling")

class CrawlJobUpdate(BaseModel):
    status: Optional[str] = None
    pages_found: Optional[int] = None
    pages_processed: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class CrawlJobResponse(BaseModel):
    id: str
    seed_url: str
    status: str
    pages_found: int
    pages_processed: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
