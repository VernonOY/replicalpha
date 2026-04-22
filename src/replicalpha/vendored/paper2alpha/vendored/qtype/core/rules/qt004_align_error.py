"""QT004 — alignment error detector for merge/join calls."""

from __future__ import annotations

import ast

from ..violation import Violation
from .base import Rule

EXPLICIT_KEY_KWARGS: frozenset[str] = frozenset(
    {"on", "left_on", "right_on", "left_index", "right_index"}
)


class AlignErrorRule(Rule):
    rule_id = "QT004"
    rule_name = "alignment-error"
    severity = "warning"

    def check(self, tree: ast.AST, source: str, filename: str) -> list[Violation]:
        violations: list[Violation] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not self._is_merge_call(node):
                continue
            if self._has_explicit_key(node):
                continue
            violations.append(
                Violation(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    file=filename,
                    line=node.lineno,
                    message=(
                        "merge() call has no explicit join key — "
                        "pandas will silently guess common columns"
                    ),
                    severity=self.severity,
                    suggestion=(
                        "pass `on=...` or `left_on=...`+`right_on=...` "
                        "(or `left_index=True, right_index=True`)"
                    ),
                )
            )
        return violations

    @staticmethod
    def _is_merge_call(node: ast.Call) -> bool:
        return isinstance(node.func, ast.Attribute) and node.func.attr == "merge"

    @staticmethod
    def _has_explicit_key(node: ast.Call) -> bool:
        return any(kw.arg in EXPLICIT_KEY_KWARGS for kw in node.keywords if kw.arg)
