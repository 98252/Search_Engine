import pytest
from app.services.embedding_service import embedding_service
from app.services.search_service import SearchCoordinatorService
from app.schemas.search import SearchMode, SearchQueryRequest

def test_chunking_logic():
    text = "Sentence one. " * 50  # ~700 characters
    chunks = embedding_service.chunk_text(text, chunk_size_chars=300, overlap_chars=50)
    assert len(chunks) > 1
    # Check that chunks are not empty
    for c in chunks:
        assert len(c) > 0

def test_rrf_scoring_math():
    coordinator = SearchCoordinatorService(rrf_k=60)
    
    # Document 1 appears at rank 1 in both BM25 and Vector
    # Document 2 appears at rank 2 in BM25 only
    bm25 = [
        {"doc_id": "doc1", "rank": 1, "score": 10.0, "title": "Doc 1"},
        {"doc_id": "doc2", "rank": 2, "score": 8.0, "title": "Doc 2"}
    ]
    vector = [
        {"point_id": "doc1", "rank": 1, "score": 0.95, "title": "Doc 1"}
    ]
    
    ranked = coordinator._fuse_results(
        mode=SearchMode.HYBRID,
        bm25_results=bm25,
        vector_results=vector,
        w_bm25=0.5,
        w_vec=0.5
    )
    
    assert len(ranked) == 2
    # doc1 should have the highest RRF score because it appeared in both rankings
    assert ranked[0].document_id == "doc1"
    # doc1 score: 0.5/(60+1) + 0.5/(60+1) = 1/61 ~ 0.01639
    assert ranked[0].hybrid_score > ranked[1].hybrid_score
