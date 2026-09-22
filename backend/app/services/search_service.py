import time
import asyncio
import re
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.search import SearchMode, SearchQueryRequest, SearchResultItem, SearchResponse
from app.services.embedding_service import embedding_service
from app.services.opensearch_service import opensearch_service
from app.services.qdrant_service import qdrant_service
from app.services.web_search_service import web_search_provider
from app.core.logging import logger

class SearchCoordinatorService:
    """
    Coordinates hybrid search between OpenSearch (lexical BM25) and Qdrant (dense vector),
    applying Reciprocal Rank Fusion (RRF) and live web search fallback (DuckDuckGo + Wikipedia)
    to produce superior search result quality for literally any topic in the world.
    """
    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k  # Smoothing constant for Reciprocal Rank Fusion

    async def execute_search(self, request: SearchQueryRequest) -> SearchResponse:
        start_time = time.time()
        query = request.query.strip()
        mode = request.mode
        domain = request.domain
        page = request.page
        page_size = request.page_size
        k1_weight = request.bm25_weight
        k2_weight = request.vector_weight

        fallback_used = None
        bm25_results: List[Dict[str, Any]] = []
        vector_results: List[Dict[str, Any]] = []
        web_results: List[Dict[str, Any]] = []

        # Concurrent web search runner
        async def fetch_web():
            if domain and "nagarpalika" in domain:
                return []
            try:
                return await web_search_provider.search_live_web(query, limit=page_size * 2)
            except Exception as e:
                logger.warning(f"Web search error: {e}")
                return []

        # Dispatch queries based on mode
        if mode == SearchMode.KEYWORD:
            bm25_task = asyncio.to_thread(
                opensearch_service.search, query, limit=page_size * 3, domain_filter=domain
            )
            bm25_results, web_results = await asyncio.gather(bm25_task, fetch_web())
        elif mode == SearchMode.SEMANTIC:
            async def run_semantic():
                q_vec = await asyncio.to_thread(embedding_service.embed_text, query)
                return await asyncio.to_thread(
                    qdrant_service.search_vectors, q_vec, limit=page_size * 3, domain_filter=domain
                )
            vector_results, web_results = await asyncio.gather(run_semantic(), fetch_web())
        else: # HYBRID
            async def run_bm25():
                try:
                    return await asyncio.to_thread(
                        opensearch_service.search, query, limit=50, domain_filter=domain
                    )
                except Exception as e:
                    logger.error(f"OpenSearch BM25 failed during hybrid search: {e}")
                    return []

            async def run_vector():
                try:
                    q_vec = await asyncio.to_thread(embedding_service.embed_text, query)
                    return await asyncio.to_thread(
                        qdrant_service.search_vectors, q_vec, limit=50, domain_filter=domain
                    )
                except Exception as e:
                    logger.error(f"Qdrant vector search failed during hybrid search: {e}")
                    return []

            bm25_results, vector_results, web_results = await asyncio.gather(
                run_bm25(), run_vector(), fetch_web()
            )

        # Rank and fuse local index results
        local_ranked_items = self._fuse_results(
            mode=mode,
            bm25_results=bm25_results,
            vector_results=vector_results,
            w_bm25=k1_weight,
            w_vec=k2_weight
        )

        query_words = [w for w in re.findall(r'\b\w+\b', query.lower()) if len(w) > 1]
        all_candidates: List[Dict[str, Any]] = []

        # 1. Local items (only keep if BM25 matched or title/snippet matches query terms)
        for item in local_ranked_items:
            title_lower = item.title.lower()
            snippet_lower = item.snippet.lower()
            word_matches = sum(1 for w in query_words if w in title_lower or w in snippet_lower)

            if item.bm25_score and item.bm25_score > 0.05:
                relevance = 6.0 + item.bm25_score + (word_matches * 3.0)
            elif word_matches > 0:
                relevance = 4.0 + (word_matches * 2.5)
            elif item.vector_score and item.vector_score > 0.65:
                relevance = 2.0 + (item.vector_score * 2.0)
            else:
                # Discard unrelated local items
                continue

            all_candidates.append({"item": item, "relevance": relevance})

        # 2. Live Web items
        for w_idx, w_item in enumerate(web_results):
            title_lower = w_item["title"].lower()
            snippet_lower = w_item["snippet"].lower()
            word_matches = sum(1 for w in query_words if w in title_lower or w in snippet_lower)
            exact_phrase = query.lower() in title_lower or query.lower() in snippet_lower

            relevance = 5.0 + (6.0 if exact_phrase else 0.0) + (word_matches * 2.0) - (w_idx * 0.05)

            clean_snippet = w_item["snippet"]
            for qw in query_words:
                clean_snippet = re.sub(rf'\b({re.escape(qw)})\b', r'<em>\1</em>', clean_snippet, flags=re.IGNORECASE)

            res_item = SearchResultItem(
                id=w_item["id"],
                document_id=w_item["document_id"],
                title=w_item["title"],
                url=w_item["url"],
                domain=w_item["domain"],
                snippet=clean_snippet,
                content=w_item.get("content") or w_item["snippet"],
                author=w_item.get("author", "Live Web"),
                hybrid_score=round(relevance, 4),
                bm25_score=round(relevance, 2) if word_matches > 0 else None,
                vector_score=None,
                rank=1
            )
            all_candidates.append({"item": res_item, "relevance": relevance})

        # Sort all candidates by relevance score descending
        all_candidates.sort(key=lambda x: x["relevance"], reverse=True)

        # Deduplicate by URL and assign final 1..N ranks
        ranked_items: List[SearchResultItem] = []
        seen_urls = set()
        for entry in all_candidates:
            cand = entry["item"]
            if cand.url in seen_urls:
                continue
            seen_urls.add(cand.url)
            cand.rank = len(ranked_items) + 1
            ranked_items.append(cand)

        if not bm25_results and not vector_results and web_results:
            fallback_used = "Live Web Multi-Source (DuckDuckGo + Wikipedia)"
        elif web_results and (bm25_results or vector_results):
            fallback_used = "Hybrid Local Index + Live Web"

        total_hits = len(ranked_items)

        # Pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = ranked_items[start_idx:end_idx]

        execution_time_ms = round((time.time() - start_time) * 1000, 2)

        return SearchResponse(
            success=True,
            query=query,
            mode=mode,
            total_hits=total_hits,
            page=page,
            page_size=page_size,
            execution_time_ms=execution_time_ms,
            results=paginated_items,
            fallback_used=fallback_used
        )

    def _fuse_results(
        self,
        mode: SearchMode,
        bm25_results: List[Dict[str, Any]],
        vector_results: List[Dict[str, Any]],
        w_bm25: float,
        w_vec: float
    ) -> List[SearchResultItem]:
        """
        Fuses and deduplicates ranked document chunks.
        Applies Reciprocal Rank Fusion (RRF) when mode is HYBRID.
        """
        # Intermediate aggregation keyed by document_id
        # { doc_id: { "meta": ..., "rrf_score": float, "bm25_score": ..., "vector_score": ... } }
        fused_docs: Dict[str, Dict[str, Any]] = {}

        # 1. Process BM25 Results
        for item in bm25_results:
            doc_id = item.get("document_id") or item.get("doc_id")
            if not doc_id:
                continue

            rank = item.get("rank", 1)
            bm25_score = item.get("score", 0.0)
            rrf_contrib = (w_bm25 / (self.rrf_k + rank)) if mode == SearchMode.HYBRID else bm25_score

            if doc_id not in fused_docs:
                fused_docs[doc_id] = {
                    "id": item.get("doc_id", doc_id),
                    "document_id": doc_id,
                    "title": item.get("title", "Untitled Document"),
                    "url": item.get("url", "#"),
                    "domain": item.get("domain", ""),
                    "snippet": item.get("snippet", ""),
                    "content": item.get("content", ""),
                    "author": item.get("author", "Verified Source"),
                    "rrf_score": rrf_contrib,
                    "bm25_score": bm25_score,
                    "vector_score": None,
                }
            else:
                fused_docs[doc_id]["rrf_score"] += rrf_contrib
                if fused_docs[doc_id]["bm25_score"] is None:
                    fused_docs[doc_id]["bm25_score"] = bm25_score
                if not fused_docs[doc_id].get("content") and item.get("content"):
                    fused_docs[doc_id]["content"] = item.get("content")
                # If BM25 has rich highlights, prefer this snippet
                if "<em>" in item.get("snippet", ""):
                    fused_docs[doc_id]["snippet"] = item.get("snippet")

        # 2. Process Vector Results
        for item in vector_results:
            doc_id = item.get("document_id") or item.get("point_id")
            if not doc_id:
                continue

            rank = item.get("rank", 1)
            vector_score = item.get("score", 0.0)
            rrf_contrib = (w_vec / (self.rrf_k + rank)) if mode == SearchMode.HYBRID else vector_score

            chunk_text = item.get("chunk_text") or item.get("payload", {}).get("chunk_text", "")
            snippet = chunk_text
            if len(snippet) > 240:
                snippet = snippet[:240] + "..."

            if doc_id not in fused_docs:
                fused_docs[doc_id] = {
                    "id": item.get("point_id", doc_id),
                    "document_id": doc_id,
                    "title": item.get("title", "Untitled Document"),
                    "url": item.get("url", "#"),
                    "domain": item.get("domain", ""),
                    "snippet": snippet,
                    "content": chunk_text,
                    "author": item.get("payload", {}).get("author", "Verified Source"),
                    "rrf_score": rrf_contrib,
                    "bm25_score": None,
                    "vector_score": vector_score,
                }
            else:
                if mode == SearchMode.HYBRID:
                    fused_docs[doc_id]["rrf_score"] += rrf_contrib
                fused_docs[doc_id]["vector_score"] = vector_score
                if not fused_docs[doc_id].get("content") and chunk_text:
                    fused_docs[doc_id]["content"] = chunk_text
                # If the current snippet doesn't have keyword highlights, use this chunk text
                if not fused_docs[doc_id]["snippet"]:
                    fused_docs[doc_id]["snippet"] = snippet

        # 3. Sort by final score
        sorted_docs = sorted(
            fused_docs.values(),
            key=lambda d: d["rrf_score"],
            reverse=True
        )

        # 4. Convert to SearchResultItem schemas
        output: List[SearchResultItem] = []
        for rank, doc in enumerate(sorted_docs, start=1):
            output.append(
                SearchResultItem(
                    id=doc["id"],
                    document_id=doc["document_id"],
                    title=doc["title"],
                    url=doc["url"],
                    domain=doc["domain"],
                    snippet=doc["snippet"],
                    content=doc.get("content") or doc["snippet"],
                    author=doc.get("author") or "Verified Source",
                    hybrid_score=round(doc["rrf_score"], 5),
                    bm25_score=round(doc["bm25_score"], 3) if doc["bm25_score"] is not None else None,
                    vector_score=round(doc["vector_score"], 3) if doc["vector_score"] is not None else None,
                    rank=rank
                )
            )

        return output

    async def get_suggestions(self, prefix: str, limit: int = 6) -> List[str]:
        """Provides fast autocomplete suggestions for queries using local index and live OpenSearch."""
        p = prefix.strip().lower()
        if not p:
            return []

        suggestions = []
        seen = set()

        # 1. Check in-memory index doc titles
        for doc in opensearch_service.fallback.docs.values():
            title = doc.get("title", "")
            clean_title = title.strip()
            if p in clean_title.lower() and clean_title.lower() not in seen:
                seen.add(clean_title.lower())
                suggestions.append(clean_title)

        # 2. Query live web OpenSearch suggestions for any term
        if len(suggestions) < limit:
            try:
                live = await web_search_provider.get_live_suggestions(p, limit=limit - len(suggestions))
                for item in live:
                    if item.lower() not in seen:
                        seen.add(item.lower())
                        suggestions.append(item)
            except Exception:
                pass

        # 3. Seed high-value domain suggestions if still space
        curated_terms = [
            "hybrid search", "bm25 keyword search", "qdrant vector database",
            "nagarpalika citizen services", "property tax online payment",
            "birth and death certificate application", "municipal waste management",
            "web crawling with scrapy", "fastapi python async backend",
            "approximate nearest neighbor hnsw", "reciprocal rank fusion rrf"
        ]
        for term in curated_terms:
            if p in term and term not in seen and len(suggestions) < limit:
                seen.add(term)
                suggestions.append(term)

        return suggestions[:limit]

search_service = SearchCoordinatorService()
