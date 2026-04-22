"""Built-in rule registry."""

from __future__ import annotations

from .base import Rule
from .qt001_lookahead import LookaheadRule
from .qt002_future_func import FutureFuncRule
from .qt003_survival_bias import SurvivalBiasRule
from .qt004_align_error import AlignErrorRule
from .qt005_return_offset import ReturnOffsetRule

ALL_RULES: list[type[Rule]] = [
    LookaheadRule,
    FutureFuncRule,
    SurvivalBiasRule,
    AlignErrorRule,
    ReturnOffsetRule,
]
