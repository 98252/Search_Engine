import re
import math
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.core.config import settings
from app.core.logging import logger

try:
    from opensearchpy import OpenSearch, RequestsHttpConnection
except ImportError:
    OpenSearch = None

class InvertedBM25Fallback:
    """
    High-performance in-memory BM25 index used when OpenSearch is not reachable.
    Guarantees zero-dependency local execution for university demos & offline testing.
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs: Dict[str, Dict[str, Any]] = {}
        self.inverted_index: Dict[str, List[str]] = defaultdict(list)
        self.doc_lengths: Dict[str, int] = {}
        self.avg_doc_len: float = 0.0

    def tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9_]+\b', text.lower())

    def index_document(self, doc_id: str, title: str, text: str, payload: Dict[str, Any]):
        tokens = self.tokenize(f"{title} {title} {text}")
        doc_len = len(tokens)
        self.doc_lengths[doc_id] = doc_len
        self.docs[doc_id] = {
            "title": title,
            "text": text,
            "payload": payload,
            "term_freqs": defaultdict(int)
        }
        for token in tokens:
            self.docs[doc_id]["term_freqs"][token] += 1
            if doc_id not in self.inverted_index[token]:
                self.inverted_index[token].append(doc_id)

        total_len = sum(self.doc_lengths.values())
        self.avg_doc_len = total_len / max(len(self.doc_lengths), 1)

    def search(self, query: str, limit: int = 50, domain_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        query_tokens = self.tokenize(query)
        if not query_tokens or not self.docs:
            return []

        num_docs = len(self.docs)
        scores: Dict[str, float] = defaultdict(float)

        for token in query_tokens:
            posting = self.inverted_index.get(token, [])
            df = len(posting)
            if df == 0:
                continue
            # Standard BM25 IDF
            idf = math.log((num_docs - df + 0.5) / (df + 0.5) + 1.0)
            for doc_id in posting:
                doc = self.docs[doc_id]
                if domain_filter and doc["payload"].get("domain") != domain_filter:
                    continue
                tf = doc["term_freqs"][token]
                doc_len = self.doc_lengths[doc_id]
                score = idf * (tf * (self.k1 + 1)) / (tf + self.k1 * (1 - self.b + self.b * (doc_len / max(self.avg_doc_len, 1))))
                scores[doc_id] += score

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:limit]
        results = []
        for rank, (doc_id, score) in enumerate(ranked, start=1):
            doc = self.docs[doc_id]
            # Generate highlighted snippet
            snippet = self._generate_snippet(doc["text"], query_tokens)
            results.append({
                "doc_id": doc_id,
                "score": float(score),
                "rank": rank,
                "title": doc["title"],
                "snippet": snippet,
                "document_id": doc["payload"].get("document_id"),
                "url": doc["payload"].get("url"),
                "domain": doc["payload"].get("domain"),
                "content": doc["text"],
                "author": doc["payload"].get("author", "Verified Source"),
                "chunk_index": doc["payload"].get("chunk_index")
            })
        return results

    def _generate_snippet(self, text: str, query_tokens: List[str], max_words: int = 40) -> str:
        words = text.split()
        if not words:
            return ""
        # Find first matching word index
        first_match = 0
        for i, word in enumerate(words):
            clean_word = re.sub(r'\W+', '', word).lower()
            if clean_word in query_tokens:
                first_match = i
                break
        
        start = max(0, first_match - 10)
        end = min(len(words), start + max_words)
        snippet_words = words[start:end]

        # Highlight matches
        highlighted = []
        for w in snippet_words:
            clean_w = re.sub(r'\W+', '', w).lower()
            if clean_w in query_tokens:
                highlighted.append(f"<em>{w}</em>")
            else:
                highlighted.append(w)

        snippet = " ".join(highlighted)
        if start > 0:
            snippet = "... " + snippet
        if end < len(words):
            snippet = snippet + " ..."
        return snippet


class OpenSearchService:
    """
    Service managing OpenSearch BM25 inverted indexing, highlighted snippets, and fuzzy search.
    Automatically degrades to in-memory InvertedBM25Fallback if OpenSearch cluster is offline.
    """
    def __init__(self):
        self.index_name = settings.OPENSEARCH_INDEX_NAME
        self.client: Optional[OpenSearch] = None
        self.fallback = InvertedBM25Fallback()
        self.is_connected = False
        self._init_client()

    def _init_client(self):
        if OpenSearch is None:
            logger.warning("opensearch-py not installed. Running in BM25 fallback mode.")
            return

        try:
            logger.info(f"Connecting to OpenSearch at {settings.OPENSEARCH_HOST}:{settings.OPENSEARCH_PORT}...")
            client = OpenSearch(
                hosts=[{'host': settings.OPENSEARCH_HOST, 'port': settings.OPENSEARCH_PORT}],
                http_auth=(settings.OPENSEARCH_USER, settings.OPENSEARCH_PASSWORD),
                use_ssl=settings.OPENSEARCH_USE_SSL,
                verify_certs=settings.OPENSEARCH_VERIFY_CERTS,
                connection_class=RequestsHttpConnection,
                timeout=5.0
            )
            # Test ping
            info = client.info()
            self.client = client
            self.is_connected = True
            logger.info(f"Connected to OpenSearch cluster: {info.get('version', {}).get('number')}")
            self._ensure_index()
        except Exception as e:
            logger.warning(
                f"Could not connect to OpenSearch cluster: {e}. "
                "SmartSearch AI will use in-memory BM25 index until OpenSearch is available."
            )
            self.is_connected = False

    def _ensure_index(self):
        """Creates the search index with BM25 mappings and custom highlighting tags."""
        if not self.is_connected or not self.client:
            return

        try:
            if not self.client.indices.exists(index=self.index_name):
                mapping = {
                    "settings": {
                        "index": {
                            "number_of_shards": 1,
                            "number_of_replicas": 0,
                            "similarity": {
                                "default": {
                                    "type": "BM25",
                                    "b": 0.75,
                                    "k1": 1.5
                                }
                            }
                        }
                    },
                    "mappings": {
                        "properties": {
                            "doc_id": {"type": "keyword"},
                            "document_id": {"type": "keyword"},
                            "url": {"type": "keyword"},
                            "domain": {"type": "keyword"},
                            "title": {
                                "type": "text",
                                "analyzer": "standard",
                                "fields": {"keyword": {"type": "keyword"}}
                            },
                            "chunk_text": {
                                "type": "text",
                                "analyzer": "standard"
                            },
                            "chunk_index": {"type": "integer"},
                            "crawled_at": {"type": "date"}
                        }
                    }
                }
                self.client.indices.create(index=self.index_name, body=mapping)
                logger.info(f"OpenSearch index '{self.index_name}' created successfully.")
        except Exception as e:
            logger.error(f"Error creating OpenSearch index: {e}")

    def index_chunk(self, doc_id: str, title: str, chunk_text: str, payload: Dict[str, Any]):
        """Indexes a chunk into OpenSearch and the fallback index."""
        # Always index into fallback for quick retrieval/redundancy
        self.fallback.index_document(doc_id, title, chunk_text, payload)

        if not self.is_connected or not self.client:
            return

        body = {
            "doc_id": doc_id,
            "document_id": payload.get("document_id"),
            "url": payload.get("url"),
            "domain": payload.get("domain"),
            "title": title,
            "chunk_text": chunk_text,
            "chunk_index": payload.get("chunk_index"),
            "crawled_at": payload.get("crawled_at")
        }
        try:
            self.client.index(index=self.index_name, id=doc_id, body=body)
        except Exception as e:
            logger.error(f"Failed to index chunk into OpenSearch: {e}")

    def search(
        self,
        query: str,
        limit: int = 50,
        domain_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes BM25 keyword search with highlighting.
        Uses OpenSearch if online, otherwise transparently serves from fallback index.
        """
        if not self.is_connected or not self.client:
            return self.fallback.search(query, limit, domain_filter)

        must_clause = [
            {
                "multi_match": {
                    "query": query,
                    "fields": ["title^2.5", "chunk_text^1.0"],
                    "fuzziness": "AUTO",
                    "operator": "or"
                }
            }
        ]

        if domain_filter:
            must_clause.append({"term": {"domain": domain_filter}})

        body = {
            "size": limit,
            "query": {"bool": {"must": must_clause}},
            "highlight": {
                "fields": {
                    "title": {"number_of_fragments": 0},
                    "chunk_text": {
                        "fragment_size": 250,
                        "number_of_fragments": 1,
                        "pre_tags": ["<em>"],
                        "post_tags": ["</em>"]
                    }
                }
            }
        }

        try:
            response = self.client.search(index=self.index_name, body=body)
            hits = response.get("hits", {}).get("hits", [])
            results = []
            for rank, hit in enumerate(hits, start=1):
                source = hit.get("_source", {})
                highlights = hit.get("highlight", {})
                snippet = ""
                if "chunk_text" in highlights and highlights["chunk_text"]:
                    snippet = highlights["chunk_text"][0]
                else:
                    snippet = source.get("chunk_text", "")[:250] + "..."

                title_highlight = source.get("title", "")
                if "title" in highlights and highlights["title"]:
                    title_highlight = highlights["title"][0]

                results.append({
                    "doc_id": hit.get("_id"),
                    "score": float(hit.get("_score", 0.0)),
                    "rank": rank,
                    "title": title_highlight,
                    "snippet": snippet,
                    "document_id": source.get("document_id"),
                    "url": source.get("url"),
                    "domain": source.get("domain"),
                    "content": source.get("chunk_text", ""),
                    "author": source.get("author", "Verified Source"),
                    "chunk_index": source.get("chunk_index")
                })
            return results
        except Exception as e:
            logger.error(f"OpenSearch query failed: {e}. Falling back to in-memory BM25.")
            return self.fallback.search(query, limit, domain_filter)

    def get_stats(self) -> Dict[str, Any]:
        """Returns index statistics."""
        if not self.is_connected or not self.client:
            return {
                "status": "fallback_mode (OpenSearch offline, in-memory BM25 active)",
                "document_count": len(self.fallback.docs)
            }
        try:
            stats = self.client.indices.stats(index=self.index_name)
            doc_count = stats["indices"][self.index_name]["total"]["docs"]["count"]
            return {"status": "connected", "document_count": doc_count}
        except Exception as e:
            return {"status": "error", "message": str(e), "document_count": len(self.fallback.docs)}

opensearch_service = OpenSearchService()
