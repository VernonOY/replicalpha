"""QtypeAnalyzer — pure-logic AST dispatcher with no IO framework deps."""

from __future__ import annotations

import ast
from pathlib import Path

from .rules.base import Rule
from .violation import Violation

__all__ = ["QtypeAnalyzer", "Violation"]


class QtypeAnalyzer:
    """Walks Python source files and dispatches each registered Rule.

    Pure logic: no click, no rich, no FastAPI. Importable as a library.
    """

    def __init__(self, rules: list[Rule] | None = None) -> None:
        if rules is None:
            from .rules import ALL_RULES

            rules = [cls() for cls in ALL_RULES]
        self._rules: list[Rule] = rules

    def check_source(self, source: str, filename: str = "<stdin>") -> list[Violation]:
        """Analyze a source string and return all violations."""
        try:
            tree = ast.parse(source, filename=filename)
        except SyntaxError as exc:
            # qtype is a static checker, not a syntax checker — surface
            # parse errors as a single violation rather than crashing.
            return [
                Violation(
                    rule_id="QT000",
                    rule_name="syntax-error",
                    file=filename,
                    line=exc.lineno or 1,
                    message=f"syntax error: {exc.msg}",
                    severity="error",
                )
            ]

        violations: list[Violation] = []
        for rule in self._rules:
            violations.extend(rule.check(tree, source, filename))
        return violations

    def check_file(self, path: Path) -> list[Violation]:
        """Analyze a single .py file."""
        return self.check_source(path.read_text(encoding="utf-8"), filename=str(path))

    def check_directory(self, path: Path, recursive: bool = True) -> list[Violation]:
        """Analyze all .py files under a directory."""
        results: list[Violation] = []
        glob = path.rglob("*.py") if recursive else path.glob("*.py")
        for py_file in sorted(glob):
            results.extend(self.check_file(py_file))
        return results
