from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl, Field, ConfigDict

class CrawlJobCreate(BaseModel):
    seed_url: str = Field(..., description="Root URL to start crawling")
    allowed_domains: Optional[str] = Field(default=None, description="Comma-separated domains or domain substring")
    depth_limit: int = Field(default=2, ge=1, le=5, description="Maximum crawl recursion depth")
    max_pages: int = Field(default=30, ge=1, le=200, description="Maximum pages to scrape")

class CrawlJobResponse(BaseModel):
    id: str
    seed_url: str
    allowed_domains: Optional[str]
    status: str
    pages_crawled: int
    pages_indexed: int
    depth_limit: int
    max_pages: int
    error_message: Optional[str]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CrawlStatsResponse(BaseModel):
    total_jobs: int
    active_jobs: int
    total_pages_crawled: int
    total_pages_indexed: int
    recent_jobs: List[CrawlJobResponse]
