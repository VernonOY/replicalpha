"""FF5 + UMD risk attribution for portfolio returns.

Given a portfolio return series, holdings snapshot, optional metadata, and a
pre-built factor DataFrame, this module runs:

- OLS regression against [market, smb, hml, rmw, cma, umd] with Newey-West
  HAC covariance (lag = 21)
- Annualised alpha (intercept x 252)
- Sector exposure from time-averaged holdings weights

It also provides a ``build_ff_factors_from_universe`` helper that constructs
TOY Fama-French proxies from close prices and market-cap metadata. These are
**approximations** suitable for exploration / unit tests — not production-grade
Barra/CSMAR factor data.

All results are packaged in ``RiskAttribution`` (Pydantic v2 model).
This module is pure computation: no IO, no LLM, no HTTP.
"""

from __future__ import annotations

import warnings
from datetime import date

import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict
from statsmodels.regression.linear_model import OLS
from statsmodels.tools import add_constant

from replicalpha.core.data import DataAdapter

# ---------------------------------------------------------------------------
# Pydantic result models
# ---------------------------------------------------------------------------

_FACTOR_NAMES = ["market", "smb", "hml", "rmw", "cma", "umd"]


class StyleBeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    factor: str
    beta: float
    t_stat: float
    p_value: float


class SectorExposure(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sector: str
    weight: float
    n_stocks: int


class RiskAttribution(BaseModel):
    model_config = ConfigDict(extra="forbid")

    style_betas: list[StyleBeta]
    alpha: float  # annualised (x 252)
    alpha_t_stat: float
    alpha_p_value: float
    r_squared: float
    n_obs: int
    sector_exposures: list[SectorExposure]
    benchmark: str


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _newey_west_ols(
    y: np.ndarray,
    x_mat: np.ndarray,
    *,
    lag: int = 21,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Run OLS with Newey-West HAC covariance.

    Returns
    -------
    params : shape (k,)
    tvalues : shape (k,)
    pvalues : shape (k,)
    """
    n = len(y)
    if n < len(x_mat[0]) + 2:
        k = x_mat.shape[1]
        return np.zeros(k), np.zeros(k), np.ones(k)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = OLS(y, x_mat)
        res = model.fit(cov_type="HAC", cov_kwds={"maxlags": lag}, use_t=False)

    params: np.ndarray = np.asarray(res.params, dtype=float)
    tvalues: np.ndarray = np.asarray(res.tvalues, dtype=float)
    pvalues: np.ndarray = np.asarray(res.pvalues, dtype=float)
    return params, tvalues, pvalues


def _align_index(
    portfolio_returns: "pd.Series[float]",
    ff_factors: pd.DataFrame,
) -> "tuple[pd.Series[float], pd.DataFrame]":
    """Align portfolio returns and factor DataFrame on a common DatetimeIndex."""
    port = portfolio_returns.copy()
    factors = ff_factors.copy()

    # Normalise index types to DatetimeIndex
    if not isinstance(port.index, pd.DatetimeIndex):
        port.index = pd.to_datetime(port.index)
    if not isinstance(factors.index, pd.DatetimeIndex):
        factors.index = pd.to_datetime(factors.index)

    common = port.index.intersection(factors.index)
    return port.loc[common], factors.loc[common]


def _sector_exposures_from_holdings(
    holdings: dict[date, dict[str, float]],
    metadata: "dict[str, dict[str, object]]",
) -> list[SectorExposure]:
    """Compute time-mean sector weights from holdings snapshots.

    Filters sectors with abs(mean_weight) <= 0.01.
    """
    if not holdings or not metadata:
        return []

    # Build a list of {sector: weight} per snapshot date
    date_sector_weights: list[dict[str, float]] = []
    for _dt, weights in holdings.items():
        sector_w: dict[str, float] = {}
        for ticker, w in weights.items():
            meta = metadata.get(ticker, {})
            sector = str(meta.get("sector", "Unknown"))
            sector_w[sector] = sector_w.get(sector, 0.0) + w
        date_sector_weights.append(sector_w)

    if not date_sector_weights:
        return []

    # Aggregate mean weight and count across all dates
    all_sectors: set[str] = set()
    for sw in date_sector_weights:
        all_sectors.update(sw.keys())

    results: list[SectorExposure] = []
    n_dates = len(date_sector_weights)

    for sector in sorted(all_sectors):
        total_w = sum(sw.get(sector, 0.0) for sw in date_sector_weights)
        mean_w = total_w / n_dates

        if abs(mean_w) <= 0.01:
            continue

        # Count distinct tickers in this sector across all snapshots
        tickers_in_sector: set[str] = set()
        for _dt, weights in holdings.items():
            for ticker, _w in weights.items():
                meta = metadata.get(ticker, {})
                if str(meta.get("sector", "Unknown")) == sector:
                    tickers_in_sector.add(ticker)

        results.append(
            SectorExposure(
                sector=sector,
                weight=mean_w,
                n_stocks=len(tickers_in_sector),
            )
        )

    # Sort by abs(weight) descending
    results.sort(key=lambda x: abs(x.weight), reverse=True)
    return results


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def attribute_risk(
    *,
    portfolio_returns: "pd.Series[float]",
    portfolio_holdings: dict[date, dict[str, float]],
    metadata: "dict[str, dict[str, object]]",
    ff_factors: pd.DataFrame,
    benchmark: str = "csi300",
) -> RiskAttribution:
    """Run FF5+UMD factor attribution on a portfolio return series.

    Parameters
    ----------
    portfolio_returns:
        Daily portfolio returns as a pd.Series with a date or DatetimeIndex.
    portfolio_holdings:
        Mapping of snapshot date → {ticker: weight}.  Used for sector exposure.
    metadata:
        Ticker-level metadata; must contain a ``sector`` key per ticker.
    ff_factors:
        DataFrame with columns [market, smb, hml, rmw, cma, umd] and a
        DatetimeIndex (daily frequency).  Can be built with
        ``build_ff_factors_from_universe``.
    benchmark:
        Name of the benchmark; stored verbatim in the result.

    Returns
    -------
    RiskAttribution
        Style betas with Newey-West HAC t-stats, annualised alpha,
        R², observation count, and time-averaged sector exposures.
    """
    for col in _FACTOR_NAMES:
        if col not in ff_factors.columns:
            raise ValueError(f"ff_factors missing required column: '{col}'")

    port, factors = _align_index(portfolio_returns, ff_factors[_FACTOR_NAMES])
    n_obs = len(port)

    if n_obs < 10:
        return RiskAttribution(
            style_betas=[
                StyleBeta(factor=f, beta=0.0, t_stat=0.0, p_value=1.0) for f in _FACTOR_NAMES
            ],
            alpha=0.0,
            alpha_t_stat=0.0,
            alpha_p_value=1.0,
            r_squared=0.0,
            n_obs=n_obs,
            sector_exposures=[],
            benchmark=benchmark,
        )

    y = port.to_numpy(dtype=float)
    x_raw = factors.to_numpy(dtype=float)
    x_mat = add_constant(x_raw, has_constant="add")  # prepend intercept column

    params, tvalues, pvalues = _newey_west_ols(y, x_mat, lag=21)

    # params[0] = daily alpha intercept; params[1:] = factor betas
    alpha_daily = float(params[0])
    alpha_annual = alpha_daily * 252
    alpha_t = float(tvalues[0])
    alpha_p = float(pvalues[0])

    factor_params = params[1:]
    factor_t = tvalues[1:]
    factor_p = pvalues[1:]

    style_betas = [
        StyleBeta(
            factor=name,
            beta=float(factor_params[i]),
            t_stat=float(factor_t[i]),
            p_value=float(factor_p[i]),
        )
        for i, name in enumerate(_FACTOR_NAMES)
    ]

    # R-squared from simple OLS (HAC does not change residuals)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        ols_simple = OLS(y, x_mat).fit()
    r_squared = float(ols_simple.rsquared)

    sector_exp = _sector_exposures_from_holdings(portfolio_holdings, metadata)

    return RiskAttribution(
        style_betas=style_betas,
        alpha=alpha_annual,
        alpha_t_stat=alpha_t,
        alpha_p_value=alpha_p,
        r_squared=r_squared,
        n_obs=n_obs,
        sector_exposures=sector_exp,
        benchmark=benchmark,
    )


def build_ff_factors_from_universe(
    adapter: DataAdapter,
    universe: str,
    start: date,
    end: date,
) -> pd.DataFrame:
    """Build TOY Fama-French 5-factor + momentum proxies from raw market data.

    .. warning::
        These are **approximation proxies** constructed from close prices and
        market-cap metadata.  They are suitable for exploration and unit tests
        but are NOT production-grade Barra / Wind / CSMAR factors.  Real factor
        attribution requires proper book-value data for HML, and ideally
        daily rebalanced long-short portfolios.

    Factor definitions (all proxies):
        market: equal-weighted mean daily return across all stocks.
        smb:    return of bottom-50% market-cap stocks minus top-50%
                (monthly rebalance boundary using metadata market_cap).
        hml:    return of lowest-market-cap decile minus highest-decile
                (proxy for high-book-to-market when book data unavailable).
        rmw:    return of top-30% past-60d return stocks minus bottom-30%
                (robust-profitability proxy using recent return momentum).
        cma:    return of top-30% past (252d-60d) return minus bottom-30%
                (conservative-investment proxy via medium-term reversal).
        umd:    return of top-30% past-252d return minus bottom-30%
                (classic 12-1 month momentum).

    Parameters
    ----------
    adapter:
        DataAdapter providing ``get_price("close", ...)`` and
        ``get_trading_days(...)`` and ``get_metadata()``.
    universe:
        Universe identifier passed through to adapter.get_price.
    start, end:
        Inclusive date window for the output factor DataFrame.

    Returns
    -------
    pd.DataFrame
        Columns: [market, smb, hml, rmw, cma, umd].
        DatetimeIndex (daily, sorted ascending).
        No NaN in the returned window (rows with missing data are dropped).
    """
    # ----------------------------------------------------------------
    # Step 1: Build price panel (extend lookback for momentum signals)
    # ----------------------------------------------------------------
    lookback_days = 300  # enough for 252-day momentum window
    # Calculate lookback start date (roughly 300 trading days back)
    from datetime import timedelta

    extended_start = start - timedelta(days=lookback_days * 2)

    trading_days = adapter.get_trading_days(extended_start, end)
    price_raw = adapter.get_price("close", extended_start, end, universe)

    if not price_raw or not trading_days:
        return pd.DataFrame(columns=_FACTOR_NAMES)

    # Build a clean close-price DataFrame indexed by trading days
    n_all = len(trading_days)
    frames: dict[str, "pd.Series[float]"] = {}
    for ticker, vals in price_raw.items():
        if len(vals) == n_all:
            frames[ticker] = pd.Series(vals, index=trading_days, dtype=float)
        elif len(vals) > 0:
            k = min(len(vals), n_all)
            s = pd.Series(vals[:k], index=trading_days[:k], dtype=float)
            frames[ticker] = s.reindex(trading_days)

    if not frames:
        return pd.DataFrame(columns=_FACTOR_NAMES)

    close_df = pd.DataFrame(frames)
    close_df.index = pd.to_datetime(close_df.index)

    # ----------------------------------------------------------------
    # Step 2: Daily returns
    # ----------------------------------------------------------------
    returns_df = close_df.pct_change()  # first row will be NaN

    # ----------------------------------------------------------------
    # Step 3: Metadata — market cap per ticker (latest snapshot)
    # ----------------------------------------------------------------
    metadata = adapter.get_metadata()
    tickers = list(returns_df.columns)

    market_caps: dict[str, float] = {}
    for t in tickers:
        mc = metadata.get(str(t), {}).get("market_cap", None)
        if mc is not None:
            market_caps[str(t)] = float(mc)

    # ----------------------------------------------------------------
    # Step 4: Compute factors day-by-day for dates in [start, end]
    # ----------------------------------------------------------------
    out_records: list[dict[str, float]] = []
    out_dates: list[pd.Timestamp] = []

    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    for ts in returns_df.index:
        if ts < start_ts or ts > end_ts:
            continue

        day_rets = returns_df.loc[ts].dropna()
        if len(day_rets) < 5:
            continue

        valid_tickers = list(day_rets.index)

        # -- market factor --
        market_ret = float(day_rets.mean())

        # -- smb (small minus big) --
        mcs = {t: market_caps.get(str(t), 0.0) for t in valid_tickers}
        mc_series = pd.Series(mcs)
        mc_series = mc_series[mc_series > 0]
        if len(mc_series) >= 4:
            median_mc = mc_series.median()
            small = mc_series[mc_series <= median_mc].index
            big = mc_series[mc_series > median_mc].index
            smb_ret = float(day_rets[day_rets.index.isin(small)].mean()) - float(
                day_rets[day_rets.index.isin(big)].mean()
            )
        else:
            smb_ret = 0.0

        # -- hml (proxy: lowest-mc decile minus highest-mc decile) --
        if len(mc_series) >= 10:
            low_mc_thresh = mc_series.quantile(0.1)
            high_mc_thresh = mc_series.quantile(0.9)
            low_mc = mc_series[mc_series <= low_mc_thresh].index
            high_mc = mc_series[mc_series >= high_mc_thresh].index
            hml_ret = float(day_rets[day_rets.index.isin(low_mc)].mean()) - float(
                day_rets[day_rets.index.isin(high_mc)].mean()
            )
        elif len(mc_series) >= 4:
            median_mc = mc_series.median()
            low_mc = mc_series[mc_series <= median_mc].index
            high_mc = mc_series[mc_series > median_mc].index
            hml_ret = float(day_rets[day_rets.index.isin(low_mc)].mean()) - float(
                day_rets[day_rets.index.isin(high_mc)].mean()
            )
        else:
            hml_ret = 0.0

        # -- rmw (robust minus weak: past 60d return top-30% minus bottom-30%) --
        loc_idx = int(returns_df.index.get_loc(ts))  # type: ignore[arg-type]
        if loc_idx >= 60:
            past_60 = returns_df.iloc[loc_idx - 60 : loc_idx][valid_tickers].sum()
            past_60 = past_60.dropna()
            if len(past_60) >= 6:
                q70 = past_60.quantile(0.70)
                q30 = past_60.quantile(0.30)
                rmw_top = past_60[past_60 >= q70].index
                rmw_bot = past_60[past_60 <= q30].index
                rmw_ret = float(day_rets[day_rets.index.isin(rmw_top)].mean()) - float(
                    day_rets[day_rets.index.isin(rmw_bot)].mean()
                )
            else:
                rmw_ret = 0.0
        else:
            rmw_ret = 0.0

        # -- cma (conservative minus aggressive: medium-term past return) --
        if loc_idx >= 252:
            past_med = returns_df.iloc[loc_idx - 252 : loc_idx - 60][valid_tickers].sum()
            past_med = past_med.dropna()
            if len(past_med) >= 6:
                q70 = past_med.quantile(0.70)
                q30 = past_med.quantile(0.30)
                cma_top = past_med[past_med >= q70].index
                cma_bot = past_med[past_med <= q30].index
                cma_ret = float(day_rets[day_rets.index.isin(cma_top)].mean()) - float(
                    day_rets[day_rets.index.isin(cma_bot)].mean()
                )
            else:
                cma_ret = 0.0
        else:
            cma_ret = 0.0

        # -- umd (up minus down: 12-1 month momentum) --
        if loc_idx >= 252:
            past_12m = returns_df.iloc[loc_idx - 252 : loc_idx][valid_tickers].sum()
            past_12m = past_12m.dropna()
            if len(past_12m) >= 6:
                q70 = past_12m.quantile(0.70)
                q30 = past_12m.quantile(0.30)
                umd_top = past_12m[past_12m >= q70].index
                umd_bot = past_12m[past_12m <= q30].index
                umd_ret = float(day_rets[day_rets.index.isin(umd_top)].mean()) - float(
                    day_rets[day_rets.index.isin(umd_bot)].mean()
                )
            else:
                umd_ret = 0.0
        else:
            umd_ret = 0.0

        out_records.append(
            {
                "market": market_ret,
                "smb": smb_ret,
                "hml": hml_ret,
                "rmw": rmw_ret,
                "cma": cma_ret,
                "umd": umd_ret,
            }
        )
        out_dates.append(ts)

    if not out_records:
        return pd.DataFrame(columns=_FACTOR_NAMES)

    result = pd.DataFrame(out_records, index=out_dates, columns=_FACTOR_NAMES)
    result = result.sort_index()
    result = result.dropna()
    return result
