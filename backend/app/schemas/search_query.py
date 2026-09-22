from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class SearchQueryCreate(BaseModel):
    query_text: str = Field(..., min_length=1, max_length=512)
    search_mode: Optional[str] = "hybrid"
    execution_time_ms: Optional[int] = 0
    results_count: Optional[int] = 0

class SearchQueryResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    query_text: str
    search_mode: str
    execution_time_ms: int
    results_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SearchResultCreate(BaseModel):
    query_id: str
    document_id: Optional[str] = None
    webpage_id: Optional[str] = None
    rank_position: int
    score: float = 0.0

class SearchResultResponse(BaseModel):
    id: str
    query_id: str
    document_id: Optional[str] = None
    webpage_id: Optional[str] = None
    rank_position: int
    score: float
    clicked: bool
    clicked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
