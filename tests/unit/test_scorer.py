from __future__ import annotations

import pytest

from replicalpha.core.models import BacktestResult, ReproducibilityScore
from replicalpha.core.scorer import score_reproducibility
from replicalpha.vendored.paper2alpha.core.models import (
    FactorSpec,
    ReportedMetrics,
    ResearchCard,
)


def _card(claimed: float | None = 0.045) -> ResearchCard:
    factor = FactorSpec(
        name="f1",
        chinese_name="f1",
        definition="d",
        formula="rolling_mean(close, 20)",
        data_fields=["close"],
        params={"lookback": 20},
        universe="全A",
        reported_metrics=(
            ReportedMetrics(ic_mean=claimed, backtest_period="2022~2024")
            if claimed is not None
            else None
        ),
    )
    return ResearchCard(source="s", factors=[factor])


def _bt(ic: float) -> BacktestResult:
    return BacktestResult(
        ic_mean=ic,
        ic_std=0.08,
        ic_series={"2022-06-30": ic},
        cumulative_return=0.1,
        max_drawdown=0.05,
        annualized_sharpe=1.0,
        start_date="2022-01-01",
        end_date="2024-12-31",
    )


def test_strong_reproduction() -> None:
    s = score_reproducibility(_card(0.045), _bt(0.042))
    assert isinstance(s, ReproducibilityScore)
    assert 0.85 < s.final_score <= 1.0
    assert s.sign_match == 1.0


def test_sign_mismatch_lowers_score() -> None:
    s = score_reproducibility(_card(0.045), _bt(-0.02))
    assert s.sign_match == 0.0
    assert s.final_score < 0.8


def test_no_claim_returns_informational_score() -> None:
    s = score_reproducibility(_card(None), _bt(0.04))
    assert s.claimed_ic is None
    assert "no claimed" in s.interpretation.lower()


def test_zero_claim_magnitude_does_not_divide_by_zero() -> None:
    s = score_reproducibility(_card(0.0), _bt(0.0))
    assert s.final_score == pytest.approx(1.0)


def test_interpretation_string_nonempty() -> None:
    s = score_reproducibility(_card(0.045), _bt(0.042))
    assert len(s.interpretation) > 20
