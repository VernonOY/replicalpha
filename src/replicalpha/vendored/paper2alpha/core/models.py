from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

_SNAKE = re.compile(r"^[a-z][a-z0-9_]*$")


class ReportedMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ic_mean: float
    icir: float | None = None
    backtest_period: str
    rebalance_freq: str | None = None


class FactorSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    chinese_name: str
    definition: str
    formula: str
    data_fields: list[str]
    params: dict[str, Any] = Field(default_factory=dict)
    universe: str
    reported_metrics: ReportedMetrics | None = None

    @field_validator("name")
    @classmethod
    def _snake_case(cls, v: str) -> str:
        if not _SNAKE.match(v):
            raise ValueError(f"factor name must be snake_case, got {v!r}")
        return v


class ResearchCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: str
    factors: list[FactorSpec]
    methodology: str | None = None
    data_source: str | None = None
    limitations: list[str] = Field(default_factory=list)
