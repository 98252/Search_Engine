import re
import uuid
import hashlib
import asyncio
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin
from typing import List, Dict, Any, Optional, Set
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.core.config import settings
from app.core.logging import logger
from app.models.document import Document, DocumentChunk
from app.models.crawl_job import CrawlJob
from app.services.embedding_service import embedding_service
from app.services.opensearch_service import opensearch_service
from app.services.qdrant_service import qdrant_service

class CrawlerService:
    """
    Manages document ingestion, chunking, vector embedding, and automated web crawling.
    """

    async def index_document(
        self,
        db: AsyncSession,
        url: str,
        title: str,
        content: str,
        domain: Optional[str] = None,
        description: Optional[str] = None,
        crawl_job_id: Optional[str] = None
    ) -> Document:
        """
        Processes and indexes a single document into PostgreSQL, OpenSearch, and Qdrant.
        """
        clean_url = url.strip()
        parsed_domain = domain or urlparse(clean_url).netloc or "local"
        content_hash = hashlib.sha256(content.strip().encode("utf-8")).hexdigest()

        # Check for existing document by URL or content hash (deduplication)
        stmt = select(Document).where(
            (Document.url == clean_url) | (Document.content_hash == content_hash)
        )
        result = await db.execute(stmt)
        existing_doc = result.scalar_one_or_none()

        if existing_doc:
            logger.info(f"Document '{clean_url}' already indexed (ID: {existing_doc.id}). Updating content.")
            doc = existing_doc
            doc.title = title
            doc.cleaned_content = content
            doc.content_hash = content_hash
            doc.crawled_at = datetime.now(timezone.utc)
            # Delete old chunks
            del_stmt = select(DocumentChunk).where(DocumentChunk.document_id == doc.id)
            chunks_res = await db.execute(del_stmt)
            for c in chunks_res.scalars().all():
                await db.delete(c)
        else:
            doc = Document(
                id=str(uuid.uuid4()),
                crawl_job_id=crawl_job_id,
                url=clean_url,
                domain=parsed_domain,
                title=title,
                description=description,
                raw_content=content,
                cleaned_content=content,
                content_hash=content_hash,
                crawled_at=datetime.now(timezone.utc)
            )
            db.add(doc)

        await db.flush()

        # Chunk the content
        chunks_text = embedding_service.chunk_text(content, chunk_size_chars=1200, overlap_chars=200)
        if not chunks_text:
            chunks_text = [title]

        # Embed all chunks in batch
        vectors = await asyncio.to_thread(embedding_service.embed_batch, chunks_text)

        # Prepare records for DB, OpenSearch, and Qdrant
        qdrant_payloads = []
        for i, (chunk_text, vector) in enumerate(zip(chunks_text, vectors)):
            chunk_id = str(uuid.uuid4())
            qdrant_point_id = chunk_id
            opensearch_doc_id = f"{doc.id}_{i}"

            # Create DB chunk
            chunk_db = DocumentChunk(
                id=chunk_id,
                document_id=doc.id,
                chunk_index=i,
                chunk_text=chunk_text,
                token_count=len(chunk_text.split()),
                qdrant_point_id=qdrant_point_id,
                opensearch_doc_id=opensearch_doc_id,
                created_at=datetime.now(timezone.utc)
            )
            db.add(chunk_db)

            # OpenSearch BM25 Index
            await asyncio.to_thread(
                opensearch_service.index_chunk,
                doc_id=opensearch_doc_id,
                title=doc.title,
                chunk_text=chunk_text,
                payload={
                    "document_id": doc.id,
                    "url": doc.url,
                    "domain": doc.domain,
                    "chunk_index": i,
                    "crawled_at": doc.crawled_at.isoformat()
                }
            )

            # Qdrant Vector Payload
            qdrant_payloads.append({
                "point_id": qdrant_point_id,
                "vector": vector,
                "payload": {
                    "document_id": doc.id,
                    "url": doc.url,
                    "domain": doc.domain,
                    "title": doc.title,
                    "chunk_text": chunk_text,
                    "chunk_index": i
                }
            })

        # Upsert vectors into Qdrant
        if qdrant_payloads:
            await asyncio.to_thread(qdrant_service.upsert_chunks, qdrant_payloads)

        await db.commit()
        await db.refresh(doc)
        logger.info(f"Indexed document '{title}' ({doc.url}) with {len(chunks_text)} chunks.")
        return doc

    async def execute_crawl(
        self,
        job_id: str,
        seed_url: str,
        allowed_domains: Optional[str],
        depth_limit: int,
        max_pages: int,
        db_factory
    ):
        """
        High-throughput asynchronous web crawler with HTML extraction,
        robot etiquette, rate-limiting, and direct indexing.
        """
        logger.info(f"Starting crawl job {job_id} on seed URL '{seed_url}'...")
        start_domain = urlparse(seed_url).netloc
        domains_whitelist = [d.strip() for d in allowed_domains.split(",")] if allowed_domains else [start_domain]

        visited_urls: Set[str] = set()
        queue: List[Tuple[str, int]] = [(seed_url, 0)]  # (url, depth)
        pages_crawled = 0
        pages_indexed = 0

        async with db_factory() as session:
            await session.execute(
                update(CrawlJob)
                .where(CrawlJob.id == job_id)
                .values(status="running", started_at=datetime.now(timezone.utc))
            )
            await session.commit()

        client_headers = {"User-Agent": settings.CRAWLER_USER_AGENT}

        async with httpx.AsyncClient(headers=client_headers, timeout=12.0, follow_redirects=True) as client:
            while queue and pages_crawled < max_pages:
                current_url, current_depth = queue.pop(0)
                if current_url in visited_urls:
                    continue
                visited_urls.add(current_url)

                try:
                    await asyncio.sleep(settings.CRAWLER_DOWNLOAD_DELAY)
                    response = await client.get(current_url)
                    if response.status_code != 200 or "text/html" not in response.headers.get("content-type", ""):
                        continue

                    pages_crawled += 1

                    # Extract clean HTML content
                    html = response.text
                    soup = BeautifulSoup(html, "html.parser")

                    # Remove script, style, nav, footer tags
                    for tag in soup(["script", "style", "nav", "footer", "aside", "header"]):
                        tag.decompose()

                    title = soup.title.string.strip() if soup.title and soup.title.string else current_url
                    text_content = soup.get_text(separator=" ", strip=True)

                    # Only index if content has substantial text (> 50 words)
                    if len(text_content.split()) >= 30:
                        async with db_factory() as session:
                            await self.index_document(
                                db=session,
                                url=current_url,
                                title=title,
                                content=text_content,
                                domain=urlparse(current_url).netloc,
                                crawl_job_id=job_id
                            )
                        pages_indexed += 1

                    # Discover links if within depth limit
                    if current_depth < depth_limit:
                        for a_tag in soup.find_all("a", href=True):
                            href = a_tag["href"]
                            full_url = urljoin(current_url, href)
                            parsed_next = urlparse(full_url)
                            # Only follow HTTP/HTTPS within whitelisted domains
                            if parsed_next.scheme in ["http", "https"]:
                                if any(d in parsed_next.netloc for d in domains_whitelist):
                                    # Normalize URL (strip fragment)
                                    normalized = f"{parsed_next.scheme}://{parsed_next.netloc}{parsed_next.path}"
                                    if parsed_next.query:
                                        normalized += f"?{parsed_next.query}"
                                    if normalized not in visited_urls:
                                        queue.append((normalized, current_depth + 1))

                    # Update progress in DB every 3 pages
                    if pages_crawled % 3 == 0 or pages_crawled == max_pages:
                        async with db_factory() as session:
                            await session.execute(
                                update(CrawlJob)
                                .where(CrawlJob.id == job_id)
                                .values(pages_crawled=pages_crawled, pages_indexed=pages_indexed)
                            )
                            await session.commit()

                except Exception as e:
                    logger.warning(f"Error crawling URL '{current_url}': {e}")

        # Mark job finished
        async with db_factory() as session:
            await session.execute(
                update(CrawlJob)
                .where(CrawlJob.id == job_id)
                .values(
                    status="completed",
                    pages_crawled=pages_crawled,
                    pages_indexed=pages_indexed,
                    finished_at=datetime.now(timezone.utc)
                )
            )
            await session.commit()
        logger.info(f"Crawl job {job_id} finished. Crawled: {pages_crawled}, Indexed: {pages_indexed}")

crawler_service = CrawlerService()
