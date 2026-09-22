import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal, init_db
from app.models.user import User
from app.models.document import Document
from app.models.webpage import Webpage
from app.models.crawl_job import CrawlJob
from app.models.search_query import SearchQuery
from app.models.search_result import SearchResult
from app.models.bookmark import Bookmark

@pytest.mark.asyncio
async def test_all_database_operations():
    await init_db()
    async with AsyncSessionLocal() as db:
        # 1. Test User
        user_id = str(uuid.uuid4())
        test_user = User(
            id=user_id,
            email=f"test_{user_id[:8]}@example.com",
            hashed_password="hashed_sample_password",
            full_name="Database Test User",
            role="user"
        )
        db.add(test_user)
        await db.commit()

        queried_user = await db.scalar(select(User).where(User.id == user_id))
        assert queried_user is not None
        assert queried_user.email == test_user.email

        # 2. Test Document (all required fields)
        doc_id = str(uuid.uuid4())
        doc = Document(
            id=doc_id,
            title="PostgreSQL Indexing Best Practices",
            content="B-tree, GIN, and GiST indexes accelerate lookups and inverted indexing.",
            url="https://postgresql.org/docs/indexing",
            source="crawler",
            author="PostgreSQL Global Group",
            status="pending"
        )
        db.add(doc)
        await db.commit()

        queried_doc = await db.scalar(select(Document).where(Document.id == doc_id))
        assert queried_doc is not None
        assert queried_doc.title == "PostgreSQL Indexing Best Practices"
        assert queried_doc.author == "PostgreSQL Global Group"
        assert queried_doc.status == "pending"

        # 3. Test Webpage
        webpage_id = str(uuid.uuid4())
        page = Webpage(
            id=webpage_id,
            url=f"https://example.com/page-{webpage_id[:8]}",
            domain="example.com",
            title="Sample Crawled Page",
            content="Main article text content extracted by crawler.",
            description="Meta description preview",
            status="crawled"
        )
        db.add(page)
        await db.commit()

        queried_page = await db.scalar(select(Webpage).where(Webpage.id == webpage_id))
        assert queried_page is not None
        assert queried_page.domain == "example.com"
        assert queried_page.status == "crawled"

        # 4. Test CrawlJob
        job_id = str(uuid.uuid4())
        job = CrawlJob(
            id=job_id,
            seed_url="https://en.wikipedia.org/wiki/Search_engine",
            status="running",
            pages_found=15,
            pages_processed=10,
            started_at=datetime.now(timezone.utc)
        )
        db.add(job)
        await db.commit()

        queried_job = await db.scalar(select(CrawlJob).where(CrawlJob.id == job_id))
        assert queried_job is not None
        assert queried_job.pages_found == 15
        assert queried_job.pages_processed == 10
        assert queried_job.status == "running"

        # 5. Test SearchQuery
        query_id = str(uuid.uuid4())
        query = SearchQuery(
            id=query_id,
            user_id=user_id,
            query_text="approximate nearest neighbor HNSW",
            search_mode="hybrid",
            execution_time_ms=25,
            results_count=10
        )
        db.add(query)
        await db.commit()

        queried_query = await db.scalar(select(SearchQuery).where(SearchQuery.id == query_id))
        assert queried_query is not None
        assert queried_query.query_text == "approximate nearest neighbor HNSW"
        assert queried_query.execution_time_ms == 25

        # 6. Test SearchResult
        result_id = str(uuid.uuid4())
        search_res = SearchResult(
            id=result_id,
            query_id=query_id,
            document_id=doc_id,
            rank_position=1,
            score=0.945,
            clicked=True,
            clicked_at=datetime.now(timezone.utc)
        )
        db.add(search_res)
        await db.commit()

        queried_res = await db.scalar(select(SearchResult).where(SearchResult.id == result_id))
        assert queried_res is not None
        assert queried_res.rank_position == 1
        assert queried_res.clicked is True

        # 7. Test Bookmark
        bookmark_id = str(uuid.uuid4())
        bookmark = Bookmark(
            id=bookmark_id,
            user_id=user_id,
            document_id=doc_id,
            title="Saved: PostgreSQL Indexing Best Practices",
            url=doc.url,
            notes="Must read for database performance tuning."
        )
        db.add(bookmark)
        await db.commit()

        queried_bm = await db.scalar(select(Bookmark).where(Bookmark.id == bookmark_id))
        assert queried_bm is not None
        assert queried_bm.user_id == user_id
        assert queried_bm.notes == "Must read for database performance tuning."
