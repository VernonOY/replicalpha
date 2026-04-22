"""Generate deterministic 20-ticker x 500-day sample market data for offline tests.

Run: ``uv run python tests/cases/build_sample_data.py``
Produces: tests/cases/sample_market_data.csv
"""

from __future__ import annotations

import math
from pathlib import Path

import pandas as pd

OUT = Path(__file__).parent / "sample_market_data.csv"

TICKERS = [
    "600519",
    "000001",
    "000002",
    "000333",
    "000651",
    "300750",
    "600036",
    "601318",
    "600276",
    "600887",
    "600030",
    "601988",
    "601857",
    "603288",
    "000858",
    "002594",
    "300059",
    "600585",
    "601668",
    "601888",
]

SECTORS = [
    "Consumer",
    "Financials",
    "RealEstate",
    "Consumer",
    "Consumer",
    "Industrials",
    "Financials",
    "Financials",
    "Healthcare",
    "Consumer",
    "Financials",
    "Financials",
    "Energy",
    "Consumer",
    "Consumer",
    "Industrials",
    "Tech",
    "Industrials",
    "Industrials",
    "Consumer",
]


def build() -> Path:
    dates = pd.bdate_range("2022-01-03", periods=500)
    rows: list[dict[str, object]] = []
    for i, ticker in enumerate(TICKERS):
        base_price = 20.0 + i * 5.0
        base_cap = 5e10 * (1 + 0.3 * i)
        base_vol = 1e7 * (1 + 0.2 * (i % 5))
        for t, date in enumerate(dates):
            trend = 1.0 + 0.0003 * t
            drift = math.sin(t / 30.0 + i) * 0.02
            price = base_price * trend * (1 + drift)
            vol = base_vol * (1 + 0.1 * math.cos(t / 20.0 + i * 0.3))
            cap = base_cap * (price / base_price)
            rows.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "ticker": ticker,
                    "sector": SECTORS[i],
                    "close": round(price, 2),
                    "volume": int(vol),
                    "market_cap": int(cap),
                }
            )
    df = pd.DataFrame(rows)
    df.to_csv(OUT, index=False)
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path} ({path.stat().st_size / 1024:.1f} KB)")
