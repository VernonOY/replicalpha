"""QT003 — survival bias detector for universe-construction functions.

A function whose name contains 'universe' is assumed to be building a stock
universe. If its body never references any of the precise survivor-filter
identifiers (is_st, st_flag, suspended, delisted, paused, trading_status),
we flag it as potentially survival-biased.

Identifiers are matched **exactly** (case-insensitive on the full identifier
name) to avoid false negatives from substring collisions like 'last_close'
or 'strategy' accidentally matching a 2-char keyword. String literals (used
as subscript keys or query strings) use substring search against the same
keyword set.
"""

from __future__ import annotations

import ast

from ..violation import Violation
from .base import Rule

SURVIVOR_KEYWORDS: frozenset[str] = frozenset(
    {
        "is_st",
        "st_flag",
        "suspended",
        "delisted",
        "paused",
        "trading_status",
    }
)


class SurvivalBiasRule(Rule):
    rule_id = "QT003"
    rule_name = "survival-bias"
    severity = "warning"

    def check(self, tree: ast.AST, source: str, filename: str) -> list[Violation]:
        violations: list[Violation] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.FunctionDef):
                continue
            if "universe" not in node.name.lower():
                continue
            if self._mentions_survivor_keyword(node):
                continue
            violations.append(
                Violation(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    file=filename,
                    line=node.lineno,
                    message=(
                        f"function `{node.name}` builds a universe but never "
                        f"references is_st / suspended / delisted / trading_status filters"
                    ),
                    severity=self.severity,
                    suggestion=(
                        "filter out ST stocks, suspended/paused trading, "
                        "and delisted tickers before cross-sectional ranking. "
                        "qtype recognizes these field names: "
                        + ", ".join(sorted(SURVIVOR_KEYWORDS))
                    ),
                )
            )
        return violations

    @classmethod
    def _mentions_survivor_keyword(cls, func: ast.FunctionDef) -> bool:
        for child in ast.walk(func):
            # Identifiers (Name, Attribute, arg) — EXACT case-insensitive match
            # on the full identifier name to avoid substring false negatives.
            identifier = cls._extract_identifier(child)
            if identifier is not None and identifier.lower() in SURVIVOR_KEYWORDS:
                return True
            # String literals — substring search, because the keyword may be
            # embedded in a SQL-like query or subscript key like
            # df.query("trading_status == 'normal'") or df["is_st"].
            literal = cls._extract_string_literal(child)
            if literal is not None:
                lowered = literal.lower()
                if any(kw in lowered for kw in SURVIVOR_KEYWORDS):
                    return True
        return False

    @staticmethod
    def _extract_identifier(node: ast.AST) -> str | None:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return node.attr
        if isinstance(node, ast.arg):
            return node.arg
        return None

    @staticmethod
    def _extract_string_literal(node: ast.AST) -> str | None:
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        return None
