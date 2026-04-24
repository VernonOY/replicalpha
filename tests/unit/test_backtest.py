from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from replicalpha.core.backtest import run_backtest
from replicalpha.core.data import CSVAdapter
from replicalpha.core.models import BacktestResult

FIXTURE = Path(__file__).parents[1] / "cases" / "sample_market_data.csv"


def _simple_compute_momentum(adapter, as_of, universe=""):  # type: ignore[no-untyped-def]
    # trivial 20-day momentum: close_today / close_20_days_ago - 1
    from datetime import timedelta

    start = as_of - timedelta(days=40)
    px = adapter.get_price("close", start, as_of, universe)
    out: dict[str, float] = {}
    for ticker, series in px.items():
        if len(series) >= 20:
            out[ticker] = series[-1] / series[-20] - 1
    return out


def test_backtest_returns_expected_shape() -> None:
    adapter = CSVAdapter(FIXTURE)
    result = run_backtest(
        compute=_simple_compute_momentum,
        adapter=adapter,
        start=date(2022, 3, 1),
        end=date(2022, 6, 30),
        rebalance="weekly",
    )
    assert isinstance(result, BacktestResult)
    assert result.start_date == "2022-03-01"
    assert result.end_date == "2022-06-30"
    assert -1.0 <= result.ic_mean <= 1.0
    assert result.ic_std >= 0
    assert len(result.ic_series) > 5


def test_backtest_short_window_still_completes() -> None:
    adapter = CSVAdapter(FIXTURE)
    result = run_backtest(
        compute=_simple_compute_momentum,
        adapter=adapter,
        start=date(2022, 3, 1),
        end=date(2022, 3, 31),
        rebalance="weekly",
    )
    assert isinstance(result, BacktestResult)


def test_backtest_bad_compute_raises() -> None:
    def broken(adapter, as_of, universe=""):  # type: ignore[no-untyped-def]
        raise RuntimeError("boom")

    adapter = CSVAdapter(FIXTURE)
    with pytest.raises(RuntimeError, match="boom"):
        run_backtest(
            compute=broken,
            adapter=adapter,
            start=date(2022, 3, 1),
            end=date(2022, 3, 31),
            rebalance="weekly",
        )


def test_backtest_max_drawdown_nonnegative() -> None:
    adapter = CSVAdapter(FIXTURE)
    result = run_backtest(
        compute=_simple_compute_momentum,
        adapter=adapter,
        start=date(2022, 3, 1),
        end=date(2022, 12, 31),
        rebalance="weekly",
    )
    assert result.max_drawdown >= 0
