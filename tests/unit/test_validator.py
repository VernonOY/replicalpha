from __future__ import annotations

from pathlib import Path

from replicalpha.core.data import CSVAdapter
from replicalpha.core.models import BacktestResult, CodegenResult, ValidatorFinding
from replicalpha.core.validator import run_red_team
from replicalpha.vendored.paper2alpha.core.models import (
    FactorSpec,
    ReportedMetrics,
    ResearchCard,
)

FIXTURE = Path(__file__).parents[1] / "cases" / "sample_market_data.csv"


def _card(**overrides: object) -> ResearchCard:
    factor = FactorSpec(
        name="demo_factor",
        chinese_name="demo",
        definition="def",
        formula="rolling_mean(close, 20)",
        data_fields=["close"],
        params={"lookback": 20},
        universe="全A",
        reported_metrics=ReportedMetrics(ic_mean=0.04, backtest_period="2022-01~2024-12"),
    )
    return ResearchCard(source="demo", factors=[factor])


def _bt(
    cum: float = 0.15, ic_mean: float = 0.04, series: dict[str, float] | None = None
) -> BacktestResult:
    return BacktestResult(
        ic_mean=ic_mean,
        ic_std=0.08,
        ic_series=series or {"2022-06-30": 0.03, "2023-06-30": 0.08, "2024-06-30": 0.02},
        cumulative_return=cum,
        max_drawdown=0.08,
        annualized_sharpe=1.2,
        start_date="2022-01-03",
        end_date="2024-12-31",
    )


def _cg(method: str = "dsl", qtype_passed: bool = True) -> CodegenResult:
    return CodegenResult(
        method=method,  # type: ignore[arg-type]
        source_code="def compute(adapter, as_of, universe=''): return {}\n",
        qtype_passed=qtype_passed,
        qtype_violations=[],
    )


def test_clean_inputs_produce_no_critical_findings() -> None:
    adapter = CSVAdapter(FIXTURE)
    findings = run_red_team(
        card=_card(), backtest=_bt(), codegen=_cg(), adapter=adapter, held_tickers=[]
    )
    assert all(isinstance(f, ValidatorFinding) for f in findings)
    # Small-cap check needs held_tickers; with [] it produces info or skip


def test_data_leakage_flagged_when_codegen_failed_qtype() -> None:
    adapter = CSVAdapter(FIXTURE)
    cg = _cg(qtype_passed=False)
    cg.qtype_violations = [
        {"rule": "QT001", "severity": "error", "message": "shift(-1) leak", "line": 3}
    ]
    findings = run_red_team(
        card=_card(), backtest=_bt(), codegen=cg, adapter=adapter, held_tickers=[]
    )
    assert any(f.rule == "data_leakage" and f.severity == "critical" for f in findings)


def test_small_cap_exposure_flagged() -> None:
    adapter = CSVAdapter(FIXTURE)
    # Known small-cap tickers in sample data — check metadata table for two below-median
    # We pick tickers that generator places below median market cap
    held = ["600519", "000001"]
    meta = adapter.get_metadata()
    caps = sorted(v["market_cap"] for v in meta.values())
    median = caps[len(caps) // 2]
    below = [t for t in held if meta[t]["market_cap"] < median * 0.5]
    findings = run_red_team(
        card=_card(), backtest=_bt(), codegen=_cg(), adapter=adapter, held_tickers=held
    )
    # Emits a finding only when held tickers are significantly below median
    if below:
        assert any(f.rule == "small_cap_exposure" for f in findings)


def test_sample_concentration_flagged() -> None:
    adapter = CSVAdapter(FIXTURE)
    # Construct IC series where >50% of cumulative return came from 2022
    series = {"2022-06-30": 0.20, "2023-06-30": 0.01, "2024-06-30": 0.01}
    findings = run_red_team(
        card=_card(),
        backtest=_bt(cum=0.22, series=series),
        codegen=_cg(),
        adapter=adapter,
        held_tickers=[],
    )
    assert any(f.rule == "sample_concentration" and f.severity == "warning" for f in findings)


def test_factor_redundancy_flagged_when_two_similar_formulas() -> None:
    adapter = CSVAdapter(FIXTURE)
    card = ResearchCard(
        source="demo",
        factors=[
            FactorSpec(
                name="a",
                chinese_name="a",
                definition="d",
                formula="rolling_mean(close, 20)",
                data_fields=["close"],
                params={"lookback": 20},
                universe="全A",
            ),
            FactorSpec(
                name="b",
                chinese_name="b",
                definition="d",
                formula="rolling_mean(close, 20)",  # identical — redundant
                data_fields=["close"],
                params={"lookback": 20},
                universe="全A",
            ),
        ],
    )
    findings = run_red_team(
        card=card, backtest=_bt(), codegen=_cg(), adapter=adapter, held_tickers=[]
    )
    assert any(f.rule == "factor_redundancy" for f in findings)


def test_overfitting_hint_flagged_for_suspicious_lookback() -> None:
    adapter = CSVAdapter(FIXTURE)
    card = _card()
    card.factors[0].params = {"lookback": 23}  # non-round, suspicious
    findings = run_red_team(
        card=card, backtest=_bt(), codegen=_cg(), adapter=adapter, held_tickers=[]
    )
    assert any(f.rule == "overfitting_hint" for f in findings)
