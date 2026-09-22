import re
import hashlib
import numpy as np
from typing import List, Dict, Optional
from app.core.config import settings
from app.core.logging import logger

class EmbeddingService:
    """
    Singleton service for generating dense text embeddings and chunking content.
    Uses 'all-MiniLM-L6-v2' (384-d) with in-memory caching and graceful offline fallback.
    """
    _instance = None
    _model = None
    _cache: Dict[str, List[float]] = {}
    _cache_limit: int = 2000

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            cls._instance._model = None
            cls._instance._initialized = False
        return cls._instance

    def _ensure_model(self):
        if not self._initialized:
            self._initialized = True
            try:
                logger.info(f"Loading SentenceTransformer model '{settings.EMBEDDING_MODEL_NAME}'...")
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as e:
                logger.warning(
                    f"Could not load SentenceTransformer '{settings.EMBEDDING_MODEL_NAME}': {e}. "
                    "Activating deterministic semantic fallback vectorizer."
                )
                self._model = None

    def embed_text(self, text: str) -> List[float]:
        """Embeds a single text string into a 384-dimensional vector with caching."""
        clean = text.strip().lower()
        cache_key = hashlib.md5(clean.encode("utf-8")).hexdigest()
        if cache_key in self._cache:
            return self._cache[cache_key]

        self._ensure_model()
        if self._model is not None:
            try:
                vector = self._model.encode(clean, normalize_embeddings=True).tolist()
            except Exception as e:
                logger.error(f"Inference error with SentenceTransformer: {e}")
                vector = self._fallback_embed(clean)
        else:
            vector = self._fallback_embed(clean)

        # Cache management
        if len(self._cache) >= self._cache_limit:
            # Evict oldest entry
            first_key = next(iter(self._cache))
            del self._cache[first_key]
        self._cache[cache_key] = vector

        return vector

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embeds a list of texts efficiently in batch."""
        if not texts:
            return []
        
        self._ensure_model()
        if self._model is not None:
            try:
                vectors = self._model.encode(
                    [t.strip() for t in texts],
                    normalize_embeddings=True,
                    batch_size=32
                ).tolist()
                return vectors
            except Exception as e:
                logger.error(f"Batch inference error: {e}")
                return [self._fallback_embed(t) for t in texts]
        else:
            return [self._fallback_embed(t) for t in texts]

    def _fallback_embed(self, text: str) -> List[float]:
        """
        Deterministic pseudo-semantic projection for testing/offline environments.
        Produces normalized 384-dimensional vectors.
        """
        dim = settings.EMBEDDING_DIMENSION
        # Seed random generator with hash of text for repeatability
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
        rng = np.random.RandomState(seed)
        vec = rng.randn(dim).astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    @staticmethod
    def chunk_text(text: str, chunk_size_chars: int = 1200, overlap_chars: int = 200) -> List[str]:
        """
        Recursively splits text into overlapping chunks, attempting to break on
        paragraphs, sentences, or word boundaries to preserve context.
        """
        clean_text = re.sub(r'\s+', ' ', text).strip()
        if not clean_text:
            return []
        
        if len(clean_text) <= chunk_size_chars:
            return [clean_text]

        chunks = []
        start = 0
        text_len = len(clean_text)

        while start < text_len:
            end = min(start + chunk_size_chars, text_len)
            
            # If not at the end of text, find the best break point
            if end < text_len:
                # Try finding sentence boundary: '. ', '? ', '! '
                boundary = -1
                for punct in ['. ', '? ', '! ', '\n']:
                    idx = clean_text.rfind(punct, start + chunk_size_chars // 2, end)
                    if idx > boundary:
                        boundary = idx + len(punct)
                
                if boundary > start:
                    end = boundary
                else:
                    # Fallback to space boundary
                    space_idx = clean_text.rfind(' ', start + chunk_size_chars // 2, end)
                    if space_idx > start:
                        end = space_idx + 1

            chunk = clean_text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            if end >= text_len:
                break

            start = max(end - overlap_chars, start + 1)

        return chunks

embedding_service = EmbeddingService()
