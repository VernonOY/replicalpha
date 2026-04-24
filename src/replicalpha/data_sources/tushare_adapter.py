"""TushareAdapter — DataAdapter implementation backed by Tushare Pro.

Hits `daily` (prices/volume) and `daily_basic` (market cap) endpoints,
caches raw dataframes in-memory for the life of the adapter.

Install: `pip install replicalpha[demo]` (adds the tushare dependency).
Set TUSHARE_TOKEN env var or pass `token=` directly.
"""

from __future__ import annotations

import os
from datetime import date
from typing import Any

import pandas as pd


class TushareAdapter:
    """DataAdapter against the Tushare Pro API.

    Designed for A-share daily data:
      - `get_price("close", ...)` pulls adjusted close from `daily`
      - `get_price("volume", ...)` pulls `vol` from `daily` (in hands, x100 = shares)
      - `get_metadata` pulls latest `total_mv` from `daily_basic` + industry from `stock_basic`

    Universe handling: `universe` is a comma-separated list of ts_codes
    (e.g. "600519.SH,000001.SZ") or a special shortcut "csi300_top50".
    """

    def __init__(
        self,
        *,
        tickers: list[str],
        token: str | None = None,
    ) -> None:
        try:
            import tushare as ts
        except ImportError as exc:  # pragma: no cover - optional dep
            raise ImportError(
                "tushare not installed — install replicalpha[demo] to use TushareAdapter"
            ) from exc

        api_token = token or os.environ.get("TUSHARE_TOKEN")
        if not api_token:
            raise RuntimeError("no Tushare token — pass token= or set TUSHARE_TOKEN env var")

        self._pro = ts.pro_api(api_token)
        self._tickers = list(tickers)
        self._daily_cache: pd.DataFrame | None = None
        self._basic_cache: pd.DataFrame | None = None
        self._stock_info_cache: pd.DataFrame | None = None

    def _fetch_daily(self, start: date, end: date) -> pd.DataFrame:
        if self._daily_cache is not None:
            return self._daily_cache
        frames: list[pd.DataFrame] = []
        for tk in self._tickers:
            df = self._pro.daily(
                ts_code=tk,
                start_date=start.strftime("%Y%m%d"),
                end_date=end.strftime("%Y%m%d"),
            )
            if df is not None and not df.empty:
                frames.append(df)
        if not frames:
            raise RuntimeError("Tushare returned no daily data for the given universe/window")
        self._daily_cache = pd.concat(frames, ignore_index=True)
        self._daily_cache["trade_date"] = pd.to_datetime(self._daily_cache["trade_date"])
        return self._daily_cache

    def _fetch_basic(self, start: date, end: date) -> pd.DataFrame:
        if self._basic_cache is not None:
            return self._basic_cache
        frames: list[pd.DataFrame] = []
        for tk in self._tickers:
            df = self._pro.daily_basic(
                ts_code=tk,
                start_date=start.strftime("%Y%m%d"),
                end_date=end.strftime("%Y%m%d"),
                fields="ts_code,trade_date,total_mv,circ_mv",
            )
            if df is not None and not df.empty:
                frames.append(df)
        if not frames:
            raise RuntimeError("Tushare returned no daily_basic data for the given window")
        self._basic_cache = pd.concat(frames, ignore_index=True)
        self._basic_cache["trade_date"] = pd.to_datetime(self._basic_cache["trade_date"])
        return self._basic_cache

    def _fetch_stock_info(self) -> pd.DataFrame:
        if self._stock_info_cache is not None:
            return self._stock_info_cache
        df = self._pro.stock_basic(
            exchange="",
            list_status="L",
            fields="ts_code,name,industry,market",
        )
        self._stock_info_cache = df[df["ts_code"].isin(self._tickers)].copy()
        return self._stock_info_cache

    def get_price(
        self, field: str, start: date, end: date, universe: str
    ) -> dict[str, list[float]]:
        if field == "volume":
            col = "vol"
            df = self._fetch_daily(start, end)
        elif field in ("close", "open", "high", "low"):
            col = field
            df = self._fetch_daily(start, end)
        else:
            raise ValueError(f"unsupported field for TushareAdapter: {field}")

        mask = (df["trade_date"] >= pd.Timestamp(start)) & (df["trade_date"] <= pd.Timestamp(end))
        sub = df.loc[mask, ["trade_date", "ts_code", col]]
        wide = sub.pivot(index="trade_date", columns="ts_code", values=col).sort_index()
        return {t: [float(v) for v in wide[t].tolist() if pd.notna(v)] for t in wide.columns}

    def get_trading_days(self, start: date, end: date) -> list[date]:
        df = self._fetch_daily(start, end)
        mask = (df["trade_date"] >= pd.Timestamp(start)) & (df["trade_date"] <= pd.Timestamp(end))
        uniq = sorted(df.loc[mask, "trade_date"].dt.date.unique())
        return list(uniq)

    def get_metadata(self) -> dict[str, dict[str, Any]]:
        basic = self._basic_cache
        info = self._fetch_stock_info()
        out: dict[str, dict[str, Any]] = {}
        if basic is not None and not basic.empty:
            latest = basic.sort_values("trade_date").groupby("ts_code").tail(1)
            for _, row in latest.iterrows():
                tk = str(row["ts_code"])
                mv = row["total_mv"]
                out[tk] = {
                    "market_cap": int(float(mv) * 10_000) if pd.notna(mv) else 0,
                    "sector": "",
                }
        for _, row in info.iterrows():
            tk = str(row["ts_code"])
            out.setdefault(tk, {"market_cap": 0, "sector": ""})
            out[tk]["sector"] = str(row.get("industry") or "")
        return out

    def dump_to_csv(self, out_path: Any, start: date, end: date) -> None:
        """Dump a CSVAdapter-compatible snapshot to `out_path`.

        Writes columns: date, ticker, sector, close, volume, market_cap.
        Lets us cache a single Tushare pull and replay it offline via CSVAdapter.
        """
        daily = self._fetch_daily(start, end)
        basic = self._fetch_basic(start, end)
        info = self._fetch_stock_info()

        ind_map = dict(zip(info["ts_code"], info["industry"].fillna(""), strict=False))
        merged = daily.merge(
            basic[["ts_code", "trade_date", "total_mv"]],
            on=["ts_code", "trade_date"],
            how="left",
        )
        merged["sector"] = merged["ts_code"].map(ind_map).fillna("")
        merged["market_cap"] = (merged["total_mv"].fillna(0) * 10_000).astype("int64")
        merged["volume"] = merged["vol"].astype(float)
        cols = ["trade_date", "ts_code", "sector", "close", "volume", "market_cap"]
        out = merged.loc[:, cols].copy()
        out = out.rename(columns={"trade_date": "date", "ts_code": "ticker"})
        out["date"] = pd.to_datetime(out["date"]).dt.strftime("%Y-%m-%d")
        out = out.sort_values(["date", "ticker"]).reset_index(drop=True)
        out.to_csv(out_path, index=False)
