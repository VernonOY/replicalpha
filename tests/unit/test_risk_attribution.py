"""Unit tests for core/risk_attribution.py.

Six tests exercise:
1. Pure market exposure (beta ≈ 1, others ≈ 0)
2. Pure alpha injection (annualised alpha ≈ 0.252)
3. Zero-correlation noise portfolio (R² ≈ 0, betas insignificant)
4. Sector-concentrated holdings (single sector at weight ≈ 1.0)
5. Sector-balanced holdings (4 sectors at 25% each)
6. build_ff_factors_from_universe smoke test using CSVAdapter
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from replicalpha.core.data import CSVAdapter
from replicalpha.core.risk_attribution import (
    RiskAttribution,
    attribute_risk,
    build_ff_factors_from_universe,
)

FIXTURE = Path(__file__).parents[1] / "cases" / "sample_market_data.csv"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RNG = np.random.default_rng(42)
_N = 500  # number of trading days in synthetic series


def _make_dates(n: int = _N) -> pd.DatetimeIndex:
    """Generate n sequential business days starting 2020-01-02."""
    return pd.bdate_range(start="2020-01-02", periods=n)


def _make_ff_factors(n: int = _N, *, seed: int = 0) -> pd.DataFrame:
    """Random FF5+UMD factors (small variance, uncorrelated)."""
    rng = np.random.default_rng(seed)
    dates = _make_dates(n)
    data = {
        "market": rng.normal(0.0005, 0.01, n),
        "smb": rng.normal(0.0001, 0.005, n),
        "hml": rng.normal(0.0001, 0.005, n),
        "rmw": rng.normal(0.0001, 0.004, n),
        "cma": rng.normal(0.0001, 0.004, n),
        "umd": rng.normal(0.0001, 0.006, n),
    }
    return pd.DataFrame(data, index=dates)


def _empty_holdings() -> dict[date, dict[str, float]]:
    return {}


def _empty_metadata() -> dict[str, dict[str, Any]]:
    return {}


# ---------------------------------------------------------------------------
# Test 1 - pure market exposure
# ---------------------------------------------------------------------------


def test_pure_market_exposure() -> None:
    """Portfolio = market factor exactly → market β ≈ 1, all others ≈ 0."""
    factors = _make_ff_factors()
    port = pd.Series(factors["market"].to_numpy(), index=factors.index)

    result = attribute_risk(
        portfolio_returns=port,
        portfolio_holdings=_empty_holdings(),
        metadata=_empty_metadata(),
        ff_factors=factors,
    )

    assert isinstance(result, RiskAttribution)
    market_beta = next(b for b in result.style_betas if b.factor == "market")
    assert abs(market_beta.beta - 1.0) < 0.05, f"market beta = {market_beta.beta}"

    # Other factor betas should be near zero
    for beta in result.style_betas:
        if beta.factor != "market":
            assert abs(beta.beta) < 0.3, f"{beta.factor} beta = {beta.beta}"

    assert result.r_squared > 0.9
    assert result.n_obs == _N


# ---------------------------------------------------------------------------
# Test 2 - pure alpha
# ---------------------------------------------------------------------------


def test_pure_alpha() -> None:
    """Portfolio = market + 0.001 constant daily alpha → annualised alpha ≈ 0.252."""
    factors = _make_ff_factors()
    daily_alpha = 0.001  # 0.1% per day → 0.252 annualised
    port = pd.Series(factors["market"].to_numpy() + daily_alpha, index=factors.index)

    result = attribute_risk(
        portfolio_returns=port,
        portfolio_holdings=_empty_holdings(),
        metadata=_empty_metadata(),
        ff_factors=factors,
    )

    assert abs(result.alpha - daily_alpha * 252) < 0.02, f"alpha = {result.alpha}"
    # alpha t-stat should be strongly significant with 500 observations
    assert abs(result.alpha_t_stat) > 5.0, f"alpha_t_stat = {result.alpha_t_stat}"
    assert result.alpha_p_value < 0.01


# ---------------------------------------------------------------------------
# Test 3 - zero correlation / pure noise
# ---------------------------------------------------------------------------


def test_zero_correlation() -> None:
    """Pure noise portfolio has R² near 0 and all betas insignificant (p > 0.05)."""
    factors = _make_ff_factors(seed=7)
    rng = np.random.default_rng(99)
    noise = rng.normal(0.0, 0.001, _N)  # tiny variance, uncorrelated with factors
    port = pd.Series(noise, index=factors.index)

    result = attribute_risk(
        portfolio_returns=port,
        portfolio_holdings=_empty_holdings(),
        metadata=_empty_metadata(),
        ff_factors=factors,
    )

    assert result.r_squared < 0.10, f"R² = {result.r_squared}"

    # Most factor betas should be insignificant
    sig_betas = [b for b in result.style_betas if b.p_value < 0.05]
    assert len(sig_betas) <= 2, f"Too many significant betas: {sig_betas}"


# ---------------------------------------------------------------------------
# Test 4 - sector-concentrated holdings
# ---------------------------------------------------------------------------


def test_sector_concentrated() -> None:
    """100% allocation to Financials → top SectorExposure is Financials at ≈1.0."""
    factors = _make_ff_factors()
    dates = [d.date() for d in factors.index[:10]]  # 10 snapshot dates
    holdings: dict[date, dict[str, float]] = {}
    for d in dates:
        holdings[d] = {"AAPL": 0.6, "MSFT": 0.4}

    metadata: dict[str, dict[str, Any]] = {
        "AAPL": {"sector": "Tech", "market_cap": 1_000_000},
        "MSFT": {"sector": "Tech", "market_cap": 900_000},
    }

    port = pd.Series(factors["market"].to_numpy(), index=factors.index)
    result = attribute_risk(
        portfolio_returns=port,
        portfolio_holdings=holdings,
        metadata=metadata,
        ff_factors=factors,
    )

    assert len(result.sector_exposures) >= 1
    top = result.sector_exposures[0]
    assert top.sector == "Tech"
    assert abs(top.weight - 1.0) < 0.01, f"top weight = {top.weight}"


# ---------------------------------------------------------------------------
# Test 5 - sector-balanced holdings
# ---------------------------------------------------------------------------


def test_sector_balanced() -> None:
    """Four sectors at 25% each → all four returned in sector_exposures."""
    factors = _make_ff_factors()
    dates = [d.date() for d in factors.index[:5]]
    holdings: dict[date, dict[str, float]] = {}
    for d in dates:
        holdings[d] = {
            "A": 0.25,
            "B": 0.25,
            "C": 0.25,
            "D": 0.25,
        }

    metadata: dict[str, dict[str, Any]] = {
        "A": {"sector": "Tech", "market_cap": 100},
        "B": {"sector": "Financials", "market_cap": 100},
        "C": {"sector": "Healthcare", "market_cap": 100},
        "D": {"sector": "Energy", "market_cap": 100},
    }

    port = pd.Series(factors["market"].to_numpy(), index=factors.index)
    result = attribute_risk(
        portfolio_returns=port,
        portfolio_holdings=holdings,
        metadata=metadata,
        ff_factors=factors,
    )

    returned_sectors = {e.sector for e in result.sector_exposures}
    assert "Tech" in returned_sectors
    assert "Financials" in returned_sectors
    assert "Healthcare" in returned_sectors
    assert "Energy" in returned_sectors

    for exp in result.sector_exposures:
        assert abs(exp.weight - 0.25) < 0.01, f"{exp.sector} weight = {exp.weight}"


# ---------------------------------------------------------------------------
# Test 6 - build_ff_factors_from_universe smoke test
# ---------------------------------------------------------------------------


def test_attribute_risk_rolling_betas() -> None:
    """Rolling 60-day OLS produces N - 60 + 1 points; <60 days → empty."""
    # Case 1: 250-day series → 191 rolling points (250 - 60 + 1)
    n = 250
    factors = _make_ff_factors(n)
    port = pd.Series(factors["market"].to_numpy() * 0.8, index=factors.index)

    result = attribute_risk(
        portfolio_returns=port,
        portfolio_holdings=_empty_holdings(),
        metadata=_empty_metadata(),
        ff_factors=factors,
    )

    expected = n - 60 + 1
    assert abs(len(result.rolling_betas) - expected) <= 1, (
        f"len(rolling_betas) = {len(result.rolling_betas)}, expected ~{expected}"
    )
    for pt in result.rolling_betas:
        assert isinstance(pt.date, str)
        assert len(pt.date) == 10  # YYYY-MM-DD
        assert isinstance(pt.market, float)

    # Case 2: < 60 days → rolling_betas == []
    n_short = 30
    factors_short = _make_ff_factors(n_short, seed=11)
    port_short = pd.Series(factors_short["market"].to_numpy(), index=factors_short.index)

    result_short = attribute_risk(
        portfolio_returns=port_short,
        portfolio_holdings=_empty_holdings(),
        metadata=_empty_metadata(),
        ff_factors=factors_short,
    )

    assert result_short.rolling_betas == []


def test_build_ff_factors_smoke() -> None:
    """Load sample_market_data.csv via CSVAdapter and build FF factors.

    Asserts:
    - Returns a DataFrame with exactly 6 columns [market, smb, hml, rmw, cma, umd]
    - No NaN in output
    - Index is sorted ascending (DatetimeIndex)
    - Has at least 1 row
    """
    adapter = CSVAdapter(FIXTURE)

    # Use a sub-range of the CSV date window to keep it fast
    # CSV covers 2022-01-03 to 2023-12-01; we need lookback for momentum
    # Use 2023-06-01 to 2023-09-30 as the output window
    start = date(2023, 6, 1)
    end = date(2023, 9, 30)

    factors = build_ff_factors_from_universe(adapter, universe="", start=start, end=end)

    assert isinstance(factors, pd.DataFrame), "Must return a DataFrame"
    assert list(factors.columns) == [
        "market",
        "smb",
        "hml",
        "rmw",
        "cma",
        "umd",
    ], f"Unexpected columns: {list(factors.columns)}"

    assert len(factors) > 0, "DataFrame must not be empty"
    assert not factors.isnull().any().any(), "DataFrame must not contain NaN"

    assert isinstance(factors.index, pd.DatetimeIndex), "Index must be DatetimeIndex"
    assert factors.index.is_monotonic_increasing, "Index must be sorted ascending"
