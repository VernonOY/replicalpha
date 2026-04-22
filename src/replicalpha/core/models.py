from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["critical", "warning", "info"]
CodegenMethod = Literal["dsl", "llm", "stub"]
PipelineStage = Literal["extract", "codegen", "backtest", "validate", "score", "report"]


class ValidatorFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rule: str
    severity: Severity
    detail: str
    suggestion: str = ""


class CodegenResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    method: CodegenMethod
    source_code: str
    qtype_passed: bool
    qtype_violations: list[dict[str, Any]] = Field(default_factory=list)
    note: str = ""


class BacktestResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ic_mean: float
    ic_std: float
    ic_series: dict[str, float]
    cumulative_return: float
    max_drawdown: float
    annualized_sharpe: float
    start_date: str
    end_date: str


class ReproducibilityScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    claimed_ic: float | None
    reproduced_ic: float
    sign_match: float
    magnitude_score: float
    final_score: float
    interpretation: str


class PipelineState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    stage: PipelineStage
    error: str | None = None


class PipelineReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    paper_path: str
    completed_stages: list[PipelineStage]
    codegen: CodegenResult | None = None
    backtest: BacktestResult | None = None
    validator_findings: list[ValidatorFinding] = Field(default_factory=list)
    reproducibility: ReproducibilityScore | None = None
    error: str | None = None

    def to_json(self, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent)
