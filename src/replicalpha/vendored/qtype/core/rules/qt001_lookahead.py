"""QT001 — look-ahead bias detector.

Flags `.shift(N)` calls where N is a negative integer literal. A negative
shift moves data forward in time, leaking future information into row t.
"""

from __future__ import annotations

import ast

from .base import Rule
from ..violation import Violation


class LookaheadRule(Rule):
    rule_id = "QT001"
    rule_name = "look-ahead-bias"
    severity = "error"

    def check(self, tree: ast.AST, source: str, filename: str) -> list[Violation]:
        violations: list[Violation] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr != "shift":
                continue
            if not node.args:
                continue
            n = self._extract_negative_int(node.args[0])
            if n is None:
                continue
            # Whitelist: pct_change().shift(-1) is the canonical forward-return
            # idiom in pandas. The receiver of .shift() is itself a Call to
            # .pct_change(...), so we skip flagging it.
            if self._is_chained_from_pct_change(node.func.value):
                continue
            violations.append(
                Violation(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    file=filename,
                    line=node.lineno,
                    message=(
                        f"shift({n}) leaks future data at row t "
                        f"(negative shift moves rows forward in time)"
                    ),
                    severity=self.severity,
                    suggestion=(
                        f"use shift({-n}) to access past data, or "
                        f"skip QT001 with `qtype check --rules QT002,QT003,QT004,QT005`"
                    ),
                )
            )
        return violations

    @staticmethod
    def _is_chained_from_pct_change(receiver: ast.expr) -> bool:
        """True iff `receiver` is a Call to `.pct_change(...)`.

        Used to whitelist the canonical `pct_change().shift(-1)` forward-return
        idiom from QT001's negative-shift detection.
        """
        return (
            isinstance(receiver, ast.Call)
            and isinstance(receiver.func, ast.Attribute)
            and receiver.func.attr == "pct_change"
        )

    @staticmethod
    def _extract_negative_int(node: ast.expr) -> int | None:
        """Return the int value if `node` is a negative int literal, else None."""
        # Case 1: shift(-1) — parsed as UnaryOp(USub, Constant(1))
        if (
            isinstance(node, ast.UnaryOp)
            and isinstance(node.op, ast.USub)
            and isinstance(node.operand, ast.Constant)
            and isinstance(node.operand.value, int)
            and node.operand.value > 0
        ):
            return -node.operand.value
        # Case 2: directly a negative Constant (rare but possible from astor etc.)
        if isinstance(node, ast.Constant) and isinstance(node.value, int) and node.value < 0:
            return node.value
        return None
