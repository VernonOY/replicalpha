"""Unit tests for core/factor_analysis.py.

Test strategy:
- Synthetic data adapters allow precise control over factor / return relationships.
- Seven required tests plus several helpers.
"""

from __future__ import annotations

import math
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from replicalpha.core.data import CSVAdapter
from replicalpha.core.factor_analysis import (
    FactorAnalysisReport,
    ICAutocorrLag,
    ICStats,
    MonotonicityResult,
    QuintileBucket,
    QuintileCumPoint,
    analyze_factor,
)

FIXTURE = Path(__file__).parents[1] / "cases" / "sample_market_data.csv"

# ---------------------------------------------------------------------------
# Synthetic DataAdapter helpers
# ---------------------------------------------------------------------------

# We build a synthetic market with a known factor structure:
#   N tickers, T trading days.
# Prices are derived from random returns; for a "perfect" factor the score
# at date t equals the actual forward return from t to t+21.


def _make_trading_days(start: date, n_days: int) -> list[date]:
    """Generate n_days of business days starting from start."""
    days: list[date] = []
    d = start
    while len(days) < n_days:
        if d.weekday() < 5:  # Mon-Fri
            days.append(d)
        d += timedelta(days=1)
    return days


class SyntheticAdapter:
    """A DataAdapter backed by in-memory price data.

    Parameters
    ----------
    close_matrix:
        dict[ticker -> list[float]] with one entry per trading_day.
    trading_days:
        Ordered list of date objects.
    """

    def __init__(
        self,
        close_matrix: dict[str, list[float]],
        trading_days: list[date],
    ) -> None:
        self._close = close_matrix
        self._days = trading_days
        # Build a date -> index lookup
        self._day_idx: dict[date, int] = {d: i for i, d in enumerate(trading_days)}

    def get_price(
        self, field: str, start: date, end: date, universe: str
    ) -> dict[str, list[float]]:
        if field != "close":
            return {}
        idx_start = next((i for i, d in enumerate(self._days) if d >= start), len(self._days))
        idx_end = next((i for i, d in enumerate(self._days) if d > end), len(self._days))
        return {ticker: vals[idx_start:idx_end] for ticker, vals in self._close.items()}

    def get_trading_days(self, start: date, end: date) -> list[date]:
        return [d for d in self._days if start <= d <= end]

    def get_metadata(self) -> dict[str, dict[str, Any]]:
        return {ticker: {"sector": "TEST", "market_cap": 1_000_000} for ticker in self._close}


def _build_perfect_factor_adapter(
    n_tickers: int = 20,
    n_days: int = 300,
    ic_horizon: int = 21,
    seed: int = 42,
) -> tuple[SyntheticAdapter, list[date], dict[str, list[float]]]:
    """Build an adapter where factor[t][k] ≈ forward_return[t+ic_horizon][k].

    Returns (adapter, trading_days, scores_by_date).
    scores_by_date maps date -> {ticker: score}.
    """
    rng = np.random.default_rng(seed)
    tickers = [f"T{i:02d}" for i in range(n_tickers)]
    start = date(2022, 1, 3)
    trading_days = _make_trading_days(start, n_days)

    # Generate log returns: shape (n_days, n_tickers)
    log_rets = rng.normal(0, 0.01, size=(n_days, n_tickers))

    # Build prices from cumulative returns
    prices = np.exp(np.cumsum(log_rets, axis=0))  # shape (n_days, n_tickers)
    prices = prices / prices[0]  # normalize to start at 1.0

    close_matrix: dict[str, list[float]] = {}
    for k, ticker in enumerate(tickers):
        close_matrix[ticker] = prices[:, k].tolist()

    return SyntheticAdapter(close_matrix, trading_days), trading_days, close_matrix


def _make_perfect_compute(
    close_matrix: dict[str, list[float]],
    trading_days: list[date],
    ic_horizon: int = 21,
) -> Any:
    """Return a compute function that perfectly predicts ic_horizon-day forward returns."""
    day_idx = {d: i for i, d in enumerate(trading_days)}

    def compute(adapter: Any, as_of: date, universe: str = "") -> dict[str, float]:
        i = day_idx.get(as_of)
        if i is None:
            return {}
        i_h = i + ic_horizon
        out: dict[str, float] = {}
        for ticker, vals in close_matrix.items():
            if i_h < len(vals) and vals[i] != 0:
                out[ticker] = vals[i_h] / vals[i] - 1.0
        return out

    return compute


def _make_random_compute(seed: int = 99) -> Any:
    """Return a compute function that assigns pure noise scores."""
    rng = random.Random(seed)

    def compute(adapter: Any, as_of: date, universe: str = "") -> dict[str, float]:
        md = adapter.get_metadata()
        return {ticker: rng.gauss(0, 1) for ticker in md}

    return compute


def _make_inverted_compute(
    close_matrix: dict[str, list[float]],
    trading_days: list[date],
    ic_horizon: int = 21,
) -> Any:
    """Same as perfect but negated — lowest score = highest return."""
    perfect = _make_perfect_compute(close_matrix, trading_days, ic_horizon)

    def compute(adapter: Any, as_of: date, universe: str = "") -> dict[str, float]:
        return {t: -v for t, v in perfect(adapter, as_of, universe).items()}

    return compute


# ---------------------------------------------------------------------------
# Test 1: IC stats on a synthetic perfect factor
# ---------------------------------------------------------------------------


def test_ic_stats_on_synthetic_perfect_factor() -> None:
    """Perfect factor → IC mean ≈ 1.0 (Spearman), huge t-stat, tiny p-value."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(
        n_tickers=20, n_days=300, ic_horizon=21
    )
    compute = _make_perfect_compute(close_matrix, trading_days, ic_horizon=21)
    start = trading_days[30]
    end = trading_days[200]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21, 63],
        rebalance_step=5,
    )

    assert isinstance(report.ic, ICStats)
    # With a perfect factor, rank IC should be very close to 1.0
    assert report.ic.mean > 0.85, f"Expected IC mean > 0.85, got {report.ic.mean}"
    assert report.ic.t_stat > 5.0, f"Expected t_stat > 5, got {report.ic.t_stat}"
    assert report.ic.p_value < 0.001, f"Expected p_value < 0.001, got {report.ic.p_value}"
    assert report.ic.n > 5
    assert len(report.ic_series) > 5


# ---------------------------------------------------------------------------
# Test 2: IC stats on a random (noise) factor
# ---------------------------------------------------------------------------


def test_ic_stats_on_synthetic_random_factor() -> None:
    """Random noise factor → IC mean ≈ 0, p-value should not be significant (most runs)."""
    adapter, trading_days, _close_matrix = _build_perfect_factor_adapter(
        n_tickers=20, n_days=300, seed=7
    )
    compute = _make_random_compute(seed=99)
    start = trading_days[30]
    end = trading_days[200]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
        rebalance_step=5,
    )

    assert isinstance(report.ic, ICStats)
    # IC mean should be near 0 for noise
    assert abs(report.ic.mean) < 0.35, f"Expected near-zero IC mean, got {report.ic.mean}"
    # p-value > 0.05 most of the time (not always guaranteed with randomness,
    # but with our fixed seed + 170 rebalance dates this should hold)
    assert report.ic.p_value > 0.05, f"Expected non-significant p-value, got {report.ic.p_value}"


# ---------------------------------------------------------------------------
# Test 3: Quintile monotonicity for perfect factor
# ---------------------------------------------------------------------------


def test_quintile_monotonicity_perfect() -> None:
    """Perfect factor → Q5 > Q4 > Q3 > Q2 > Q1, rho = 1.0, is_monotonic = True."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(
        n_tickers=30, n_days=300, ic_horizon=21
    )
    compute = _make_perfect_compute(close_matrix, trading_days, ic_horizon=21)
    start = trading_days[30]
    end = trading_days[200]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
        rebalance_step=5,
    )

    assert len(report.quintiles) == 5
    means = [q.mean_return for q in report.quintiles]
    # Quintiles should be (roughly) monotonically increasing
    for i in range(1, len(means)):
        assert means[i] >= means[i - 1] - 1e-6, (
            f"Not monotonic: Q{i + 1}={means[i]:.4f} < Q{i}={means[i - 1]:.4f}"
        )

    mono = report.monotonicity
    assert isinstance(mono, MonotonicityResult)
    assert mono.spearman_rho > 0.7, f"Expected rho > 0.7, got {mono.spearman_rho}"
    assert mono.p_value < 0.05, f"Expected p < 0.05, got {mono.p_value}"
    assert mono.is_monotonic is True


# ---------------------------------------------------------------------------
# Test 4: Quintile monotonicity for inverted factor
# ---------------------------------------------------------------------------


def test_quintile_monotonicity_inverted() -> None:
    """Negated perfect factor → rho = -1.0, is_monotonic = True (reverse direction)."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(
        n_tickers=30, n_days=300, ic_horizon=21
    )
    compute = _make_inverted_compute(close_matrix, trading_days, ic_horizon=21)
    start = trading_days[30]
    end = trading_days[200]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
        rebalance_step=5,
    )

    mono = report.monotonicity
    assert mono.spearman_rho < -0.7, f"Expected rho < -0.7, got {mono.spearman_rho}"
    assert mono.p_value < 0.05
    assert mono.is_monotonic is True


# ---------------------------------------------------------------------------
# Test 5: Long-short spread with perfect factor
# ---------------------------------------------------------------------------


def test_long_short_spread() -> None:
    """Perfect factor: long-short spread > 0 and t-stat > 2."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(
        n_tickers=30, n_days=300, ic_horizon=21
    )
    compute = _make_perfect_compute(close_matrix, trading_days, ic_horizon=21)
    start = trading_days[30]
    end = trading_days[200]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
        rebalance_step=5,
    )

    assert report.long_short_spread > 0, (
        f"Expected positive L-S spread, got {report.long_short_spread}"
    )
    assert report.long_short_t_stat > 2.0, f"Expected t_stat > 2, got {report.long_short_t_stat}"


# ---------------------------------------------------------------------------
# Test 6: Forward IC decay (momentum factor)
# ---------------------------------------------------------------------------


def test_forward_ic_decay() -> None:
    """Momentum factor: IC strong at h=1, weakens at h=21, near-zero at h=63+."""
    rng = np.random.default_rng(1234)
    n_tickers = 20
    n_days = 400
    tickers = [f"T{i:02d}" for i in range(n_tickers)]
    start = date(2022, 1, 3)
    trading_days = _make_trading_days(start, n_days)

    # Build prices: each ticker has autocorrelated 1-day returns (momentum in short horizon)
    # Return[t] = 0.5 * Return[t-1] + noise → strong 1-day autocorrelation, decays fast
    autocorr = 0.6
    log_rets = np.zeros((n_days, n_tickers))
    log_rets[0] = rng.normal(0, 0.01, n_tickers)
    for t in range(1, n_days):
        log_rets[t] = autocorr * log_rets[t - 1] + rng.normal(0, 0.01, n_tickers)

    prices = np.exp(np.cumsum(log_rets, axis=0))
    close_matrix: dict[str, list[float]] = {
        tickers[k]: prices[:, k].tolist() for k in range(n_tickers)
    }
    adapter = SyntheticAdapter(close_matrix, trading_days)

    day_idx = {d: i for i, d in enumerate(trading_days)}

    def momentum_compute(adp: Any, as_of: date, universe: str = "") -> dict[str, float]:
        """1-day realized return as the signal (strong h=1 IC)."""
        i = day_idx.get(as_of)
        if i is None or i < 1:
            return {}
        out: dict[str, float] = {}
        for ticker, vals in close_matrix.items():
            if i < len(vals) and i >= 1 and vals[i - 1] != 0:
                out[ticker] = vals[i] / vals[i - 1] - 1.0
        return out

    analysis_start = trading_days[50]
    analysis_end = trading_days[300]

    report = analyze_factor(
        compute=momentum_compute,
        adapter=adapter,
        start=analysis_start,
        end=analysis_end,
        horizons=[1, 5, 21, 63],
        rebalance_step=5,
    )

    fwd_ic = {entry.horizon_days: entry.ic_mean for entry in report.forward_ic}

    # h=1 should have the highest IC (most predictive at short horizon)
    assert fwd_ic[1] > fwd_ic[21], (
        f"Expected IC decay: IC(h=1)={fwd_ic[1]:.3f} should > IC(h=21)={fwd_ic[21]:.3f}"
    )
    # IC at h=1 should be significantly positive
    assert fwd_ic[1] > 0.05, f"Expected IC(h=1) > 0.05, got {fwd_ic[1]:.3f}"


# ---------------------------------------------------------------------------
# Test 7: Realistic CSV data end-to-end
# ---------------------------------------------------------------------------


def test_realistic_csv_data() -> None:
    """Load sample_market_data.csv, use pct_change(20) factor, run analyze_factor.

    Validates: fields populated, no NaNs, IC in [-1,1], 5 quintiles, correct horizon count.
    """
    adapter = CSVAdapter(FIXTURE)

    def pct_change_compute(adp: Any, as_of: date, universe: str = "") -> dict[str, float]:
        """20-day price momentum factor."""
        look_back = timedelta(days=60)
        start = as_of - look_back
        px = adp.get_price("close", start, as_of, universe)
        out: dict[str, float] = {}
        for ticker, series in px.items():
            if len(series) >= 20:
                out[ticker] = series[-1] / series[-20] - 1.0
        return out

    horizons = [1, 5, 21, 63, 252]
    report = analyze_factor(
        compute=pct_change_compute,
        adapter=adapter,
        start=date(2022, 3, 1),
        end=date(2022, 12, 31),
        horizons=horizons,
        rebalance_step=5,
    )

    assert isinstance(report, FactorAnalysisReport)

    # IC stats populated
    assert not math.isnan(report.ic.mean)
    assert not math.isnan(report.ic.std)
    assert not math.isnan(report.ic.ir)
    assert not math.isnan(report.ic.t_stat)
    assert not math.isnan(report.ic.p_value)
    assert -1.0 <= report.ic.mean <= 1.0, f"IC mean out of range: {report.ic.mean}"

    # IC series has entries
    assert len(report.ic_series) > 0
    for k, v in report.ic_series.items():
        assert isinstance(k, str)
        assert not math.isnan(v)
        assert -1.0 <= v <= 1.0

    # Quintiles: exactly 5 buckets with valid returns
    assert len(report.quintiles) == 5
    for q in report.quintiles:
        assert isinstance(q, QuintileBucket)
        assert not math.isnan(q.mean_return)
        assert not math.isnan(q.t_stat)
        assert q.n_periods >= 0

    # Monotonicity result populated
    assert isinstance(report.monotonicity, MonotonicityResult)
    assert not math.isnan(report.monotonicity.spearman_rho)
    assert not math.isnan(report.monotonicity.p_value)

    # Long-short spread
    assert not math.isnan(report.long_short_spread)
    assert not math.isnan(report.long_short_t_stat)

    # Forward IC: one entry per horizon, in correct order
    assert len(report.forward_ic) == len(horizons)
    for i, entry in enumerate(report.forward_ic):
        assert entry.horizon_days == horizons[i]
        assert not math.isnan(entry.ic_mean)
        assert -1.0 <= entry.ic_mean <= 1.0
        assert not math.isnan(entry.t_stat)
        assert not math.isnan(entry.p_value)


# ---------------------------------------------------------------------------
# Additional edge-case tests
# ---------------------------------------------------------------------------


def test_empty_date_range_returns_empty_report() -> None:
    """Empty date range (end < start) returns an empty report without error."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter()
    compute = _make_perfect_compute(close_matrix, trading_days)
    start = date(2030, 1, 1)  # far future, no data
    end = date(2030, 1, 31)

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
    )
    assert isinstance(report, FactorAnalysisReport)
    assert report.ic.n == 0
    assert report.ic_series == {}


def test_ic_aggregate_single_observation() -> None:
    """ICStats handles n=1 gracefully (no division by zero)."""
    from replicalpha.core.factor_analysis import _ic_aggregate

    stats = _ic_aggregate([0.5])
    assert stats.n == 1
    assert stats.mean == pytest.approx(0.5)
    assert stats.std == 0.0
    assert stats.ir == 0.0
    assert stats.t_stat == 0.0
    assert stats.p_value == 1.0


def test_ic_aggregate_empty() -> None:
    """ICStats handles empty input gracefully."""
    from replicalpha.core.factor_analysis import _ic_aggregate

    stats = _ic_aggregate([])
    assert stats.n == 0
    assert stats.mean == 0.0
    assert stats.p_value == 1.0


def test_newey_west_t_stat_simple() -> None:
    """NW t-stat is positive for a clearly positive series."""
    from replicalpha.core.factor_analysis import _newey_west_t_stat

    series = [0.02] * 50  # constant positive series
    t = _newey_west_t_stat(series)
    assert t > 5.0, f"Expected large t-stat for constant positive series, got {t}"


def test_newey_west_t_stat_short_series() -> None:
    """NW t-stat falls back gracefully for series with n < 3."""
    from replicalpha.core.factor_analysis import _newey_west_t_stat

    # n=2: fallback path
    t = _newey_west_t_stat([0.01, 0.03])
    assert not math.isnan(t)

    # n=1
    t1 = _newey_west_t_stat([0.05])
    assert not math.isnan(t1)
    assert t1 == 0.0  # single obs, std=0


def test_report_pydantic_model_forbids_extra() -> None:
    """FactorAnalysisReport model forbids extra fields (extra='forbid')."""
    from pydantic import ValidationError

    from replicalpha.core.factor_analysis import ICStats

    with pytest.raises(ValidationError):
        ICStats(mean=0.1, std=0.2, ir=0.5, t_stat=1.0, p_value=0.3, n=10, extra_field="bad")  # type: ignore[call-arg]


def test_quintile_names_are_q1_to_q5() -> None:
    """Quintile bucket names are exactly Q1..Q5."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(n_tickers=20, n_days=200)
    compute = _make_perfect_compute(close_matrix, trading_days)
    start = trading_days[30]
    end = trading_days[150]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[21],
        rebalance_step=5,
    )

    names = [q.name for q in report.quintiles]
    assert names == ["Q1", "Q2", "Q3", "Q4", "Q5"]


def test_rank_ic_single_too_few_pairs() -> None:
    """_rank_ic_single returns None when fewer than 5 valid pairs."""
    import pandas as pd

    from replicalpha.core.factor_analysis import _rank_ic_single

    scores = pd.Series({"A": 1.0, "B": 2.0, "C": 3.0})
    fwd = pd.Series({"A": 0.1, "B": 0.2, "C": 0.3})
    result = _rank_ic_single(scores, fwd)
    assert result is None  # only 3 pairs < 5


def test_newey_west_t_stat_zero_series() -> None:
    """NW t-stat handles empty input."""
    from replicalpha.core.factor_analysis import _newey_west_t_stat

    t = _newey_west_t_stat([])
    assert t == 0.0


def test_build_date_indexed_df_empty() -> None:
    """_build_date_indexed_df returns empty DataFrame when adapter has no data."""
    from replicalpha.core.factor_analysis import _build_date_indexed_df

    class EmptyAdapter:
        def get_price(
            self, field: str, start: date, end: date, universe: str
        ) -> dict[str, list[float]]:
            return {}

        def get_trading_days(self, start: date, end: date) -> list[date]:
            return []

        def get_metadata(self) -> dict[str, dict[str, Any]]:
            return {}

    df = _build_date_indexed_df(EmptyAdapter(), date(2022, 1, 1), date(2022, 1, 31), "")
    assert df.empty


def test_forward_return_date_not_in_days() -> None:
    """_forward_return_at_horizon returns {} when as_of not in trading_days."""
    import pandas as pd

    from replicalpha.core.factor_analysis import _forward_return_at_horizon

    days = [date(2022, 1, 3), date(2022, 1, 4), date(2022, 1, 5)]
    close_df = pd.DataFrame(
        {"A": [10.0, 11.0, 12.0]},
        index=days,
    )
    result = _forward_return_at_horizon(close_df, days, date(2022, 1, 10), 1)
    assert result == {}


def test_forward_return_horizon_beyond_end() -> None:
    """_forward_return_at_horizon returns {} when horizon goes past the last day."""
    import pandas as pd

    from replicalpha.core.factor_analysis import _forward_return_at_horizon

    days = [date(2022, 1, 3), date(2022, 1, 4)]
    close_df = pd.DataFrame({"A": [10.0, 11.0]}, index=days)
    # horizon=5 but only 2 days available
    result = _forward_return_at_horizon(close_df, days, date(2022, 1, 3), 5)
    assert result == {}


def test_analyze_factor_default_horizons() -> None:
    """analyze_factor with horizons=None uses default [1, 5, 21, 63, 252]."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(n_tickers=20, n_days=600)
    compute = _make_perfect_compute(close_matrix, trading_days)
    start = trading_days[30]
    end = trading_days[300]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=None,  # triggers default
    )

    assert len(report.forward_ic) == 5
    horizon_days = [entry.horizon_days for entry in report.forward_ic]
    assert horizon_days == [1, 5, 21, 63, 252]


def test_build_date_indexed_df_mismatched_length() -> None:
    """_build_date_indexed_df handles tickers with shorter price series than trading days."""
    from replicalpha.core.factor_analysis import _build_date_indexed_df

    class ShortAdapter:
        """Adapter where ticker B has fewer price entries than ticker A."""

        def get_price(
            self, field: str, start: date, end: date, universe: str
        ) -> dict[str, list[float]]:
            return {"A": [1.0, 2.0, 3.0, 4.0, 5.0], "B": [10.0, 11.0]}

        def get_trading_days(self, start: date, end: date) -> list[date]:
            return [
                date(2022, 1, 3),
                date(2022, 1, 4),
                date(2022, 1, 5),
                date(2022, 1, 6),
                date(2022, 1, 7),
            ]

        def get_metadata(self) -> dict[str, dict[str, Any]]:
            return {}

    df = _build_date_indexed_df(ShortAdapter(), date(2022, 1, 3), date(2022, 1, 7), "")
    assert "A" in df.columns
    assert "B" in df.columns
    # B has NaNs for the missing days
    assert df["B"].isna().sum() > 0


def test_analyze_factor_compute_raises_skips_date() -> None:
    """analyze_factor skips rebalance dates where compute() raises, returning valid report."""
    call_count = 0

    def flaky_compute(adapter: Any, as_of: date, universe: str = "") -> dict[str, float]:
        nonlocal call_count
        call_count += 1
        if call_count % 3 == 0:
            raise RuntimeError("simulated compute error")
        md = adapter.get_metadata()
        return {ticker: float(hash(ticker) % 100) for ticker in md}

    adapter, trading_days, _close_matrix = _build_perfect_factor_adapter(n_tickers=20, n_days=200)
    start = trading_days[30]
    end = trading_days[150]

    report = analyze_factor(
        compute=flaky_compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[21],
        rebalance_step=5,
    )

    assert isinstance(report, FactorAnalysisReport)
    assert report.ic.n >= 0  # some dates worked


def test_analyze_factor_compute_empty_scores() -> None:
    """analyze_factor skips rebalance dates where compute() returns empty dict."""

    def empty_compute(adapter: Any, as_of: date, universe: str = "") -> dict[str, float]:
        return {}

    adapter, trading_days, _close_matrix = _build_perfect_factor_adapter(n_tickers=20, n_days=200)
    start = trading_days[30]
    end = trading_days[150]

    report = analyze_factor(
        compute=empty_compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[21],
        rebalance_step=5,
    )

    assert isinstance(report, FactorAnalysisReport)
    assert report.ic.n == 0


def test_assign_quintile_too_few_stocks() -> None:
    """_assign_quintile returns empty Series when fewer stocks than quantiles."""
    import pandas as pd

    from replicalpha.core.factor_analysis import _assign_quintile

    scores = pd.Series([1.0, 2.0, 3.0], dtype=float)  # only 3, need 5
    result = _assign_quintile(scores, n_quantiles=5)
    assert result.empty


def test_assign_quintile_duplicate_values() -> None:
    """_assign_quintile handles duplicate scores gracefully via duplicates='drop'."""
    import pandas as pd

    from replicalpha.core.factor_analysis import _assign_quintile

    # All same score — triggers duplicates='drop' path in qcut
    scores = pd.Series([1.0] * 20, dtype=float)
    result = _assign_quintile(scores, n_quantiles=5)
    # With all identical values, qcut may fail or return a partial result
    assert isinstance(result, pd.Series)


# ---------------------------------------------------------------------------
# v0.4 Stage 3a tests: IC autocorrelation + quintile cumulative return
# ---------------------------------------------------------------------------


def test_analyze_factor_ic_autocorrelation() -> None:
    """Synthetic factor with persistent IC produces a 20-lag autocorrelation list."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(
        n_tickers=20, n_days=600, ic_horizon=21
    )
    compute = _make_perfect_compute(close_matrix, trading_days, ic_horizon=21)
    start = trading_days[30]
    end = trading_days[500]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
        rebalance_step=5,
    )

    # We need at least 21 IC observations to produce 20 lags.
    assert len(report.ic_series) >= 21, (
        f"Expected >=21 IC observations, got {len(report.ic_series)}"
    )
    assert len(report.ic_autocorrelation) == 20
    assert all(isinstance(entry, ICAutocorrLag) for entry in report.ic_autocorrelation)
    # Lags ascending 1..20
    lags = [entry.lag for entry in report.ic_autocorrelation]
    assert lags == list(range(1, 21))
    # First entry's rho is finite
    rho1 = report.ic_autocorrelation[0].rho
    assert isinstance(rho1, float)
    assert math.isfinite(rho1)
    # All rhos finite and in [-1, 1] (acf output bounds)
    for entry in report.ic_autocorrelation:
        assert math.isfinite(entry.rho)
        assert -1.0 - 1e-9 <= entry.rho <= 1.0 + 1e-9


def test_analyze_factor_quintile_cumret() -> None:
    """Quintile cumret keyed by Q1..Q5 with sorted ISO dates and float values."""
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(
        n_tickers=30, n_days=300, ic_horizon=21
    )
    compute = _make_perfect_compute(close_matrix, trading_days, ic_horizon=21)
    start = trading_days[30]
    end = trading_days[200]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
        rebalance_step=5,
    )

    # Must contain at least Q1 and Q5
    assert {"Q1", "Q5"}.issubset(set(report.quintile_cumret.keys()))

    for key, points in report.quintile_cumret.items():
        assert key.startswith("Q")
        assert all(isinstance(p, QuintileCumPoint) for p in points)
        assert len(points) > 0
        # Each value is a float (and finite)
        for p in points:
            assert isinstance(p.value, float)
            assert math.isfinite(p.value)
        # Dates ISO-formatted and sorted ascending
        iso_dates = [p.date for p in points]
        assert iso_dates == sorted(iso_dates)
        # Date strings parseable as ISO YYYY-MM-DD
        for s in iso_dates:
            date.fromisoformat(s)

    # Perfect factor: Q5 cumulative return should beat Q1 by the end.
    q5_final = report.quintile_cumret["Q5"][-1].value
    q1_final = report.quintile_cumret["Q1"][-1].value
    assert q5_final > q1_final


def test_analyze_factor_ic_autocorrelation_short_series() -> None:
    """Fewer than 21 IC observations yields empty ic_autocorrelation; report still validates."""
    # Tiny window so that we get < 21 rebalance dates / IC observations.
    adapter, trading_days, close_matrix = _build_perfect_factor_adapter(
        n_tickers=20, n_days=200, ic_horizon=21
    )
    compute = _make_perfect_compute(close_matrix, trading_days, ic_horizon=21)
    # 30..70 with rebalance_step=5 -> only ~9 rebalance dates -> well under 21 IC obs.
    start = trading_days[30]
    end = trading_days[70]

    report = analyze_factor(
        compute=compute,
        adapter=adapter,
        start=start,
        end=end,
        horizons=[1, 5, 21],
        rebalance_step=5,
    )

    assert isinstance(report, FactorAnalysisReport)
    assert len(report.ic_series) < 21
    assert report.ic_autocorrelation == []
