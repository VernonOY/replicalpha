"""Minimal pandas IC-based factor backtest.

For each rebalance date in [start, end]:
  1. compute factor values per ticker via user's compute()
  2. cross-sectional quintile rank; long top quintile, short bottom quintile
  3. forward return over next period from bundled DataAdapter price series

Outputs BacktestResult with IC mean/std, IC series, cumulative return,
max drawdown, annualized sharpe.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, timedelta
from typing import Any, Literal

import numpy as np
import pandas as pd

from replicalpha.core.data import DataAdapter
from replicalpha.core.models import BacktestResult

Rebalance = Literal["daily", "weekly", "monthly"]
ComputeFn = Callable[[DataAdapter, date, str], dict[str, float]]


def run_backtest(
    *,
    compute: ComputeFn,
    adapter: DataAdapter,
    start: date,
    end: date,
    rebalance: Rebalance = "weekly",
    universe: str = "",
) -> BacktestResult:
    trading_days = adapter.get_trading_days(start, end)
    if len(trading_days) < 2:
        return _empty_result(start, end)

    rebalance_dates = _select_rebalance_dates(trading_days, rebalance)
    daily_returns: list[float] = []
    ic_series: dict[str, float] = {}

    # Pre-fetch close panel for forward-return lookup
    px = adapter.get_price("close", start, end + timedelta(days=7), universe)
    close_df = pd.DataFrame({t: pd.Series(v) for t, v in px.items()})

    for i, as_of in enumerate(rebalance_dates[:-1]):
        next_date = rebalance_dates[i + 1]
        scores = compute(adapter, as_of, universe)
        if not scores:
            continue
        fwd = _forward_return(close_df, trading_days, as_of, next_date)
        aligned = pd.DataFrame({"score": pd.Series(scores), "fwd": pd.Series(fwd)}).dropna()
        if len(aligned) < 5:
            continue
        ic = _rank_ic(aligned["score"], aligned["fwd"])
        ic_series[as_of.isoformat()] = ic
        ret = _quintile_long_short(aligned["score"], aligned["fwd"])
        daily_returns.append(ret)

    if not daily_returns:
        return _empty_result(start, end)

    ic_mean = float(np.mean(list(ic_series.values())))
    ic_std = float(np.std(list(ic_series.values())))
    cum = float(np.prod([1 + r for r in daily_returns]) - 1)
    max_dd = _max_drawdown(daily_returns)
    sharpe = _annualized_sharpe(daily_returns, rebalance)

    return BacktestResult(
        ic_mean=ic_mean,
        ic_std=ic_std,
        ic_series=ic_series,
        cumulative_return=cum,
        max_drawdown=max_dd,
        annualized_sharpe=sharpe,
        start_date=start.isoformat(),
        end_date=end.isoformat(),
    )


def _select_rebalance_dates(trading_days: list[date], freq: Rebalance) -> list[date]:
    if freq == "daily":
        return trading_days
    if freq == "weekly":
        return [d for i, d in enumerate(trading_days) if i % 5 == 0]
    return [d for i, d in enumerate(trading_days) if i % 20 == 0]


def _forward_return(
    close_df: pd.DataFrame, days: list[date], t: date, t1: date
) -> dict[str, float]:
    out: dict[str, float] = {}
    if t not in days or t1 not in days:
        return out
    idx_t = days.index(t)
    idx_t1 = days.index(t1)
    for ticker in close_df.columns:
        series = close_df[ticker]
        if idx_t >= len(series) or idx_t1 >= len(series):
            continue
        p0 = series.iloc[idx_t]
        p1 = series.iloc[idx_t1]
        if pd.notna(p0) and pd.notna(p1) and p0 != 0:
            out[str(ticker)] = float(p1 / p0 - 1)
    return out


def _rank_ic(scores: pd.Series[float], fwd: pd.Series[float]) -> float:
    sr = scores.rank()
    fr = fwd.rank()
    corr = sr.corr(fr)
    return float(corr) if pd.notna(corr) else 0.0


def _quintile_long_short(scores: pd.Series[float], fwd: pd.Series[float]) -> float:
    n = len(scores)
    if n < 5:
        return 0.0
    ranked = scores.rank()
    q5 = ranked >= ranked.quantile(0.8)
    q1 = ranked <= ranked.quantile(0.2)
    long_ret = float(fwd[q5].mean()) if q5.any() else 0.0
    short_ret = float(fwd[q1].mean()) if q1.any() else 0.0
    return (long_ret - short_ret) / 2.0


def _max_drawdown(returns: list[float]) -> float:
    cum = np.cumprod([1 + r for r in returns])
    peak = np.maximum.accumulate(cum)
    dd = (peak - cum) / peak
    return float(dd.max()) if len(dd) else 0.0


def _annualized_sharpe(returns: list[float], freq: Rebalance) -> float:
    periods_per_year = {"daily": 252, "weekly": 52, "monthly": 12}[freq]
    mu = float(np.mean(returns))
    sigma = float(np.std(returns))
    if sigma == 0:
        return 0.0
    return (mu / sigma) * float(periods_per_year**0.5)


def _empty_result(start: date, end: date) -> BacktestResult:
    return BacktestResult(
        ic_mean=0.0,
        ic_std=0.0,
        ic_series={},
        cumulative_return=0.0,
        max_drawdown=0.0,
        annualized_sharpe=0.0,
        start_date=start.isoformat(),
        end_date=end.isoformat(),
    )


_ = Any  # suppress unused import
