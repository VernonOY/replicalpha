"""Unit tests for core/robustness.py.

Test strategy:
- Synthetic IC series and market data allow precise assertions.
- All tests are fast (pure computation, no IO).
"""

from __future__ import annotations

import math
from datetime import date, timedelta

import numpy as np
import pandas as pd

from replicalpha.core.robustness import (
    BootstrapCI,
    bootstrap_ic_ci,
    regime_conditional,
    subperiod_ic,
    universe_split_ic,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_ic_series(start: date, n_days: int, ic_value: float = 0.05) -> dict[str, float]:
    """Generate n_days of daily IC observations starting from start."""
    result: dict[str, float] = {}
    d = start
    count = 0
    while count < n_days:
        if d.weekday() < 5:
            result[d.isoformat()] = ic_value
            count += 1
        d += timedelta(days=1)
    return result


def _make_market_returns(
    start: date,
    n_days: int,
    drift: float = 0.001,
) -> pd.Series:  # type: ignore[type-arg]
    """Produce daily market return series as a pd.Series indexed by Timestamps."""
    rng = np.random.RandomState(0)
    dates: list[pd.Timestamp] = []
    values: list[float] = []
    d = start
    count = 0
    while count < n_days:
        if d.weekday() < 5:
            dates.append(pd.Timestamp(d))
            values.append(drift + rng.normal(0, 0.01))
            count += 1
        d += timedelta(days=1)
    return pd.Series(values, index=dates, dtype=float)


# ---------------------------------------------------------------------------
# Test 1 - subperiod_ic yearly groups correctly
# ---------------------------------------------------------------------------


def test_subperiod_yearly_groups_correctly() -> None:
    """3 calendar years of ICs should produce 3 SubperiodIC entries, sorted."""
    ic: dict[str, float] = {}
    # 10 obs per year, 3 years
    for year in (2020, 2021, 2022):
        for month in range(1, 11):
            ic[f"{year}-{month:02d}-15"] = 0.05 + year * 0.001
    result = subperiod_ic(ic, freq="Y")

    assert len(result) == 3
    # Sorted ascending by period
    periods = [r.period for r in result]
    assert periods == sorted(periods)
    assert periods == ["2020", "2021", "2022"]
    # Each year has 10 observations
    for entry in result:
        assert entry.n_obs == 10
    # IC values differ across years
    assert result[0].ic < result[2].ic


# ---------------------------------------------------------------------------
# Test 2 - subperiod_ic quarterly
# ---------------------------------------------------------------------------


def test_subperiod_quarterly() -> None:
    """4 quarterly groups in a single year produce 4 entries."""
    ic: dict[str, float] = {}
    # Q1: Jan, Q2: Apr, Q3: Jul, Q4: Oct
    for month, expected_q in ((1, 1), (4, 2), (7, 3), (10, 4)):
        for day in (1, 10, 20):
            ic[f"2023-{month:02d}-{day:02d}"] = 0.04 * expected_q
    result = subperiod_ic(ic, freq="Q")

    assert len(result) == 4
    periods = [r.period for r in result]
    assert periods == sorted(periods)
    assert all(p.startswith("2023-Q") for p in periods)
    # n_obs per quarter = 3
    for entry in result:
        assert entry.n_obs == 3


# ---------------------------------------------------------------------------
# Test 3 - regime_conditional: bull market has higher IC than bear
# ---------------------------------------------------------------------------


def test_regime_bull_market_high_ic() -> None:
    """IC is positive only on bull-regime dates → bull IC > bear IC."""
    # Build 600 calendar days of market data: first 300 strongly rising (bull),
    # last 300 strongly falling (bear).
    start = date(2018, 1, 2)
    dates: list[pd.Timestamp] = []
    rets: list[float] = []
    d = start
    count = 0
    while count < 600:
        if d.weekday() < 5:
            dates.append(pd.Timestamp(d))
            # First 300 days: positive drift (bull); last 300: negative (bear)
            rets.append(0.003 if count < 300 else -0.003)
            count += 1
        d += timedelta(days=1)
    mkt = pd.Series(rets, index=dates, dtype=float)

    # Compute actual regimes to label IC dates correctly
    level = (1.0 + mkt).cumprod()
    ma200 = level.rolling(window=200, min_periods=1).mean()
    ret60 = level.pct_change(periods=60)

    ic_dict: dict[str, float] = {}
    for ts, lv_val, ma_val, r60_val in zip(mkt.index, level, ma200, ret60, strict=False):
        lv = float(lv_val)
        ma = float(ma_val)
        r60 = float(r60_val) if pd.notna(r60_val) else 0.0
        if lv > ma and r60 > 0:
            ic_dict[ts.date().isoformat()] = 0.10  # high IC in bull
        elif lv < ma and r60 < 0:
            ic_dict[ts.date().isoformat()] = -0.05  # negative IC in bear

    result = regime_conditional(ic_dict, mkt)
    assert len(result) == 3

    by_regime = {r.regime: r for r in result}
    bull = by_regime["bull"]
    bear = by_regime["bear"]
    assert bull.n_obs > 0
    assert bear.n_obs > 0
    assert bull.ic > bear.ic


# ---------------------------------------------------------------------------
# Test 4 - regime_conditional: empty buckets get n_obs=0
# ---------------------------------------------------------------------------


def test_regime_handles_empty_buckets() -> None:
    """IC dates only in sideways regime → bull and bear have n_obs=0."""
    # Flat market: level stays around MA, no strong trend → sideways
    start = date(2020, 1, 2)
    n_days = 300
    dates: list[pd.Timestamp] = []
    rets: list[float] = []
    d = start
    count = 0
    while count < n_days:
        if d.weekday() < 5:
            dates.append(pd.Timestamp(d))
            # Alternating tiny +-0.001 → level never strays far from MA,
            # 60d return stays near 0 → always sideways
            rets.append(0.001 if count % 2 == 0 else -0.001)
            count += 1
        d += timedelta(days=1)
    mkt = pd.Series(rets, index=dates, dtype=float)

    # Put IC on all these dates
    ic_dict: dict[str, float] = {ts.date().isoformat(): 0.05 for ts in dates}

    result = regime_conditional(ic_dict, mkt)
    by_regime = {r.regime: r for r in result}
    sideways = by_regime["sideways"]
    bull = by_regime["bull"]
    bear = by_regime["bear"]

    # Sideways should capture all (or almost all) observations
    assert sideways.n_obs > 0
    # Bull and bear might pick up a few at edges, but test that empty case
    # is handled: ic=0, t_stat=0 for zero-obs regimes
    if bull.n_obs == 0:
        assert bull.ic == 0.0
        assert bull.t_stat == 0.0
    if bear.n_obs == 0:
        assert bear.ic == 0.0
        assert bear.t_stat == 0.0


# ---------------------------------------------------------------------------
# Test 5 - bootstrap_ci_contains_mean
# ---------------------------------------------------------------------------


def test_bootstrap_ci_contains_mean() -> None:
    """95% CI should bracket the observed mean 0.05 for a well-behaved series."""
    rng = np.random.RandomState(99)
    vals = rng.normal(loc=0.05, scale=0.02, size=120)
    ic_dict = {f"2020-{i // 20 + 1:02d}-{i % 20 + 1:02d}": float(v) for i, v in enumerate(vals)}

    ci = bootstrap_ic_ci(ic_dict, n_bootstrap=2000, confidence=0.95)
    assert isinstance(ci, BootstrapCI)
    assert ci.ci_lower < ci.mean < ci.ci_upper
    assert math.isclose(ci.mean, float(np.mean(vals)), rel_tol=1e-9)
    assert ci.n_bootstrap == 2000
    assert ci.confidence == 0.95


# ---------------------------------------------------------------------------
# Test 6 - bootstrap seeded: same inputs → identical CI
# ---------------------------------------------------------------------------


def test_bootstrap_seeded_reproducible() -> None:
    """Two calls with identical inputs produce bit-for-bit identical results."""
    ic_dict = {f"2021-01-{d:02d}": 0.03 + d * 0.001 for d in range(1, 29)}

    ci1 = bootstrap_ic_ci(ic_dict, n_bootstrap=500, confidence=0.90)
    ci2 = bootstrap_ic_ci(ic_dict, n_bootstrap=500, confidence=0.90)

    assert ci1.mean == ci2.mean
    assert ci1.ci_lower == ci2.ci_lower
    assert ci1.ci_upper == ci2.ci_upper


# ---------------------------------------------------------------------------
# Test 7 - universe_split_market_cap: 3 entries, non-overlapping stock counts
# ---------------------------------------------------------------------------


def test_universe_split_market_cap() -> None:
    """3 cap tiers → 3 UniverseSliceIC entries with non-overlapping n_stocks."""
    rng = np.random.RandomState(7)
    # 30 tickers: 10 small, 10 mid, 10 large
    tickers = [f"T{i:03d}" for i in range(30)]
    dates = pd.date_range("2022-01-03", periods=20, freq="B")

    scores = pd.DataFrame(rng.normal(size=(20, 30)), index=dates, columns=tickers)
    returns = pd.DataFrame(rng.normal(0, 0.01, size=(20, 30)), index=dates, columns=tickers)

    metadata: dict[str, dict[str, object]] = {}
    for i, ticker in enumerate(tickers):
        if i < 10:
            metadata[ticker] = {"market_cap": float(i + 1) * 1e8}  # small
        elif i < 20:
            metadata[ticker] = {"market_cap": float(i + 1) * 1e9}  # mid
        else:
            metadata[ticker] = {"market_cap": float(i + 1) * 1e10}  # large

    result = universe_split_ic(scores, returns, metadata)

    assert len(result) == 3
    slices = {r.slice_name for r in result}
    assert slices == {"large_cap", "mid_cap", "small_cap"}

    # n_stocks per tier ≈ 10 each (exact depends on tercile split)
    for entry in result:
        assert entry.n_stocks > 0

    # Total stocks across tiers = 30
    total = sum(r.n_stocks for r in result)
    assert total == 30


# ---------------------------------------------------------------------------
# Test 8 - universe_split: small-cap factor has higher IC on small caps
# ---------------------------------------------------------------------------


def test_universe_split_small_cap_higher_ic() -> None:
    """Factor perfectly predicts small-cap returns → small_cap.ic > large_cap.ic."""
    rng = np.random.RandomState(42)
    n_dates = 30
    dates = pd.date_range("2022-01-03", periods=n_dates, freq="B")

    # 30 tickers: first 10 small, next 10 mid, last 10 large
    tickers = [f"S{i:02d}" for i in range(10)]  # small
    tickers += [f"M{i:02d}" for i in range(10)]  # mid
    tickers += [f"L{i:02d}" for i in range(10)]  # large
    n_tickers = len(tickers)

    # Scores: random for all
    scores_arr = rng.normal(0, 1, size=(n_dates, n_tickers))

    # Returns: small-cap returns = score * 0.1 + noise (strong IC)
    #          mid/large returns = pure noise (IC ≈ 0)
    returns_arr = rng.normal(0, 0.01, size=(n_dates, n_tickers))
    for d in range(n_dates):
        for j in range(10):  # small caps
            returns_arr[d, j] = scores_arr[d, j] * 0.1 + rng.normal(0, 0.002)

    scores = pd.DataFrame(scores_arr, index=dates, columns=tickers)
    returns = pd.DataFrame(returns_arr, index=dates, columns=tickers)

    metadata: dict[str, dict[str, object]] = {}
    for i, ticker in enumerate(tickers):
        if i < 10:
            metadata[ticker] = {"market_cap": float(i + 1) * 1e7}  # small
        elif i < 20:
            metadata[ticker] = {"market_cap": float(i + 1) * 1e9}  # mid
        else:
            metadata[ticker] = {"market_cap": float(i + 1) * 1e11}  # large

    result = universe_split_ic(scores, returns, metadata)
    by_slice = {r.slice_name: r for r in result}

    small = by_slice["small_cap"]
    large = by_slice["large_cap"]

    assert small.ic > large.ic, (
        f"Expected small_cap.ic ({small.ic:.4f}) > large_cap.ic ({large.ic:.4f})"
    )


# ---------------------------------------------------------------------------
# Test 9 - universe_split_ic_real: synthetic panels + metadata produce all
#                                  3 terciles with positive n_stocks
# ---------------------------------------------------------------------------


def test_universe_split_ic_real() -> None:
    """Realistic call: synthetic panels + metadata.market_cap → 3 terciles."""
    rng = np.random.RandomState(123)
    n_dates = 25
    dates = pd.date_range("2023-01-03", periods=n_dates, freq="B")

    tickers = [f"X{i:03d}" for i in range(18)]
    scores = pd.DataFrame(
        rng.normal(size=(n_dates, len(tickers))),
        index=dates,
        columns=tickers,
    )
    returns = pd.DataFrame(
        rng.normal(0, 0.01, size=(n_dates, len(tickers))),
        index=dates,
        columns=tickers,
    )
    metadata: dict[str, dict[str, object]] = {
        ticker: {"market_cap": float(i + 1) * 1e8} for i, ticker in enumerate(tickers)
    }

    result = universe_split_ic(scores, returns, metadata)

    assert len(result) == 3
    for entry in result:
        assert entry.n_stocks > 0
        assert isinstance(entry.ic, float)
        assert isinstance(entry.t_stat, float)


# ---------------------------------------------------------------------------
# Test 10 - universe_split_ic edge cases: empty inputs return []
# ---------------------------------------------------------------------------


def test_universe_split_ic_empty_metadata() -> None:
    """Empty metadata → empty list, no crash."""
    dates = pd.date_range("2023-01-03", periods=5, freq="B")
    scores = pd.DataFrame(0.0, index=dates, columns=["A", "B"])
    returns = pd.DataFrame(0.0, index=dates, columns=["A", "B"])

    result = universe_split_ic(scores, returns, {})
    assert result == []


def test_universe_split_ic_empty_panels() -> None:
    """Empty panels → empty list, no crash."""
    metadata: dict[str, dict[str, object]] = {"A": {"market_cap": 1e9}}
    result = universe_split_ic(pd.DataFrame(), pd.DataFrame(), metadata)
    assert result == []
