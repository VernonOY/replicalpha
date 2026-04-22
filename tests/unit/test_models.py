from __future__ import annotations

import pytest
from pydantic import ValidationError

from replicalpha.core.models import (
    BacktestResult,
    CodegenResult,
    PipelineReport,
    PipelineStage,  # noqa: F401 — imported to verify the type alias is publicly exported
    PipelineState,
    ReproducibilityScore,
    ValidatorFinding,
)


def test_validator_finding_severity_enum() -> None:
    f = ValidatorFinding(rule="small_cap_exposure", severity="critical", detail="x")
    assert f.severity == "critical"


def test_validator_finding_rejects_bad_severity() -> None:
    with pytest.raises(ValidationError):
        ValidatorFinding(rule="x", severity="FATAL", detail="y")


def test_reproducibility_score_range() -> None:
    s = ReproducibilityScore(
        claimed_ic=0.045,
        reproduced_ic=0.042,
        sign_match=1.0,
        magnitude_score=0.93,
        final_score=0.951,
        interpretation="Strong reproduction",
    )
    assert 0.0 <= s.final_score <= 1.0


def test_codegen_result_carries_method_tag() -> None:
    r = CodegenResult(
        method="dsl",
        source_code="def compute(a, d):\n    pass\n",
        qtype_passed=True,
        qtype_violations=[],
    )
    assert r.method in {"dsl", "llm", "stub"}


def test_backtest_result_ic_series_and_summary() -> None:
    r = BacktestResult(
        ic_mean=0.042,
        ic_std=0.08,
        ic_series={"2024-01-02": 0.03, "2024-01-03": 0.05},
        cumulative_return=0.15,
        max_drawdown=0.08,
        annualized_sharpe=1.2,
        start_date="2022-01-01",
        end_date="2024-12-31",
    )
    assert r.ic_mean == pytest.approx(0.042)


def test_pipeline_stage_enum_values() -> None:
    for s in ["extract", "codegen", "backtest", "validate", "score", "report"]:
        state = PipelineState(stage=s, run_id="r1")  # type: ignore[arg-type]
        assert state.stage == s


def test_pipeline_report_json_roundtrip() -> None:
    report = PipelineReport(
        run_id="r-demo",
        paper_path="tests/cases/demo.pdf",
        completed_stages=["extract", "codegen", "backtest", "validate", "score", "report"],
        codegen=CodegenResult(
            method="dsl", source_code="pass\n", qtype_passed=True, qtype_violations=[]
        ),
        backtest=BacktestResult(
            ic_mean=0.04,
            ic_std=0.08,
            ic_series={"2024-01-02": 0.03},
            cumulative_return=0.1,
            max_drawdown=0.05,
            annualized_sharpe=1.0,
            start_date="2022-01-01",
            end_date="2024-12-31",
        ),
        validator_findings=[
            ValidatorFinding(rule="small_cap_exposure", severity="warning", detail="x")
        ],
        reproducibility=ReproducibilityScore(
            claimed_ic=0.045,
            reproduced_ic=0.04,
            sign_match=1.0,
            magnitude_score=0.89,
            final_score=0.92,
            interpretation="Reproduced within 10% tolerance",
        ),
    )
    s = report.to_json()
    restored = PipelineReport.model_validate_json(s)
    assert restored.reproducibility.final_score == pytest.approx(0.92)
    assert restored.validator_findings[0].rule == "small_cap_exposure"
