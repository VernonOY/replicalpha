"""Violation dataclass — pure data, no imports from analyzer or rules.

Lives in its own module to break the circular import between
qtype.core.analyzer and qtype.core.rules.* (rules need Violation, analyzer
needs to register rules, rules need Violation again).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Violation:
    """A single rule violation found in source code."""

    rule_id: str  # "QT001"
    rule_name: str  # "look-ahead-bias"
    file: str  # path or "<stdin>"
    line: int  # 1-indexed
    message: str
    severity: str  # "error" | "warning"
    suggestion: str = ""
