"""DataAdapter Protocol + CSV-backed implementation."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, Protocol, runtime_checkable

import pandas as pd


@runtime_checkable
class DataAdapter(Protocol):
    def get_price(
        self, field: str, start: date, end: date, universe: str
    ) -> dict[str, list[float]]: ...

    def get_trading_days(self, start: date, end: date) -> list[date]: ...

    def get_metadata(self) -> dict[str, dict[str, Any]]: ...


class CSVAdapter:
    """Reads a wide-format market CSV (columns: date, ticker, sector, close, volume, market_cap).

    Intended for tests / demo with bundled synthetic data. Real deployments
    should implement a DataAdapter backed by the user's data source.
    """

    def __init__(self, path: Path) -> None:
        if not path.exists():
            raise FileNotFoundError(path)
        self._df = pd.read_csv(
            path,
            parse_dates=["date"],
            dtype={"ticker": "str", "sector": "str"},
        )

    def get_price(
        self, field: str, start: date, end: date, universe: str
    ) -> dict[str, list[float]]:
        mask = (self._df["date"] >= pd.Timestamp(start)) & (self._df["date"] <= pd.Timestamp(end))
        sub = self._df.loc[mask, ["date", "ticker", field]].copy()
        wide = sub.pivot(index="date", columns="ticker", values=field).sort_index()
        out: dict[str, list[float]] = {
            ticker: [float(v) for v in wide[ticker].tolist() if pd.notna(v)]
            for ticker in wide.columns
        }
        return out

    def get_trading_days(self, start: date, end: date) -> list[date]:
        mask = (self._df["date"] >= pd.Timestamp(start)) & (self._df["date"] <= pd.Timestamp(end))
        uniq = sorted(self._df.loc[mask, "date"].dt.date.unique())
        return list(uniq)

    def get_metadata(self) -> dict[str, dict[str, Any]]:
        latest = self._df.sort_values("date").groupby("ticker").tail(1)
        out: dict[str, dict[str, Any]] = {}
        for _, row in latest.iterrows():
            ticker = str(row["ticker"])
            out[ticker] = {
                "sector": str(row["sector"]),
                "market_cap": int(row["market_cap"]),
            }
        return out
