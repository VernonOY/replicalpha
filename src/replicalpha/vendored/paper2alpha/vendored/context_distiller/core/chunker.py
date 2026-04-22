"""Split documents into chunks for indexing."""

from __future__ import annotations

from .models import Chunk, Document

_DEFAULT_MAX_CHUNK_CHARS = 1000


def chunk_document(
    doc: Document,
    max_chunk_chars: int = _DEFAULT_MAX_CHUNK_CHARS,
) -> list[Chunk]:
    """Split a document into chunks, merging small paragraphs up to max_chunk_chars.

    Strategy:
    1. Split on double newlines (paragraph boundaries).
    2. Filter out whitespace-only paragraphs.
    3. Greedily merge consecutive paragraphs until adding one would exceed max_chunk_chars.
    """
    if not doc.content.strip():
        return []

    paragraphs = [p.strip() for p in doc.content.split("\n\n") if p.strip()]
    if not paragraphs:
        return []

    merged: list[str] = []
    current = paragraphs[0]

    for para in paragraphs[1:]:
        candidate = current + "\n\n" + para
        if len(candidate) <= max_chunk_chars:
            current = candidate
        else:
            merged.append(current)
            current = para
    merged.append(current)

    return [
        Chunk(
            chunk_id=f"{doc.source}::{i}",
            source=doc.source,
            category=doc.category,
            content=text,
            index=i,
        )
        for i, text in enumerate(merged)
    ]
