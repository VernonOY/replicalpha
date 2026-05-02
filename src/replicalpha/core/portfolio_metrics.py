"""Portfolio-level metrics: turnover and capacity curves.

Turnover: classic 1/2 sum |Δw_t| per rebalance date.

Capacity: a SIMPLIFIED toy model — Sharpe_net(AUM) = Sharpe_gross - slippage_drag(AUM).
We model slippage_drag as ``slippage_bp / 1e4 * sqrt(AUM_M / threshold)`` for
illustration. This is NOT a real market-impact integration; v1.0 will replace
with proper Almgren-Chriss / square-root law calibration.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict, Field


class TurnoverPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: str
    turnover: float


class TurnoverReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    series: list[TurnoverPoint] = Field(default_factory=list)
    mean: float = 0.0
    max: float = 0.0
    min: float = 0.0


class CapacityPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    aum_m: float
    sharpe: float


class CapacityCurve(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slippage_bp: int
    points: list[CapacityPoint]


class CapacityReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    curves: list[CapacityCurve] = Field(default_factory=list)


def compute_turnover(holdings_panel: pd.DataFrame) -> TurnoverReport:
    """|Δw|/2 per rebalance date.

    holdings_panel: rows = dates, columns = tickers, values = portfolio weights
    (sum to 1 or 0 for L-S). Returns turnover series. First date has turnover 0
    (no prior).
    """
    if holdings_panel is None or holdings_panel.empty:
        return TurnoverReport()
    deltas = holdings_panel.diff().abs().sum(axis=1) / 2.0
    series = [
        TurnoverPoint(
            date=str(d.date()) if hasattr(d, "date") else str(d),
            turnover=float(t),
        )
        for d, t in deltas.items()
        if pd.notna(t)
    ]
    if not series:
        return TurnoverReport()
    vals = [p.turnover for p in series]
    return TurnoverReport(
        series=series,
        mean=float(np.mean(vals)),
        max=float(np.max(vals)),
        min=float(np.min(vals)),
    )


def compute_capacity_curves(
    returns_series: pd.Series,
    *,
    slippage_bps: list[int] | None = None,
    aum_grid_m: list[float] | None = None,
    threshold_m: float = 100.0,
) -> CapacityReport:
    """Capacity curves: Sharpe vs AUM at multiple slippage assumptions.

    Toy model: Sharpe_net = Sharpe_gross - (slippage_bp/1e4) * sqrt(AUM/threshold) * 252
    This is illustrative only. Real model needs market-impact calibration.
    """
    if slippage_bps is None:
        slippage_bps = [5, 10, 20]
    if aum_grid_m is None:
        aum_grid_m = [1.0, 5.0, 10.0, 50.0, 100.0, 500.0, 1000.0]
    if returns_series is None or len(returns_series) < 2:
        return CapacityReport()
    r = pd.Series(returns_series).dropna()
    if r.std() == 0:
        return CapacityReport()
    sharpe_gross = float(r.mean() / r.std() * np.sqrt(252))
    curves = []
    for bp in slippage_bps:
        pts = []
        for aum in aum_grid_m:
            drag = (bp / 1e4) * np.sqrt(aum / threshold_m) * 252.0
            sharpe_net = sharpe_gross - drag
            pts.append(CapacityPoint(aum_m=float(aum), sharpe=float(sharpe_net)))
        curves.append(CapacityCurve(slippage_bp=int(bp), points=pts))
    return CapacityReport(curves=curves)
