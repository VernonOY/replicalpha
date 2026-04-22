"""SQLite FTS5 keyword search index."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from .models import Category, Chunk, SearchResult


class FtsIndex:
    """Full-text search index backed by SQLite FTS5."""

    def __init__(self, db_path: Path | None = None) -> None:
        if db_path is not None:
            db_path.parent.mkdir(parents=True, exist_ok=True)
            self._conn = sqlite3.connect(str(db_path))
        else:
            self._conn = sqlite3.connect(":memory:")
        self._init_tables()

    def _init_tables(self) -> None:
        cur = self._conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS chunks (
                chunk_id TEXT PRIMARY KEY,
                source   TEXT NOT NULL,
                category TEXT NOT NULL,
                content  TEXT NOT NULL,
                idx      INTEGER NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts
            USING fts5(content, content_rowid='rowid', tokenize='trigram')
            """
        )
        self._conn.commit()

    def add_chunks(self, chunks: list[Chunk]) -> None:
        """Insert chunks, skipping any with duplicate chunk_id."""
        cur = self._conn.cursor()
        for chunk in chunks:
            cur.execute("SELECT 1 FROM chunks WHERE chunk_id = ?", (chunk.chunk_id,))
            if cur.fetchone() is not None:
                continue
            cur.execute(
                "INSERT INTO chunks "
                "(chunk_id, source, category, content, idx) VALUES (?, ?, ?, ?, ?)",
                (chunk.chunk_id, chunk.source, chunk.category.value, chunk.content, chunk.index),
            )
            rowid = cur.lastrowid
            cur.execute(
                "INSERT INTO chunks_fts (rowid, content) VALUES (?, ?)",
                (rowid, chunk.content),
            )
        self._conn.commit()

    def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        """Search for chunks matching the query. Returns results ranked by BM25."""
        if not query.strip():
            return []
        cur = self._conn.cursor()
        safe_query = query.replace('"', '""')
        tokens = safe_query.split()
        if not tokens:
            return []
        fts_query = " OR ".join(f'"{t}"' for t in tokens)
        try:
            cur.execute(
                """
                SELECT c.chunk_id, c.source, c.category, c.content, c.idx,
                       rank
                FROM chunks_fts f
                JOIN chunks c ON c.rowid = f.rowid
                WHERE chunks_fts MATCH ?
                ORDER BY rank
                LIMIT ?
                """,
                (fts_query, limit),
            )
        except sqlite3.OperationalError:
            return []
        results: list[SearchResult] = []
        for row in cur.fetchall():
            chunk = Chunk(
                chunk_id=row[0],
                source=row[1],
                category=Category(row[2]),
                content=row[3],
                index=row[4],
            )
            raw_rank = row[5]
            score = 1.0 / (1.0 + abs(raw_rank))
            results.append(SearchResult(chunk=chunk, score=score))
        return results

    def count(self) -> int:
        """Return number of indexed chunks."""
        cur = self._conn.cursor()
        cur.execute("SELECT COUNT(*) FROM chunks")
        row = cur.fetchone()
        return int(row[0]) if row else 0

    def clear(self) -> None:
        """Remove all indexed chunks."""
        cur = self._conn.cursor()
        cur.execute("DELETE FROM chunks_fts")
        cur.execute("DELETE FROM chunks")
        self._conn.commit()
