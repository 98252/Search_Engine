from fastapi import APIRouter
from app.api.v1 import auth, search, crawler, documents, analytics, webpages, bookmarks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(documents.router, prefix="/documents", tags=["Document Management"])
api_router.include_router(webpages.router, prefix="/webpages", tags=["Webpages"])
api_router.include_router(bookmarks.router, prefix="/bookmarks", tags=["Bookmarks"])
api_router.include_router(search.router, prefix="/search", tags=["Search Engine"])
api_router.include_router(crawler.router, prefix="/crawler", tags=["Web Crawler"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Telemetry & Analytics"])
