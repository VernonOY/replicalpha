from itertools import pairwise

import numpy as np
import pandas as pd

from replicalpha.core.portfolio_metrics import (
    compute_capacity_curves,
    compute_turnover,
)


def test_compute_turnover_basic():
    dates = pd.date_range("2024-01-01", periods=5, freq="D")
    holdings = pd.DataFrame(
        {"A": [0.5, 0.4, 0.3, 0.2, 0.1], "B": [0.5, 0.6, 0.7, 0.8, 0.9]},
        index=dates,
    )
    rep = compute_turnover(holdings)
    assert len(rep.series) == 5
    assert rep.series[0].turnover == 0.0  # no prior, NaN replaced (skipped)
    assert rep.mean > 0
    assert 0 <= rep.min <= rep.max


def test_compute_turnover_empty():
    rep = compute_turnover(pd.DataFrame())
    assert rep.series == []
    assert rep.mean == 0.0


def test_compute_capacity_curves_basic():
    dates = pd.date_range("2024-01-01", periods=252, freq="D")
    returns = pd.Series(np.random.RandomState(42).normal(0.001, 0.01, 252), index=dates)
    rep = compute_capacity_curves(returns)
    assert len(rep.curves) == 3  # 5/10/20 bp default
    for c in rep.curves:
        assert c.slippage_bp in (5, 10, 20)
        assert len(c.points) == 7  # default 7 AUM points
        # Sharpe net should be monotonically decreasing in AUM
        sharpes = [p.sharpe for p in c.points]
        for s1, s2 in pairwise(sharpes):
            assert s1 >= s2 - 1e-9


def test_compute_capacity_curves_empty():
    rep = compute_capacity_curves(pd.Series([], dtype=float))
    assert rep.curves == []


def test_compute_capacity_curves_zero_vol():
    rep = compute_capacity_curves(pd.Series([0.0, 0.0, 0.0]))
    assert rep.curves == []


def test_compute_capacity_curves_custom_grids():
    dates = pd.date_range("2024-01-01", periods=60, freq="D")
    returns = pd.Series(np.random.RandomState(7).normal(0.001, 0.01, 60), index=dates)
    rep = compute_capacity_curves(
        returns,
        slippage_bps=[3, 7],
        aum_grid_m=[10.0, 100.0, 1000.0],
        threshold_m=50.0,
    )
    assert len(rep.curves) == 2
    assert {c.slippage_bp for c in rep.curves} == {3, 7}
    for c in rep.curves:
        assert len(c.points) == 3


def test_compute_turnover_single_row():
    holdings = pd.DataFrame({"A": [0.5], "B": [0.5]}, index=pd.date_range("2024-01-01", periods=1))
    rep = compute_turnover(holdings)
    # single-row diff yields 0 (sum skips NaN), so we still get one point
    assert len(rep.series) == 1
    assert rep.series[0].turnover == 0.0
