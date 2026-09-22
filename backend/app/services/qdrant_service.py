import os
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models
from app.core.config import settings
from app.core.logging import logger

class QdrantService:
    """
    Service for managing vector embeddings, collection schemas, and HNSW cosine similarity search.
    Supports remote Qdrant container with automatic fallback to local embedded storage.
    """
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.client: Optional[QdrantClient] = None
        self._init_client()

    def _init_client(self):
        try:
            # Try connecting to remote Qdrant server first
            if settings.QDRANT_URL and not settings.QDRANT_URL.startswith(":memory:"):
                logger.info(f"Connecting to Qdrant cluster at {settings.QDRANT_URL}...")
                client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                    timeout=5.0
                )
                # Test connectivity
                client.get_collections()
                self.client = client
                logger.info("Successfully connected to remote Qdrant cluster.")
            else:
                raise ConnectionError("Local memory mode configured.")
        except Exception as e:
            logger.warning(
                f"Could not connect to Qdrant server at '{settings.QDRANT_URL}': {e}. "
                "Falling back to local disk-persisted Qdrant client (./qdrant_storage)."
            )
            storage_path = os.path.join(os.getcwd(), "qdrant_storage")
            os.makedirs(storage_path, exist_ok=True)
            self.client = QdrantClient(path=storage_path)

        self._ensure_collection()

    def _ensure_collection(self):
        """Creates the collection if it does not exist with Cosine distance and 384 dimensions."""
        if self.client is None:
            return
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                logger.info(f"Creating Qdrant collection '{self.collection_name}' (dim={settings.EMBEDDING_DIMENSION}, metric=Cosine)...")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=rest_models.VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=rest_models.Distance.COSINE
                    )
                )
                logger.info(f"Qdrant collection '{self.collection_name}' created.")
        except Exception as e:
            logger.error(f"Error ensuring Qdrant collection: {e}")

    def upsert_chunks(self, chunks_data: List[Dict[str, Any]]):
        """
        Upserts a batch of chunk vectors into Qdrant.
        Each item in chunks_data must contain:
        - point_id (UUID string)
        - vector (List[float])
        - payload (Dict with document_id, url, domain, title, chunk_text, chunk_index)
        """
        if not self.client or not chunks_data:
            return

        points = []
        for item in chunks_data:
            points.append(
                rest_models.PointStruct(
                    id=item["point_id"],
                    vector=item["vector"],
                    payload=item["payload"]
                )
            )

        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.debug(f"Upserted {len(points)} vectors to Qdrant.")
        except Exception as e:
            logger.error(f"Failed to upsert points to Qdrant: {e}")
            raise

    def search_vectors(
        self,
        query_vector: List[float],
        limit: int = 50,
        domain_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs approximate nearest neighbor search using Cosine similarity.
        Returns list of matched points with score, payload, and rank.
        """
        if not self.client:
            return []

        query_filter = None
        if domain_filter:
            query_filter = rest_models.Filter(
                must=[
                    rest_models.FieldCondition(
                        key="domain",
                        match=rest_models.MatchValue(value=domain_filter)
                    )
                ]
            )

        try:
            if hasattr(self.client, "query_points"):
                resp = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                    with_payload=True
                )
                hits = resp.points
            else:
                hits = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                    with_payload=True
                )

            results = []
            for rank, hit in enumerate(hits, start=1):
                results.append({
                    "point_id": str(hit.id),
                    "score": float(hit.score),
                    "rank": rank,
                    "document_id": hit.payload.get("document_id"),
                    "url": hit.payload.get("url"),
                    "domain": hit.payload.get("domain"),
                    "title": hit.payload.get("title"),
                    "chunk_text": hit.payload.get("chunk_text"),
                    "chunk_index": hit.payload.get("chunk_index")
                })
            return results
        except Exception as e:
            logger.error(f"Error executing vector search on Qdrant: {e}")
            return []

    def get_stats(self) -> Dict[str, Any]:
        """Returns collection stats."""
        if not self.client:
            return {"status": "unavailable", "vector_count": 0}
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "status": "connected",
                "vector_count": info.points_count or 0,
                "segments_count": info.segments_count or 0,
            }
        except Exception as e:
            return {"status": "error", "message": str(e), "vector_count": 0}

qdrant_service = QdrantService()
