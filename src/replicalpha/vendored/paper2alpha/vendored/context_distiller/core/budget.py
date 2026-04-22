"""Token budget management for context packing."""

from __future__ import annotations

import tiktoken

from .models import SearchResult

_DEFAULT_MODEL = "cl100k_base"


class BudgetPacker:
    """Greedily packs ranked search results within a token budget."""

    def __init__(self, model: str = _DEFAULT_MODEL) -> None:
        self._enc = tiktoken.get_encoding(model)

    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text string."""
        return len(self._enc.encode(text))

    def pack(
        self,
        results: list[SearchResult],
        token_budget: int,
    ) -> list[SearchResult]:
        """Greedily select results that fit within token_budget.

        Iterates through results in order (assumed pre-sorted by score descending).
        Each chunk is included if its tokens fit in the remaining budget.
        """
        if token_budget <= 0:
            return []

        packed: list[SearchResult] = []
        used = 0

        for result in results:
            tokens = self.count_tokens(result.chunk.content)
            if used + tokens <= token_budget:
                packed.append(result)
                used += tokens

        return packed

    def format_context(self, results: list[SearchResult]) -> str:
        """Format packed results into a single context string.

        Each chunk is separated by a horizontal rule, with source metadata.
        """
        if not results:
            return ""

        parts: list[str] = []
        for r in results:
            header = f"[{r.chunk.category.value}] {r.chunk.source}"
            parts.append(f"{header}\n{r.chunk.content}")

        return "\n\n---\n\n".join(parts)
