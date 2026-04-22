"""ChromaDB vector search index."""

from __future__ import annotations

from pathlib import Path

import chromadb

from .models import Category, Chunk, SearchResult

_COLLECTION_NAME = "context_distiller"


class VectorIndex:
    """Vector similarity search index backed by ChromaDB."""

    def __init__(self, persist_dir: Path | None = None) -> None:
        if persist_dir is not None:
            persist_dir.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(persist_dir))
        else:
            self._client = chromadb.Client()
        self._collection = self._client.get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, chunks: list[Chunk]) -> None:
        """Add chunks to the vector index, skipping duplicates by chunk_id."""
        if not chunks:
            return
        ids = [c.chunk_id for c in chunks]
        existing = self._collection.get(ids=ids)
        existing_ids = set(existing["ids"]) if existing["ids"] else set()

        new_chunks = [c for c in chunks if c.chunk_id not in existing_ids]
        if not new_chunks:
            return

        self._collection.add(
            ids=[c.chunk_id for c in new_chunks],
            documents=[c.content for c in new_chunks],
            metadatas=[
                {"source": c.source, "category": c.category.value, "index": c.index}
                for c in new_chunks
            ],
        )

    def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        """Search for chunks similar to query. Returns results by descending score."""
        if self._collection.count() == 0:
            return []

        actual_limit = min(limit, self._collection.count())
        raw = self._collection.query(
            query_texts=[query],
            n_results=actual_limit,
            include=["documents", "metadatas", "distances"],
        )

        results: list[SearchResult] = []
        ids = raw["ids"][0] if raw["ids"] else []
        docs = raw["documents"][0] if raw["documents"] else []
        metas = raw["metadatas"][0] if raw["metadatas"] else []
        dists = raw["distances"][0] if raw["distances"] else []

        for chunk_id, doc, meta, dist in zip(ids, docs, metas, dists, strict=True):
            raw_idx = meta["index"]
            assert isinstance(raw_idx, (int, float, str)), "unexpected index type from chromadb"
            chunk = Chunk(
                chunk_id=chunk_id,
                source=str(meta["source"]),
                category=Category(meta["category"]),
                content=doc,
                index=int(raw_idx),
            )
            score = max(0.0, 1.0 - dist / 2.0)
            results.append(SearchResult(chunk=chunk, score=score))

        return results

    def count(self) -> int:
        """Return number of indexed chunks."""
        return self._collection.count()

    def clear(self) -> None:
        """Remove all indexed chunks."""
        self._client.delete_collection(_COLLECTION_NAME)
        self._collection = self._client.get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
