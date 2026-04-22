"""QT002 — future function detector."""

from __future__ import annotations

import ast

from .base import Rule
from ..violation import Violation

FORBIDDEN: frozenset[str] = frozenset(
    {"lead", "look_forward", "peek_future", "forward_fill_future"}
)


class FutureFuncRule(Rule):
    rule_id = "QT002"
    rule_name = "future-function"
    severity = "error"

    def check(self, tree: ast.AST, source: str, filename: str) -> list[Violation]:
        violations: list[Violation] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            name = self._call_name(node)
            if name is None or name not in FORBIDDEN:
                continue
            violations.append(
                Violation(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    file=filename,
                    line=node.lineno,
                    message=f"`{name}()` is a known future-leaking function",
                    severity=self.severity,
                    suggestion=(
                        "use shift(N) with positive N for past data; "
                        "skip with `qtype check --rules QT001,QT003,QT004,QT005`"
                    ),
                )
            )
        return violations

    @staticmethod
    def _call_name(node: ast.Call) -> str | None:
        """Extract the called name (bare or final attribute)."""
        if isinstance(node.func, ast.Name):
            return node.func.id
        if isinstance(node.func, ast.Attribute):
            return node.func.attr
        return None
