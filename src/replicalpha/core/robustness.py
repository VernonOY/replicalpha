"""Factor robustness diagnostics.

Given an IC time-series (and optional market / panel data) this module checks
whether a factor's information coefficient holds up across:

- **Subperiods** - yearly or quarterly aggregation with t-stat
- **Market regimes** - bull / bear / sideways defined by 200-day MA + 60-day return
- **Bootstrap CI** - seeded resampling to quantify IC uncertainty
- **Universe splits** - IC per market-cap tercile (large / mid / small)

All results are packaged in a ``RobustnessReport`` Pydantic model.
This module is pure computation: no IO, no LLM, no HTTP.
"""

from __future__ import annotations

import math
from typing import Literal

import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict

# ---------------------------------------------------------------------------
# Pydantic result models
# ---------------------------------------------------------------------------


class SubperiodIC(BaseModel):
    model_config = ConfigDict(extra="forbid")

    period: str  # 'YYYY' for yearly, 'YYYY-Q#' for quarterly
    ic: float
    t_stat: float
    n_obs: int


class RegimeIC(BaseModel):
    model_config = ConfigDict(extra="forbid")

    regime: Literal["bull", "bear", "sideways"]
    ic: float
    t_stat: float
    n_obs: int


class BootstrapCI(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mean: float
    ci_lower: float
    ci_upper: float
    n_bootstrap: int
    confidence: float


class UniverseSliceIC(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slice_name: Literal["large_cap", "mid_cap", "small_cap"]
    ic: float
    t_stat: float
    n_stocks: int


class RobustnessReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    yearly: list[SubperiodIC]
    quarterly: list[SubperiodIC]
    regimes: list[RegimeIC]
    bootstrap_ic: BootstrapCI
    universe_split: list[UniverseSliceIC]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _t_stat_from_values(values: list[float]) -> float:
    """Compute t-stat for the hypothesis that mean != 0.

    Returns 0.0 for degenerate inputs (n < 2 or zero std).
    """
    n = len(values)
    if n < 2:
        return 0.0
    arr = np.array(values, dtype=float)
    mean = float(arr.mean())
    std = float(arr.std(ddof=1))
    if std == 0.0:
        return 0.0
    return mean / (std / math.sqrt(n))


def _aggregate_ic_group(values: list[float]) -> tuple[float, float, int]:
    """Return (mean_ic, t_stat, n_obs) for a list of IC values."""
    n = len(values)
    if n == 0:
        return 0.0, 0.0, 0
    mean = float(np.mean(values))
    t = _t_stat_from_values(values)
    return mean, t, n


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def subperiod_ic(
    ic_series: dict[str, float],
    freq: str = "Y",
) -> list[SubperiodIC]:
    """Aggregate IC values into yearly or quarterly subperiods.

    Parameters
    ----------
    ic_series:
        Mapping of ISO date string ('YYYY-MM-DD') to IC value.
    freq:
        'Y' for yearly, 'Q' for quarterly.

    Returns
    -------
    List of ``SubperiodIC`` entries sorted by period label ascending.
    """
    if freq not in ("Y", "Q"):
        raise ValueError(f"freq must be 'Y' or 'Q', got {freq!r}")

    groups: dict[str, list[float]] = {}
    for date_str, ic_val in ic_series.items():
        dt = pd.Timestamp(date_str)
        key = str(dt.year) if freq == "Y" else f"{dt.year}-Q{dt.quarter}"
        groups.setdefault(key, []).append(ic_val)

    result: list[SubperiodIC] = []
    for period in sorted(groups.keys()):
        vals = groups[period]
        mean, t, n = _aggregate_ic_group(vals)
        result.append(SubperiodIC(period=period, ic=mean, t_stat=t, n_obs=n))
    return result


def regime_conditional(
    ic_series: dict[str, float],
    market_returns: pd.Series[float],
) -> list[RegimeIC]:
    """Compute IC conditional on bull / bear / sideways market regime.

    Regime classification per date:
    - Compute market level as cumulative product of (1 + daily return).
    - Compute 200-day rolling MA of market level.
    - Compute 60-day rolling return of market level.
    - bull     : level > 200d MA  AND  60d return > 0
    - bear     : level < 200d MA  AND  60d return < 0
    - sideways : all others

    Parameters
    ----------
    ic_series:
        Mapping of ISO date string to IC value.
    market_returns:
        Daily returns of market index, indexed by ``pd.Timestamp``.

    Returns
    -------
    List of exactly three ``RegimeIC`` entries (bull, bear, sideways) in that
    order; entries with no IC observations have ic=0, t_stat=0, n_obs=0.
    """
    # Build market level from returns
    ret_series: pd.Series[float] = market_returns.sort_index().astype(float)
    level: pd.Series[float] = (1.0 + ret_series).cumprod()

    ma200: pd.Series[float] = level.rolling(window=200, min_periods=1).mean()
    # 60-day return: level_t / level_{t-60} - 1
    ret60: pd.Series[float] = level.pct_change(periods=60)

    def _classify(ts: pd.Timestamp) -> Literal["bull", "bear", "sideways"]:
        if ts not in level.index:
            return "sideways"
        lv = float(level.loc[ts])
        ma = float(ma200.loc[ts])
        r60_val = ret60.loc[ts]
        r60 = float(r60_val) if pd.notna(r60_val) else 0.0
        if lv > ma and r60 > 0:
            return "bull"
        if lv < ma and r60 < 0:
            return "bear"
        return "sideways"

    bucket_vals: dict[str, list[float]] = {"bull": [], "bear": [], "sideways": []}
    for date_str, ic_val in ic_series.items():
        ts = pd.Timestamp(date_str)
        regime_label = _classify(ts)
        bucket_vals[regime_label].append(ic_val)

    _regime_names: tuple[Literal["bull"], Literal["bear"], Literal["sideways"]] = (
        "bull",
        "bear",
        "sideways",
    )
    regime_entries: list[RegimeIC] = []
    for regime_name in _regime_names:
        vals = bucket_vals[regime_name]
        mean, t, n = _aggregate_ic_group(vals)
        regime_entries.append(
            RegimeIC(
                regime=regime_name,
                ic=mean,
                t_stat=t,
                n_obs=n,
            )
        )
    return regime_entries


def bootstrap_ic_ci(
    ic_series: dict[str, float],
    n_bootstrap: int = 1000,
    confidence: float = 0.95,
) -> BootstrapCI:
    """Estimate IC confidence interval via bootstrap resampling.

    Uses numpy RandomState seeded at 42 for reproducibility.

    Parameters
    ----------
    ic_series:
        Mapping of ISO date string to IC value.
    n_bootstrap:
        Number of bootstrap resamples.
    confidence:
        Confidence level (e.g. 0.95 for 95% CI).

    Returns
    -------
    ``BootstrapCI`` with observed mean and CI bounds.
    """
    values = np.array(list(ic_series.values()), dtype=float)
    n = len(values)
    observed_mean = float(values.mean()) if n > 0 else 0.0

    if n == 0:
        return BootstrapCI(
            mean=0.0,
            ci_lower=0.0,
            ci_upper=0.0,
            n_bootstrap=n_bootstrap,
            confidence=confidence,
        )

    rng = np.random.RandomState(seed=42)  # seeded for reproducibility
    boot_means = np.array(
        [float(rng.choice(values, size=n, replace=True).mean()) for _ in range(n_bootstrap)],
        dtype=float,
    )
    boot_means.sort()

    alpha = 1.0 - confidence
    lo_idx = math.floor(alpha / 2.0 * n_bootstrap)
    hi_idx = math.ceil((1.0 - alpha / 2.0) * n_bootstrap) - 1
    lo_idx = max(0, min(lo_idx, n_bootstrap - 1))
    hi_idx = max(0, min(hi_idx, n_bootstrap - 1))

    return BootstrapCI(
        mean=observed_mean,
        ci_lower=float(boot_means[lo_idx]),
        ci_upper=float(boot_means[hi_idx]),
        n_bootstrap=n_bootstrap,
        confidence=confidence,
    )


def universe_split_ic(
    scores_panel: pd.DataFrame,
    returns_panel: pd.DataFrame,
    metadata: dict[str, dict[str, object]],
) -> list[UniverseSliceIC]:
    """Compute IC per market-cap tercile (large / mid / small cap).

    Parameters
    ----------
    scores_panel:
        DataFrame of factor scores, shape (dates, tickers).
    returns_panel:
        DataFrame of forward returns, shape (dates, tickers).
    metadata:
        Mapping ticker → dict with key ``'market_cap'`` (numeric).

    Returns
    -------
    List of three ``UniverseSliceIC`` entries in order:
    large_cap, mid_cap, small_cap.
    """
    from scipy.stats import spearmanr  # local import — scipy already a dep

    # Collect market caps for tickers present in the panel
    all_tickers = list(scores_panel.columns)
    caps: dict[str, float] = {}
    for ticker in all_tickers:
        if ticker in metadata and "market_cap" in metadata[ticker]:
            mc_raw = metadata[ticker]["market_cap"]
            if isinstance(mc_raw, (int, float)):
                caps[ticker] = float(mc_raw)

    if not caps:
        return [
            UniverseSliceIC(slice_name="large_cap", ic=0.0, t_stat=0.0, n_stocks=0),
            UniverseSliceIC(slice_name="mid_cap", ic=0.0, t_stat=0.0, n_stocks=0),
            UniverseSliceIC(slice_name="small_cap", ic=0.0, t_stat=0.0, n_stocks=0),
        ]

    # Assign tercile labels by market cap
    cap_series = pd.Series(caps, dtype=float).sort_values()
    n_cap = len(cap_series)
    boundaries = [
        cap_series.iloc[n_cap // 3],
        cap_series.iloc[2 * n_cap // 3],
    ]

    def _assign_slice(ticker: str) -> Literal["large_cap", "mid_cap", "small_cap"] | None:
        if ticker not in caps:
            return None
        mc = caps[ticker]
        if mc <= boundaries[0]:
            return "small_cap"
        if mc <= boundaries[1]:
            return "mid_cap"
        return "large_cap"

    slice_tickers: dict[str, list[str]] = {"large_cap": [], "mid_cap": [], "small_cap": []}
    for ticker_name in all_tickers:
        label = _assign_slice(ticker_name)
        if label is not None:
            slice_tickers[label].append(ticker_name)

    # Compute IC per slice: for each date, spearman(scores, returns) on slice tickers
    slice_ic_values: dict[str, list[float]] = {"large_cap": [], "mid_cap": [], "small_cap": []}

    common_dates = scores_panel.index.intersection(returns_panel.index)
    for dt in common_dates:
        scores_row: pd.Series[float] = scores_panel.loc[dt].astype(float)
        rets_row: pd.Series[float] = returns_panel.loc[dt].astype(float)
        for sname, stickers in slice_tickers.items():
            if len(stickers) < 5:
                continue
            sc = scores_row[stickers].dropna()
            rt = rets_row[stickers].dropna()
            aligned = pd.concat([sc.rename("s"), rt.rename("r")], axis=1).dropna()
            if len(aligned) < 5:
                continue
            rho, _ = spearmanr(aligned["s"], aligned["r"])
            if not math.isnan(float(rho)):
                slice_ic_values[sname].append(float(rho))

    _slice_names: tuple[Literal["large_cap"], Literal["mid_cap"], Literal["small_cap"]] = (
        "large_cap",
        "mid_cap",
        "small_cap",
    )
    result: list[UniverseSliceIC] = []
    for sname_lit in _slice_names:
        vals = slice_ic_values[sname_lit]
        ic_mean, ic_t, _ = _aggregate_ic_group(vals)
        n_stocks = len(slice_tickers[sname_lit])
        result.append(
            UniverseSliceIC(
                slice_name=sname_lit,
                ic=ic_mean,
                t_stat=ic_t,
                n_stocks=n_stocks,
            )
        )
    return result
