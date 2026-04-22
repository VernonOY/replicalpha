from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..vendored.qtype.core.analyzer import QtypeAnalyzer


@dataclass(slots=True)
class CheckReport:
    passed: bool
    violations: list[dict[str, Any]] = field(default_factory=list)


def check_code(source: str) -> CheckReport:
    """Run the vendored qtype static analyzer on a Python source string.

    Returns a ``CheckReport`` whose ``passed`` field is True iff no violation
    with severity ``"error"`` was emitted. Warnings are listed but tolerated.
    """
    analyzer = QtypeAnalyzer()
    raw = analyzer.check_source(source)
    violations = [
        {
            "rule": v.rule_id,
            "severity": v.severity,
            "message": v.message,
            "line": v.line,
        }
        for v in raw
    ]
    passed = all(v["severity"] != "error" for v in violations)
    return CheckReport(passed=passed, violations=violations)
