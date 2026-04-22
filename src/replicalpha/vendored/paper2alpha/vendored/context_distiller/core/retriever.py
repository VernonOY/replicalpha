"""Hybrid retrieval: vector + FTS5 with Reciprocal Rank Fusion."""

from __future__ import annotations

from .fts_index import FtsIndex
from .models import Chunk, SearchResult
from .vector_index import VectorIndex

# RRF constant — standard value from the original RRF paper (Cormack et al. 2009)
_RRF_K = 60


class HybridRetriever:
    """Combines vector and keyword search using Reciprocal Rank Fusion."""

    def __init__(self, fts_index: FtsIndex, vector_index: VectorIndex) -> None:
        self.fts_index = fts_index
        self.vector_index = vector_index

    def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        """Search both indices and fuse results with RRF.

        Each result gets a score of 1/(k + rank) from each index.
        If a chunk appears in both, scores are summed.
        """
        fetch_limit = limit * 3

        fts_results = self.fts_index.search(query, limit=fetch_limit)
        vec_results = self.vector_index.search(query, limit=fetch_limit)

        if not fts_results and not vec_results:
            return []

        chunk_map: dict[str, Chunk] = {}
        rrf_scores: dict[str, float] = {}

        for rank, result in enumerate(fts_results):
            cid = result.chunk.chunk_id
            chunk_map[cid] = result.chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)

        for rank, result in enumerate(vec_results):
            cid = result.chunk.chunk_id
            chunk_map[cid] = result.chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)

        sorted_ids = sorted(rrf_scores, key=lambda cid: rrf_scores[cid], reverse=True)

        return [
            SearchResult(chunk=chunk_map[cid], score=rrf_scores[cid]) for cid in sorted_ids[:limit]
        ]
