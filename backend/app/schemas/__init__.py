from app.schemas.auth import Token, UserCreate, UserLogin, UserResponse
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListResponse
from app.schemas.webpage import WebpageCreate, WebpageUpdate, WebpageResponse, WebpageListResponse
from app.schemas.crawl_job import CrawlJobCreate, CrawlJobUpdate, CrawlJobResponse
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate, BookmarkResponse
from app.schemas.search_query import (
    SearchQueryCreate, SearchQueryResponse,
    SearchResultCreate, SearchResultResponse
)

__all__ = [
    "Token", "UserCreate", "UserLogin", "UserResponse",
    "DocumentCreate", "DocumentUpdate", "DocumentResponse", "DocumentListResponse",
    "WebpageCreate", "WebpageUpdate", "WebpageResponse", "WebpageListResponse",
    "CrawlJobCreate", "CrawlJobUpdate", "CrawlJobResponse",
    "BookmarkCreate", "BookmarkUpdate", "BookmarkResponse",
    "SearchQueryCreate", "SearchQueryResponse",
    "SearchResultCreate", "SearchResultResponse",
]
