# Reproducing the bundled demo paper

This walkthrough shows how to run replicalpha end-to-end using only the
files bundled with the repo (no external data or API needed beyond
OpenAI).

## Artifacts used

- `tests/cases/demo.pdf` — synthetic factor-research paper (from paper2alpha's
  own reportlab-generated fixture).
- `tests/cases/sample_market_data.csv` — 20 A-share-shaped tickers, 500 trading
  days of deterministic synthetic close/volume/market_cap.
- `tests/cases/card.json` (generate below) — mock ResearchCard so no LLM call
  is needed for PDF extraction.

## Step 1 · Prepare mock card

```bash
cat > /tmp/card.json <<'JSON'
{
  "source": "demo",
  "factors": [
    {
      "name": "ma20",
      "chinese_name": "20日均线",
      "definition": "20-day moving average",
      "formula": "rolling_mean(close, 20)",
      "data_fields": ["close"],
      "params": {"lookback": 20},
      "universe": "全A",
      "reported_metrics": {"ic_mean": 0.045, "backtest_period": "2022-01~2024-12"}
    }
  ]
}
JSON
```

## Step 2 · Run the pipeline

```bash
uv run replicalpha run tests/cases/demo.pdf \
    --out ./demo-out \
    --data tests/cases/sample_market_data.csv \
    --start 2022-03-01 --end 2022-12-31 \
    --extractor-mock /tmp/card.json
```

## Step 3 · Inspect outputs

```bash
ls demo-out/
cat demo-out/report.md
```

Expected: 7 files including `report.md`, `factor_ma20.py`, `backtest.json`,
and `reproducibility.json`.

The synthetic data is intentionally not derived from a real strategy, so
the reproducibility score will be low — the point of this demo is to
prove the **pipeline wiring**. Swap the CSV for your own data adapter
for real-world results.
