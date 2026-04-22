"""QT005 — return offset detector.

Flags assignments where the target variable name implies a forward return
(forward / next / future / target) but the value is a bare `pct_change()`
call. pct_change() returns the historical return at row t, not the forward
return at t+1, so the assignment is semantically inverted.
"""

from __future__ import annotations

import ast

from .base import Rule
from ..violation import Violation

FORWARD_KEYWORDS: tuple[str, ...] = ("forward", "next", "future", "target")


class ReturnOffsetRule(Rule):
    rule_id = "QT005"
    rule_name = "return-offset"
    severity = "warning"

    def check(self, tree: ast.AST, source: str, filename: str) -> list[Violation]:
        violations: list[Violation] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Assign):
                continue
            if not self._target_is_forward(node.targets):
                continue
            if not self._value_has_pct_change_no_shift(node.value):
                continue
            violations.append(
                Violation(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    file=filename,
                    line=node.lineno,
                    message=(
                        "pct_change() returns historical return at row t, "
                        "but the target name implies a forward return"
                    ),
                    severity=self.severity,
                    suggestion=(
                        "use df['c'].pct_change().shift(-1) for next-period "
                        "forward return, or rename the target if the historical "
                        "return is intended"
                    ),
                )
            )
        return violations

    @classmethod
    def _target_is_forward(cls, targets: list[ast.expr]) -> bool:
        for t in targets:
            name = cls._extract_target_name(t)
            if name is None:
                continue
            lowered = name.lower()
            if any(kw in lowered for kw in FORWARD_KEYWORDS):
                return True
        return False

    @staticmethod
    def _extract_target_name(target: ast.expr) -> str | None:
        # df['forward_return'] = ...
        if isinstance(target, ast.Subscript):
            slc = target.slice
            if isinstance(slc, ast.Constant) and isinstance(slc.value, str):
                return slc.value
            return None
        # obj.next_return = ...
        if isinstance(target, ast.Attribute):
            return target.attr
        # forward_return = ...
        if isinstance(target, ast.Name):
            return target.id
        return None

    @staticmethod
    def _value_has_pct_change_no_shift(value: ast.expr) -> bool:
        """True iff value contains a pct_change() call NOT chained into shift()."""
        # Walk the value subtree. We flag if there's any pct_change call
        # whose result is NOT immediately the receiver of a `.shift(...)` call.
        flagged = False
        for node in ast.walk(value):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr != "pct_change":
                continue
            # Check: is this call's result the `.value` of an outer .shift()?
            # Approach: walk again to find any Call whose func.value is `node`
            # and func.attr == "shift". If yes, it's chained → not flagged.
            chained_into_shift = False
            for outer in ast.walk(value):
                if (
                    isinstance(outer, ast.Call)
                    and isinstance(outer.func, ast.Attribute)
                    and outer.func.attr == "shift"
                    and outer.func.value is node
                ):
                    chained_into_shift = True
                    break
            if not chained_into_shift:
                flagged = True
                break
        return flagged
