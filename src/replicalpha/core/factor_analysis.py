"""Alphalens-style factor analysis primitives.

Given a ``compute`` function (same signature as backtest.py's ComputeFn) plus a
DataAdapter, a date window, and a list of forward-return horizons, this module
computes:

- Rank IC time series and aggregate IC stats (mean, std, IR, t-stat, p-value)
- 5-quintile decomposition with Newey-West t-stats per bucket
- Monotonicity test (Spearman rank correlation of bucket rank vs mean return)
- Long-short spread (Q5 - Q1) and its t-stat
- Forward IC at multiple horizons (IC decay curve)

All results are packaged in a ``FactorAnalysisReport`` Pydantic model.
This module is pure computation: no IO, no LLM, no HTTP.
"""

from __future__ import annotations

import math
from datetime import date, timedelta

import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict, Field
from scipy.stats import norm, spearmanr
from statsmodels.regression.linear_model import OLS
from statsmodels.tools import add_constant
from statsmodels.tsa.stattools import acf

from replicalpha.core.backtest import ComputeFn
from replicalpha.core.data import DataAdapter

# ---------------------------------------------------------------------------
# Pydantic result models
# ---------------------------------------------------------------------------


class ICStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mean: float
    std: float
    ir: float  # mean / std
    t_stat: float  # mean / (std / sqrt(n))
    p_value: float
    n: int


class QuintileBucket(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str  # 'Q1' .. 'Q5'
    mean_return: float
    t_stat: float
    n_periods: int


class MonotonicityResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spearman_rho: float  # rank corr of (Q-rank, mean return)
    p_value: float
    is_monotonic: bool  # |rho| > 0.7 and p < 0.05


class ForwardICEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    horizon_days: int
    ic_mean: float
    t_stat: float
    p_value: float
    n_obs: int


class ICAutocorrLag(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lag: int
    rho: float


class QuintileCumPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str  # ISO YYYY-MM-DD
    value: float  # cumulative return, e.g. 0.05 = +5%


class FactorAnalysisReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ic: ICStats  # uses default 21-day forward returns
    ic_series: dict[str, float]  # date string -> IC value
    quintiles: list[QuintileBucket]
    monotonicity: MonotonicityResult
    long_short_spread: float
    long_short_t_stat: float
    forward_ic: list[ForwardICEntry]  # one per horizon
    # NEW v0.4:
    ic_autocorrelation: list[ICAutocorrLag] = Field(default_factory=list)
    quintile_cumret: dict[str, list[QuintileCumPoint]] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_DEFAULT_IC_HORIZON = 21


def _rank_ic_single(scores: pd.Series[float], fwd: pd.Series[float]) -> float | None:
    """Spearman rank correlation between scores and forward returns for one date.

    Returns None if fewer than 5 valid pairs are available.
    """
    aligned = pd.DataFrame({"s": scores, "f": fwd}).dropna()
    if len(aligned) < 5:
        return None
    rho, _ = spearmanr(aligned["s"], aligned["f"])
    return float(rho)


def _ic_aggregate(ic_values: list[float]) -> ICStats:
    """Aggregate a list of IC values into ICStats."""
    n = len(ic_values)
    if n == 0:
        return ICStats(mean=0.0, std=0.0, ir=0.0, t_stat=0.0, p_value=1.0, n=0)
    arr = np.array(ic_values, dtype=float)
    mean = float(arr.mean())
    std = float(arr.std(ddof=1)) if n > 1 else 0.0
    if std > 0:
        ir = mean / std
        t_stat = mean / (std / math.sqrt(n))
        p_value = float(2.0 * (1.0 - norm.cdf(abs(t_stat))))
    elif n > 1 and mean != 0.0:
        # Multiple observations all identical and non-zero (e.g. perfect factor giving
        # IC=1.0 every rebalance date). Signal is perfectly consistent; treat as
        # effectively infinite t-stat / IR.
        ir = math.copysign(float("inf"), mean)
        t_stat = math.copysign(float("inf"), mean)
        p_value = 0.0
    else:
        # n == 1 or mean == 0: cannot infer IR / t-stat; return safe defaults.
        ir = 0.0
        t_stat = 0.0
        p_value = 1.0
    return ICStats(mean=mean, std=std, ir=ir, t_stat=t_stat, p_value=p_value, n=n)


def _newey_west_t_stat(series: list[float]) -> float:
    """Compute HAC (Newey-West) t-statistic for a constant regression on ``series``.

    Uses OLS with HAC covariance, lag = max(1, n // 4).
    Returns 0.0 if the series is too short or has zero variance.
    """
    arr = np.array(series, dtype=float)
    n = len(arr)
    if n < 3:
        # Fall back to simple t-stat for tiny samples.
        if n == 0:
            return 0.0
        mean = float(arr.mean())
        std = float(arr.std(ddof=1)) if n > 1 else 0.0
        return mean / (std / math.sqrt(n)) if std > 0 else 0.0

    lag = max(1, n // 4)
    x_const = add_constant(np.ones(n))  # intercept only
    model = OLS(arr, x_const)
    try:
        res = model.fit(cov_type="HAC", cov_kwds={"maxlags": lag}, use_t=False)
        return float(res.tvalues[0])
    except Exception:  # statsmodels may raise various internal errors
        # Fallback: simple t-stat when HAC fit fails.
        mean = float(arr.mean())
        std = float(arr.std(ddof=1)) if n > 1 else 0.0
        return mean / (std / math.sqrt(n)) if std > 0 else 0.0


def _build_date_indexed_df(
    adapter: DataAdapter,
    start: date,
    end: date,
    universe: str,
) -> pd.DataFrame:
    """Build a date-indexed close price DataFrame aligned to all trading days."""
    px = adapter.get_price("close", start, end, universe)
    trading_days = adapter.get_trading_days(start, end)
    if not px or not trading_days:
        return pd.DataFrame()

    # Each ticker's list is ordered by date within [start, end].
    # Different tickers may have different lengths if data is missing.
    # Use the trading_days list as the canonical row index.
    n_days = len(trading_days)
    frame: dict[str, pd.Series[float]] = {}
    for ticker, vals in px.items():
        if len(vals) == n_days:
            frame[ticker] = pd.Series(vals, index=trading_days, name=ticker)
        else:
            # Truncate or pad — only take as many rows as we have.
            k = min(len(vals), n_days)
            series = pd.Series(vals[:k], index=trading_days[:k], name=ticker, dtype=float)
            frame[ticker] = series.reindex(trading_days)
    return pd.DataFrame(frame)


def _forward_return_at_horizon(
    close_df: pd.DataFrame,
    trading_days: list[date],
    as_of: date,
    horizon: int,
) -> dict[str, float]:
    """Compute (price_{t+horizon} / price_t) - 1 per ticker at a given date."""
    if as_of not in trading_days:
        return {}
    idx_t = trading_days.index(as_of)
    idx_t_h = idx_t + horizon
    if idx_t_h >= len(trading_days):
        return {}
    date_t_h = trading_days[idx_t_h]

    if as_of not in close_df.index or date_t_h not in close_df.index:
        return {}

    row_t = close_df.loc[as_of]
    row_th = close_df.loc[date_t_h]
    out: dict[str, float] = {}
    for ticker in close_df.columns:
        p0 = row_t.get(ticker)
        p1 = row_th.get(ticker)
        if pd.notna(p0) and pd.notna(p1) and float(p0) != 0:
            out[str(ticker)] = float(p1) / float(p0) - 1.0
    return out


def _select_rebalance_dates(trading_days: list[date], step: int) -> list[date]:
    """Pick every ``step``-th trading day."""
    return [d for i, d in enumerate(trading_days) if i % step == 0]


def _assign_quintile(scores: pd.Series[float], n_quantiles: int = 5) -> pd.Series[int]:
    """Assign tickers to quantile buckets 1..n_quantiles by score.

    Returns a Series of int labels (1 = lowest, n_quantiles = highest).
    Uses pd.qcut with duplicates='drop'.
    """
    if len(scores) < n_quantiles:
        return pd.Series(dtype=int)
    try:
        labels = pd.qcut(
            scores,
            q=n_quantiles,
            labels=list(range(1, n_quantiles + 1)),
            duplicates="drop",
        )
        return labels.astype(int)
    except ValueError:
        return pd.Series(dtype=int)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze_factor(
    *,
    compute: ComputeFn,
    adapter: DataAdapter,
    start: date,
    end: date,
    universe: str = "",
    horizons: list[int] | None = None,
    n_quantiles: int = 5,
    rebalance_step: int = 5,
) -> FactorAnalysisReport:
    """Run full alphalens-style factor analysis.

    Parameters
    ----------
    compute:
        Factor compute function with signature (adapter, as_of, universe) -> dict[str, float].
    adapter:
        DataAdapter providing price and calendar data.
    start, end:
        Analysis window (inclusive).
    universe:
        Universe string passed through to adapter and compute.
    horizons:
        Forward-return horizons in trading days. Defaults to [1, 5, 21, 63, 252].
    n_quantiles:
        Number of quantile buckets. Defaults to 5 (quintiles).
    rebalance_step:
        Rebalance every N trading days (default 5 = weekly).
    """
    if horizons is None:
        horizons = [1, 5, 21, 63, 252]

    max_horizon = max(horizons)
    ic_horizon = _DEFAULT_IC_HORIZON  # 21 days for primary IC stats

    # ------------------------------------------------------------------
    # Step 1: Build price panel (date-indexed, covering extended end)
    # ------------------------------------------------------------------
    buffer = timedelta(days=max_horizon * 2 + 30)
    extended_end = end + buffer
    close_df = _build_date_indexed_df(adapter, start, extended_end, universe)
    trading_days = adapter.get_trading_days(start, extended_end)

    if close_df.empty or not trading_days:
        return _empty_report(horizons)

    # ------------------------------------------------------------------
    # Step 2: Select rebalance dates within [start, end]
    # ------------------------------------------------------------------
    in_window = [d for d in trading_days if start <= d <= end]
    if not in_window:
        return _empty_report(horizons)
    rebalance_dates = _select_rebalance_dates(in_window, rebalance_step)

    # ------------------------------------------------------------------
    # Step 3: IC at ic_horizon (21-day) and quintile decomposition
    # ------------------------------------------------------------------
    ic_series_dict: dict[str, float] = {}
    quintile_returns: dict[int, list[float]] = {q: [] for q in range(1, n_quantiles + 1)}
    ls_series: list[float] = []  # per-period Q_high - Q_low

    # Forward IC: collect IC values per horizon
    horizon_ic_values: dict[int, list[float]] = {h: [] for h in horizons}

    # Per-(date, quintile) 1-day forward returns for cumret computation.
    # quintile_daily_rets[q_idx] -> list of (date, 1d_fwd_ret) tuples
    quintile_daily_rets: dict[int, list[tuple[date, float]]] = {
        q: [] for q in range(1, n_quantiles + 1)
    }

    for as_of in rebalance_dates:
        try:
            scores_raw = compute(adapter, as_of, universe)
        except Exception:  # user compute function may raise anything
            continue
        if not scores_raw:
            continue
        scores = pd.Series(scores_raw, dtype=float)

        # ------ Primary IC (ic_horizon = 21 days) ------
        fwd_21 = _forward_return_at_horizon(close_df, trading_days, as_of, ic_horizon)
        if fwd_21:
            fwd_series_21 = pd.Series(fwd_21, dtype=float)
            ic_val = _rank_ic_single(scores, fwd_series_21)
            if ic_val is not None:
                ic_series_dict[as_of.isoformat()] = ic_val

        # ------ Quintile decomposition (at ic_horizon = 21 days) ------
        fwd_q = fwd_21  # reuse 21-day forward returns for quintile analysis
        if fwd_q:
            fwd_q_series = pd.Series(fwd_q, dtype=float)
            aligned = pd.DataFrame({"score": scores, "fwd": fwd_q_series}).dropna()
            if len(aligned) >= n_quantiles:
                buckets = _assign_quintile(aligned["score"], n_quantiles)
                if not buckets.empty:
                    for q_idx in range(1, n_quantiles + 1):
                        members = aligned.index[buckets == q_idx]
                        if len(members) > 0:
                            q_ret = float(aligned.loc[members, "fwd"].mean())
                            quintile_returns[q_idx].append(q_ret)

                    # Long-short spread for this rebalance period
                    q_high = aligned.index[buckets == n_quantiles]
                    q_low = aligned.index[buckets == 1]
                    if len(q_high) > 0 and len(q_low) > 0:
                        ls_ret = float(
                            aligned.loc[q_high, "fwd"].mean() - aligned.loc[q_low, "fwd"].mean()
                        )
                        ls_series.append(ls_ret)

                    # Per-quintile 1-day forward return for cumret series.
                    fwd_1d = _forward_return_at_horizon(close_df, trading_days, as_of, 1)
                    if fwd_1d:
                        fwd_1d_series = pd.Series(fwd_1d, dtype=float)
                        for q_idx in range(1, n_quantiles + 1):
                            members = aligned.index[buckets == q_idx]
                            if len(members) > 0:
                                q_members_1d = fwd_1d_series.reindex(members).dropna()
                                if not q_members_1d.empty:
                                    q_1d_ret = float(q_members_1d.mean())
                                    quintile_daily_rets[q_idx].append((as_of, q_1d_ret))

        # ------ Forward IC at each horizon ------
        for h in horizons:
            fwd_h = _forward_return_at_horizon(close_df, trading_days, as_of, h)
            if fwd_h:
                fwd_h_series = pd.Series(fwd_h, dtype=float)
                ic_h = _rank_ic_single(scores, fwd_h_series)
                if ic_h is not None:
                    horizon_ic_values[h].append(ic_h)

    # ------------------------------------------------------------------
    # Step 4: Aggregate IC stats
    # ------------------------------------------------------------------
    ic_stats = _ic_aggregate(list(ic_series_dict.values()))

    # ------------------------------------------------------------------
    # Step 5: Quintile bucket stats with Newey-West t-stats
    # ------------------------------------------------------------------
    quintile_buckets: list[QuintileBucket] = []
    quintile_means: list[float] = []
    for q_idx in range(1, n_quantiles + 1):
        q_rets = quintile_returns[q_idx]
        n_periods = len(q_rets)
        if n_periods == 0:
            mean_ret = 0.0
            t_stat_q = 0.0
        else:
            mean_ret = float(np.mean(q_rets))
            t_stat_q = _newey_west_t_stat(q_rets)
        quintile_buckets.append(
            QuintileBucket(
                name=f"Q{q_idx}",
                mean_return=mean_ret,
                t_stat=t_stat_q,
                n_periods=n_periods,
            )
        )
        quintile_means.append(mean_ret)

    # ------------------------------------------------------------------
    # Step 6: Monotonicity test
    # ------------------------------------------------------------------
    q_ranks = list(range(1, n_quantiles + 1))
    if len(set(quintile_means)) >= 2:
        rho, mono_pvalue = spearmanr(q_ranks, quintile_means)
        rho = float(rho)
        mono_pvalue = float(mono_pvalue)
    else:
        rho, mono_pvalue = 0.0, 1.0
    is_monotonic = abs(rho) > 0.7 and mono_pvalue < 0.05
    monotonicity = MonotonicityResult(
        spearman_rho=rho,
        p_value=mono_pvalue,
        is_monotonic=is_monotonic,
    )

    # ------------------------------------------------------------------
    # Step 7: Long-short spread and t-stat
    # ------------------------------------------------------------------
    if quintile_buckets:
        ls_spread = quintile_buckets[-1].mean_return - quintile_buckets[0].mean_return
    else:
        ls_spread = 0.0

    if ls_series:
        ls_arr = np.array(ls_series, dtype=float)
        ls_mean = float(ls_arr.mean())
        ls_std = float(ls_arr.std(ddof=1)) if len(ls_series) > 1 else 0.0
        ls_t = ls_mean / (ls_std / math.sqrt(len(ls_series))) if ls_std > 0 else 0.0
    else:
        ls_t = 0.0

    # ------------------------------------------------------------------
    # Step 8: Forward IC entries
    # ------------------------------------------------------------------
    forward_ic_entries: list[ForwardICEntry] = []
    for h in horizons:
        h_vals = horizon_ic_values[h]
        h_stats = _ic_aggregate(h_vals)
        forward_ic_entries.append(
            ForwardICEntry(
                horizon_days=h,
                ic_mean=h_stats.mean,
                t_stat=h_stats.t_stat,
                p_value=h_stats.p_value,
                n_obs=h_stats.n,
            )
        )

    # ------------------------------------------------------------------
    # Step 9: IC autocorrelation (lags 1..20)
    # ------------------------------------------------------------------
    ic_autocorrelation: list[ICAutocorrLag] = []
    ic_values_arr = np.array(list(ic_series_dict.values()), dtype=float)
    ic_values_arr = ic_values_arr[~np.isnan(ic_values_arr)]
    if len(ic_values_arr) >= 21:
        try:
            rhos = acf(ic_values_arr, nlags=20, fft=False)
            ic_autocorrelation = [
                ICAutocorrLag(
                    lag=int(i),
                    rho=float(rhos[i]) if np.isfinite(rhos[i]) else 0.0,
                )
                for i in range(1, 21)
            ]
        except Exception:
            ic_autocorrelation = []

    # ------------------------------------------------------------------
    # Step 10: Quintile cumulative return series (1-day fwd, compounded)
    # ------------------------------------------------------------------
    quintile_cumret: dict[str, list[QuintileCumPoint]] = {}
    for q_idx in range(1, n_quantiles + 1):
        records = sorted(quintile_daily_rets[q_idx], key=lambda x: x[0])
        if not records:
            continue
        cum = 1.0
        points: list[QuintileCumPoint] = []
        for d, r in records:
            cum *= 1.0 + r
            points.append(QuintileCumPoint(date=d.isoformat(), value=float(cum - 1.0)))
        if points:
            quintile_cumret[f"Q{q_idx}"] = points

    return FactorAnalysisReport(
        ic=ic_stats,
        ic_series=ic_series_dict,
        quintiles=quintile_buckets,
        monotonicity=monotonicity,
        long_short_spread=ls_spread,
        long_short_t_stat=ls_t,
        forward_ic=forward_ic_entries,
        ic_autocorrelation=ic_autocorrelation,
        quintile_cumret=quintile_cumret,
    )


def _empty_report(horizons: list[int]) -> FactorAnalysisReport:
    """Return a zeroed-out report when there is insufficient data."""
    return FactorAnalysisReport(
        ic=ICStats(mean=0.0, std=0.0, ir=0.0, t_stat=0.0, p_value=1.0, n=0),
        ic_series={},
        quintiles=[],
        monotonicity=MonotonicityResult(spearman_rho=0.0, p_value=1.0, is_monotonic=False),
        long_short_spread=0.0,
        long_short_t_stat=0.0,
        forward_ic=[
            ForwardICEntry(horizon_days=h, ic_mean=0.0, t_stat=0.0, p_value=1.0, n_obs=0)
            for h in horizons
        ],
    )
