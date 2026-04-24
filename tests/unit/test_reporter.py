from __future__ import annotations

from replicalpha.core.models import (
    BacktestResult,
    CodegenResult,
    PipelineReport,
    ReproducibilityScore,
    ValidatorFinding,
)
from replicalpha.core.reporter import render_report
from replicalpha.vendored.paper2alpha.core.models import (
    FactorSpec,
    ReportedMetrics,
    ResearchCard,
)


def _pipeline_report() -> tuple[ResearchCard, PipelineReport]:
    card = ResearchCard(
        source="demo paper",
        factors=[
            FactorSpec(
                name="ma20",
                chinese_name="20日均线",
                definition="20 day moving average",
                formula="rolling_mean(close, 20)",
                data_fields=["close"],
                params={"lookback": 20},
                universe="全A",
                reported_metrics=ReportedMetrics(ic_mean=0.045, backtest_period="2022~2024"),
            )
        ],
    )
    report = PipelineReport(
        run_id="r-demo",
        paper_path="demo.pdf",
        completed_stages=["extract", "codegen", "backtest", "validate", "score", "report"],
        codegen=CodegenResult(
            method="dsl",
            source_code="def compute(a, b): pass\n",
            qtype_passed=True,
            qtype_violations=[],
        ),
        backtest=BacktestResult(
            ic_mean=0.042,
            ic_std=0.08,
            ic_series={"2022-06-30": 0.04},
            cumulative_return=0.15,
            max_drawdown=0.08,
            annualized_sharpe=1.3,
            start_date="2022-01-03",
            end_date="2024-12-31",
        ),
        validator_findings=[
            ValidatorFinding(
                rule="small_cap_exposure",
                severity="critical",
                detail="held median 15B < 0.5x universe median 40B",
                suggestion="run size-neutralization",
            )
        ],
        reproducibility=ReproducibilityScore(
            claimed_ic=0.045,
            reproduced_ic=0.042,
            sign_match=1.0,
            magnitude_score=0.93,
            final_score=0.95,
            interpretation="strong reproduction",
        ),
    )
    return card, report


def test_report_has_all_sections() -> None:
    card, report = _pipeline_report()
    md = render_report(card=card, report=report)
    for heading in [
        "# Reproduction Report",
        "## Paper",
        "## Factor Code",
        "## Backtest",
        "## Red Team",
        "## Reproducibility",
    ]:
        assert heading in md, f"missing section: {heading}"


def test_report_includes_reproducibility_score_and_interpretation() -> None:
    card, report = _pipeline_report()
    md = render_report(card=card, report=report)
    assert "0.95" in md
    assert "strong reproduction" in md


def test_report_includes_validator_findings_with_severity() -> None:
    card, report = _pipeline_report()
    md = render_report(card=card, report=report)
    assert "small_cap_exposure" in md
    assert "critical" in md.lower()


def test_report_includes_factor_source_code_fenced() -> None:
    card, report = _pipeline_report()
    md = render_report(card=card, report=report)
    assert "```python" in md
    assert "def compute" in md


def test_report_handles_missing_optional_stages() -> None:
    card, _full = _pipeline_report()
    partial = PipelineReport(
        run_id="r-partial",
        paper_path="demo.pdf",
        completed_stages=["extract"],
    )
    md = render_report(card=card, report=partial)
    assert "# Reproduction Report" in md
    assert "partial" in md.lower() or "pending" in md.lower()
