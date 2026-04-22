"""
Minimal data access contract for generated factor code.

paper2alpha does NOT ship a real adapter. Downstream projects (replicalpha,
user backtest systems) must provide a concrete implementation that satisfies
this protocol. The generated factor code imports only names defined here.
"""

from __future__ import annotations

from datetime import date
from typing import Protocol, runtime_checkable


@runtime_checkable
class DataAdapter(Protocol):
    def get_price(
        self, field: str, start: date, end: date, universe: str
    ) -> dict[str, list[float]]:
        """Return {ticker -> aligned series} for ``field`` (close/open/volume/...)."""
        ...

    def get_trading_days(self, start: date, end: date) -> list[date]:
        """Return trading calendar in [start, end]."""
        ...
