from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class SearchMode(str, Enum):
    HYBRID = "hybrid"
    SEMANTIC = "semantic"
    KEYWORD = "keyword"

class SearchQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="The user search query")
    mode: SearchMode = Field(default=SearchMode.HYBRID, description="Search retrieval mode")
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=10, ge=1, le=100, description="Results per page")
    domain: Optional[str] = Field(default=None, description="Optional domain filter (e.g. 'wikipedia.org')")
    bm25_weight: float = Field(default=0.5, ge=0.0, le=1.0, description="Weight for BM25 keyword rank in RRF")
    vector_weight: float = Field(default=0.5, ge=0.0, le=1.0, description="Weight for semantic vector rank in RRF")

class SearchResultItem(BaseModel):
    id: str
    document_id: str
    title: str
    url: str
    domain: str
    snippet: str
    content: Optional[str] = None
    author: Optional[str] = None
    hybrid_score: float
    bm25_score: Optional[float] = None
    vector_score: Optional[float] = None
    rank: int

class SearchResponse(BaseModel):
    success: bool = True
    query: str
    mode: SearchMode
    total_hits: int
    page: int
    page_size: int
    execution_time_ms: float
    results: List[SearchResultItem]
    fallback_used: Optional[str] = None

class SuggestionResponse(BaseModel):
    query: str
    suggestions: List[str]

class ClickLogRequest(BaseModel):
    query_id: Optional[str] = None
    document_id: str
    rank_position: int

class SearchHistoryItemResponse(BaseModel):
    id: str
    query_text: str
    search_mode: str
    results_count: int
    execution_time_ms: int
    created_at: str

class SearchHistoryListResponse(BaseModel):
    items: List[SearchHistoryItemResponse]
    total: int
