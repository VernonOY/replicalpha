"""Distiller — the main public API for context-distiller."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .budget import BudgetPacker
from .chunker import chunk_document
from .fts_index import FtsIndex
from .models import Category, Document
from .retriever import HybridRetriever
from .vector_index import VectorIndex

# Map directory names to Category enum
_DIR_TO_CATEGORY: dict[str, Category] = {
    "api_docs": Category.API_DOCS,
    "factor_registry": Category.FACTOR_REGISTRY,
    "domain_rules": Category.DOMAIN_RULES,
    "research_history": Category.RESEARCH_HISTORY,
}

_SUPPORTED_EXTENSIONS = {".md", ".txt", ".rst"}


class Distiller:
    """Quantitative domain knowledge manager.

    Usage::

        distiller = Distiller(knowledge_dir="./knowledge_base")
        distiller.ingest()
        context = distiller.get_context(
            task="帮我实现一个动量因子",
            token_budget=4000,
        )
    """

    def __init__(
        self,
        knowledge_dir: Path | str,
        data_dir: Path | str | None = None,
    ) -> None:
        self._knowledge_dir = Path(knowledge_dir)
        if data_dir is not None:
            self._data_dir = Path(data_dir)
        else:
            self._data_dir = self._knowledge_dir.parent / ".distiller_data"

        self._data_dir.mkdir(parents=True, exist_ok=True)

        self._fts = FtsIndex(db_path=self._data_dir / "fts.db")
        self._vec = VectorIndex(persist_dir=self._data_dir / "chroma")
        self._retriever = HybridRetriever(fts_index=self._fts, vector_index=self._vec)
        self._packer = BudgetPacker()

    def ingest(self) -> dict[str, int]:
        """Scan knowledge_dir and index all documents.

        Returns dict with 'documents' and 'chunks' counts.
        """
        total_docs = 0
        total_chunks = 0

        for dir_name, category in _DIR_TO_CATEGORY.items():
            cat_dir = self._knowledge_dir / dir_name
            if not cat_dir.is_dir():
                continue

            for file_path in sorted(cat_dir.iterdir()):
                if file_path.suffix.lower() not in _SUPPORTED_EXTENSIONS:
                    continue
                if not file_path.is_file():
                    continue

                content = file_path.read_text(encoding="utf-8")
                doc = Document(
                    source=f"{dir_name}/{file_path.name}",
                    category=category,
                    content=content,
                )
                chunks = chunk_document(doc)
                if chunks:
                    self._fts.add_chunks(chunks)
                    self._vec.add_chunks(chunks)
                    total_chunks += len(chunks)
                total_docs += 1

        return {"documents": total_docs, "chunks": total_chunks}

    def get_context(self, task: str, token_budget: int = 4000) -> str:
        """Retrieve the most relevant context for a given task.

        Args:
            task: Natural language description of the task.
            token_budget: Maximum number of tokens in the returned context.

        Returns:
            Formatted context string, or empty string if no results.
        """
        results = self._retriever.search(task, limit=20)
        if not results:
            return ""
        packed = self._packer.pack(results, token_budget=token_budget)
        if not packed:
            return ""
        return self._packer.format_context(packed)

    def status(self) -> dict[str, Any]:
        """Return knowledge base statistics."""
        total = self._fts.count()

        categories: dict[str, int] = {}
        for dir_name in _DIR_TO_CATEGORY:
            cat_dir = self._knowledge_dir / dir_name
            if cat_dir.is_dir():
                count = sum(
                    1
                    for f in cat_dir.iterdir()
                    if f.is_file() and f.suffix.lower() in _SUPPORTED_EXTENSIONS
                )
                categories[dir_name] = count
            else:
                categories[dir_name] = 0

        return {
            "total_chunks": total,
            "categories": categories,
            "knowledge_dir": str(self._knowledge_dir),
        }
