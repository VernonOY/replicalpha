"""Rule abstract base class."""

from __future__ import annotations

import ast
from abc import ABC, abstractmethod

from ..violation import Violation


class Rule(ABC):
    """Base class for all qtype static analysis rules.

    Subclasses must set ``rule_id``, ``rule_name``, ``severity`` as class
    attributes and implement ``check``.
    """

    rule_id: str
    rule_name: str
    severity: str  # "error" | "warning"

    @abstractmethod
    def check(self, tree: ast.AST, source: str, filename: str) -> list[Violation]:
        """Walk the AST and return any violations found.

        Args:
            tree: parsed AST of the source file
            source: raw source text (for line lookups / context)
            filename: file path or sentinel like "<stdin>"
        """
