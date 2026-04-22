from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from replicalpha.core.data import CSVAdapter, DataAdapter

FIXTURE = Path(__file__).parents[1] / "cases" / "sample_market_data.csv"


def test_csv_adapter_satisfies_protocol() -> None:
    adapter = CSVAdapter(FIXTURE)
    assert isinstance(adapter, DataAdapter)


def test_csv_adapter_get_price_shapes() -> None:
    adapter = CSVAdapter(FIXTURE)
    px = adapter.get_price("close", date(2022, 1, 3), date(2022, 6, 30), "全A")
    assert isinstance(px, dict)
    assert "600519" in px
    assert len(px["600519"]) > 100
    for _ticker, series in px.items():
        assert all(isinstance(v, float) for v in series)


def test_csv_adapter_get_trading_days_range() -> None:
    adapter = CSVAdapter(FIXTURE)
    days = adapter.get_trading_days(date(2022, 1, 3), date(2022, 1, 31))
    assert len(days) > 10
    assert all(d >= date(2022, 1, 3) for d in days)


def test_csv_adapter_metadata_lookup() -> None:
    adapter = CSVAdapter(FIXTURE)
    meta = adapter.get_metadata()
    assert "600519" in meta
    assert meta["600519"]["sector"] == "Consumer"
    assert meta["600519"]["market_cap"] > 0


def test_csv_adapter_volume() -> None:
    adapter = CSVAdapter(FIXTURE)
    vol = adapter.get_price("volume", date(2022, 1, 3), date(2022, 6, 30), "全A")
    assert "600519" in vol
    assert all(v > 0 for v in vol["600519"])


def test_csv_adapter_missing_file_raises(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        CSVAdapter(tmp_path / "nope.csv")
