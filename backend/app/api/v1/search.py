import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, status, HTTPException, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.api.deps import get_db, get_optional_user
from app.models.user import User
from app.models.analytics import SearchQuery, SearchResult, QueryClick
from app.schemas.search import (
    SearchQueryRequest,
    SearchResponse,
    SuggestionResponse,
    ClickLogRequest,
    SearchHistoryItemResponse,
    SearchHistoryListResponse,
)
from app.services.search_service import search_service

router = APIRouter()

@router.post("", response_model=SearchResponse)
async def search_endpoint(
    request: SearchQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Execute Hybrid, Semantic (Vector), or Lexical (BM25) search with Reciprocal Rank Fusion.
    Automatically logs query telemetry.
    """
    response = await search_service.execute_search(request)

    # Asynchronously log search query to analytics table
    try:
        log_entry = SearchQuery(
            id=str(uuid.uuid4()),
            user_id=current_user.id if current_user else None,
            query_text=request.query,
            search_mode=request.mode.value,
            execution_time_ms=int(response.execution_time_ms),
            results_count=response.total_hits
        )
        db.add(log_entry)
        await db.commit()
    except Exception:
        pass  # Non-blocking telemetry

    return response

@router.get("/suggest", response_model=SuggestionResponse)
async def suggest_endpoint(q: str = Query(..., min_length=1, max_length=100)):
    """Provides typeahead autocomplete suggestions for search terms."""
    suggestions = await search_service.get_suggestions(q)
    return SuggestionResponse(query=q, suggestions=suggestions)

@router.post("/click", status_code=status.HTTP_201_CREATED)
async def log_click(click_data: ClickLogRequest, db: AsyncSession = Depends(get_db)):
    """Log when a user clicks on a search result item for ranking evaluation."""
    from datetime import datetime, timezone
    click = SearchResult(
        query_id=click_data.query_id or str(uuid.uuid4()),
        document_id=click_data.document_id,
        rank_position=click_data.rank_position,
        score=1.0,
        clicked=True,
        clicked_at=datetime.now(timezone.utc)
    )
    db.add(click)
    await db.commit()
    return {"status": "recorded"}

@router.get("/reader")
async def reader_endpoint(
    url: str = Query(..., description="Target webpage URL to extract clean reader view"),
    title: Optional[str] = Query("", description="Title hint from search results"),
    snippet: Optional[str] = Query("", description="Snippet hint from search results")
):
    """
    Distraction-Free Instant Reader API.
    Extracts full article content, key takeaways, headings, and metadata.
    """
    from app.services.reader_service import reader_service
    return await reader_service.get_reader_article(url, title_hint=title or "", snippet_hint=snippet or "")

@router.get("/history", response_model=SearchHistoryListResponse)
async def get_search_history(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Retrieve user search history with timestamps, mode, and results count.
    """
    stmt = select(SearchQuery)
    if current_user:
        stmt = stmt.where(SearchQuery.user_id == current_user.id)
    stmt = stmt.order_by(SearchQuery.created_at.desc()).limit(limit)
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    items = [
        SearchHistoryItemResponse(
            id=r.id,
            query_text=r.query_text,
            search_mode=r.search_mode,
            results_count=r.results_count,
            execution_time_ms=r.execution_time_ms,
            created_at=r.created_at.isoformat() if r.created_at else ""
        )
        for r in records
    ]
    return SearchHistoryListResponse(items=items, total=len(items))

@router.delete("/history/{query_id}", status_code=status.HTTP_200_OK)
async def delete_search_history_item(
    query_id: str = Path(..., description="ID of the search query to delete"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Delete a specific search query item from history.
    """
    stmt = delete(SearchQuery).where(SearchQuery.id == query_id)
    if current_user:
        stmt = stmt.where(SearchQuery.user_id == current_user.id)
    
    res = await db.execute(stmt)
    await db.commit()
    return {"status": "deleted", "id": query_id}

@router.delete("/history", status_code=status.HTTP_200_OK)
async def clear_search_history(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Clear all search query history.
    """
    stmt = delete(SearchQuery)
    if current_user:
        stmt = stmt.where(SearchQuery.user_id == current_user.id)
    
    await db.execute(stmt)
    await db.commit()
    return {"status": "cleared"}


@router.post("/voice-transcribe")
async def voice_transcribe(
    file: UploadFile = File(...),
    lang: str = Query("en-IN")
):
    """
    Direct Server-Side Audio Transcription Endpoint.
    Transcribes uploaded WAV audio stream when browser Web Speech API encounters network/CORS/Brave blocks.
    """
    import io
    import speech_recognition as sr

    try:
        content = await file.read()
        if not content or len(content) < 500:
            return {"transcript": "", "message": "Audio recording too short"}

        r = sr.Recognizer()
        with sr.AudioFile(io.BytesIO(content)) as source:
            audio_data = r.record(source)

        try:
            transcript = r.recognize_google(audio_data, language=lang)
            return {"transcript": transcript, "language": lang}
        except sr.UnknownValueError:
            return {"transcript": "", "message": "No audible speech detected"}
        except sr.RequestError:
            # Fallback to en-US if requested language failed
            if lang != "en-US":
                try:
                    transcript = r.recognize_google(audio_data, language="en-US")
                    return {"transcript": transcript, "language": "en-US"}
                except Exception:
                    pass
            return {"transcript": "", "message": "Transcription service temporarily unreachable"}
    except Exception as e:
        return {"transcript": "", "error": str(e)}


