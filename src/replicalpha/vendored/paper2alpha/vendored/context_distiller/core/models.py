"""Core data models for context-distiller."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class Category(Enum):
    """Knowledge base document categories."""

    API_DOCS = "api_docs"
    FACTOR_REGISTRY = "factor_registry"
    DOMAIN_RULES = "domain_rules"
    RESEARCH_HISTORY = "research_history"


_HEADING_RE = re.compile(r"^#\s+(.+)$", re.MULTILINE)


@dataclass(frozen=True)
class Document:
    """A raw document before chunking."""

    source: str
    category: Category
    content: str

    @property
    def title(self) -> str:
        """Extract title from first markdown heading, or fall back to source."""
        m = _HEADING_RE.search(self.content)
        return m.group(1).strip() if m else self.source


@dataclass(frozen=True)
class Chunk:
    """An indexed unit of text derived from a Document."""

    chunk_id: str
    source: str
    category: Category
    content: str
    index: int


@dataclass(frozen=True)
class SearchResult:
    """A chunk with a retrieval relevance score."""

    chunk: Chunk
    score: float
