"""Generate the real-data demo artifacts for replicalpha.

Paper under reproduction: Zeng & Liu (2016) "The Study of the Momentum Effect
and the Reversal Effect on the Chinese Stock Market", FEBM 2016, Atlantis Press,
CC-BY-NC. Auto-downloaded if not already cached locally.
Original URL: https://www.atlantis-press.com/article/25865002.pdf

Inputs (env vars):
  PAPER_PDF         — optional override path to a different research PDF
  TUSHARE_TOKEN     — for fetching A-share daily data
  OPENAI_API_KEY    — for paper2alpha ResearchCard extraction

Outputs (committed to docs/images/real-demo/):
  terminal.svg              — rich CLI capture of the pipeline
  cumret.png                — cumulative long-short return curve
  ic_series.png             — rolling IC time series
  drawdown.png              — running drawdown
  quintile_returns.png      — per-quintile mean period return bar chart
  report.md                 — generated research report
  research_card.json        — extracted paper metadata
  factor_<name>.py          — generated factor code
  backtest.json / validator.json / reproducibility.json / pipeline_report.json

Caches (also committed, reused on re-run so we don't repull):
  docs/images/real-demo/market_data.csv   — CSVAdapter-compatible Tushare snapshot
  docs/images/real-demo/research_card.json — used by MockClient to skip re-extraction
"""

from __future__ import annotations

import json
import os
import shutil
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from rich.console import Console

from replicalpha.cli.main import _print_summary
from replicalpha.core.codegen import generate_factor_code
from replicalpha.core.data import CSVAdapter
from replicalpha.core.orchestrator import run_pipeline
from replicalpha.data_sources.tushare_adapter import TushareAdapter
from replicalpha.vendored.paper2alpha.core.extractor import Extractor
from replicalpha.vendored.paper2alpha.core.llm_client import (
    MockClient,
    OpenAIClient,
)
from replicalpha.vendored.paper2alpha.core.pdf_parser import parse_pdf

PAPER_URL = "https://www.atlantis-press.com/article/25865002.pdf"

CSI300_TOP30 = [
    "600519.SH",  # 贵州茅台
    "601318.SH",  # 中国平安
    "600036.SH",  # 招商银行
    "000858.SZ",  # 五粮液
    "600900.SH",  # 长江电力
    "300750.SZ",  # 宁德时代
    "601166.SH",  # 兴业银行
    "000333.SZ",  # 美的集团
    "600276.SH",  # 恒瑞医药
    "601899.SH",  # 紫金矿业
    "601888.SH",  # 中国中免
    "000001.SZ",  # 平安银行
    "600030.SH",  # 中信证券
    "601012.SH",  # 隆基绿能
    "002594.SZ",  # 比亚迪
    "000651.SZ",  # 格力电器
    "600887.SH",  # 伊利股份
    "601288.SH",  # 农业银行
    "601628.SH",  # 中国人寿
    "600048.SH",  # 保利发展
    "601988.SH",  # 中国银行
    "601857.SH",  # 中国石油
    "600028.SH",  # 中国石化
    "601398.SH",  # 工商银行
    "600000.SH",  # 浦发银行
    "601668.SH",  # 中国建筑
    "601939.SH",  # 建设银行
    "600585.SH",  # 海螺水泥
    "002475.SZ",  # 立讯精密
    "600031.SH",  # 三一重工
]

FETCH_START = date(2021, 1, 1)  # 1y warm-up for 240-day momentum
FETCH_END = date(2024, 12, 31)
BACKTEST_START = date(2022, 1, 4)
BACKTEST_END = date(2024, 12, 31)


def ensure_market_data(cache_path: Path) -> None:
    if cache_path.exists():
        print(f"[cache] reusing {cache_path}")
        return
    token = os.environ.get("TUSHARE_TOKEN")
    if not token:
        raise SystemExit("TUSHARE_TOKEN not set — cannot fetch market data")
    print(f"[tushare] fetching {len(CSI300_TOP30)} tickers {FETCH_START} → {FETCH_END}")
    adapter = TushareAdapter(tickers=CSI300_TOP30, token=token)
    # warm the caches so dump_to_csv has both dailies
    adapter.get_price("close", FETCH_START, FETCH_END, "")
    adapter._fetch_basic(FETCH_START, FETCH_END)
    adapter._fetch_stock_info()
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    adapter.dump_to_csv(cache_path, FETCH_START, FETCH_END)
    print(f"[tushare] wrote {cache_path}")


def ensure_research_card(pdf_path: Path, cache_path: Path) -> None:
    if cache_path.exists():
        print(f"[cache] reusing {cache_path}")
        return
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise SystemExit("OPENAI_API_KEY not set — cannot extract research card")
    print(f"[paper2alpha] extracting card from {pdf_path.name} (calls OpenAI)")
    parsed = parse_pdf(pdf_path)
    card = Extractor(llm=OpenAIClient(api_key=key)).extract(parsed)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(card.model_dump_json(indent=2), encoding="utf-8")
    print(f"[paper2alpha] wrote {cache_path}")


def compute_ls_returns(
    adapter: CSVAdapter,
    card_path: Path,
    start: date,
    end: date,
    universe: str,
) -> tuple[pd.Series, pd.Series]:
    """Recompute long-short daily returns + cumulative curve for charting."""
    card = json.loads(card_path.read_text(encoding="utf-8"))
    factor = card["factors"][0]
    cg = generate_factor_code(
        factor["formula"],
        factor_name=factor["name"],
        params=factor["params"],
        llm_client=None,
    )
    # exec the generated code to get compute()
    ns: dict[str, Any] = {}
    exec(cg.source_code, ns)
    compute = ns["compute"]

    # rebalance weekly like run_backtest
    days = adapter.get_trading_days(start, end)
    closes = adapter.get_price("close", start, end + timedelta(days=10), universe)
    all_tickers = sorted(closes.keys())
    trading_days_all = adapter.get_trading_days(start, end + timedelta(days=10))
    # Build DatetimeIndex so Timestamp lookups work against it
    idx = pd.DatetimeIndex([pd.Timestamp(d) for d in trading_days_all])
    close_frame = pd.DataFrame(
        {t: pd.Series(closes[t], index=idx[: len(closes[t])]) for t in all_tickers}
    ).sort_index()

    returns: dict[pd.Timestamp, float] = {}
    for i, d in enumerate(days):
        if i % 5 != 0:
            continue
        scores = compute(adapter, d, universe)
        if not scores:
            continue
        scores_s = pd.Series(scores).dropna()
        if len(scores_s) < 5:
            continue
        cutoff_hi = scores_s.quantile(0.8)
        cutoff_lo = scores_s.quantile(0.2)
        longs = scores_s[scores_s >= cutoff_hi].index.tolist()
        shorts = scores_s[scores_s <= cutoff_lo].index.tolist()

        d_ts = pd.Timestamp(d)
        d_idx_arr = close_frame.index.get_indexer([d_ts])
        d_idx = int(d_idx_arr[0])
        if d_idx < 0 or d_idx + 5 >= len(close_frame):
            continue
        p0 = close_frame.iloc[d_idx]
        p5 = close_frame.iloc[d_idx + 5]
        long_r = (p5[longs] / p0[longs] - 1).mean() if longs else 0.0
        short_r = (p5[shorts] / p0[shorts] - 1).mean() if shorts else 0.0
        returns[d_ts] = float((long_r - short_r) / 2.0)

    ser = pd.Series(returns).sort_index()
    cum = (1 + ser).cumprod()
    return ser, cum


def plot_cumret(cum: pd.Series, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 4), dpi=140)
    ax.plot(cum.index, cum.values, color="#1976d2", linewidth=2)
    ax.axhline(1.0, color="gray", linestyle="--", linewidth=0.8)
    up = cum.values >= 1.0
    ax.fill_between(cum.index, cum.values, 1.0, where=up, alpha=0.15, color="#388e3c")
    ax.fill_between(cum.index, cum.values, 1.0, where=~up, alpha=0.15, color="#d32f2f")
    ax.set_title("Long-short quintile cumulative return (weekly rebalance)", fontsize=12)
    ax.set_xlabel("date")
    ax.set_ylabel("cumulative return (net of 1.0)")
    ax.grid(True, alpha=0.25)
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def plot_ic_series(ic_series: dict[str, float], out_path: Path) -> None:
    ser = pd.Series(ic_series)
    ser.index = pd.to_datetime(ser.index)
    ser = ser.sort_index()
    rolling = ser.rolling(8, min_periods=1).mean()

    fig, ax = plt.subplots(figsize=(9, 4), dpi=140)
    ax.bar(ser.index, ser.values, width=5.0, color="#90caf9", label="weekly IC")
    ax.plot(rolling.index, rolling.values, color="#1976d2", linewidth=2, label="8-week MA")
    ax.axhline(0.0, color="gray", linestyle="-", linewidth=0.8)
    mean_ic = float(ser.mean())
    ax.axhline(mean_ic, color="#d32f2f", linestyle="--", linewidth=1, label=f"mean = {mean_ic:.4f}")
    ax.set_title("Rank IC time series", fontsize=12)
    ax.set_xlabel("date")
    ax.set_ylabel("IC")
    ax.legend(loc="lower left", fontsize=9)
    ax.grid(True, alpha=0.25)
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def plot_drawdown(cum: pd.Series, out_path: Path) -> None:
    peak = cum.cummax()
    dd = (cum - peak) / peak
    fig, ax = plt.subplots(figsize=(9, 3.2), dpi=140)
    ax.fill_between(dd.index, dd.values, 0, color="#d32f2f", alpha=0.55)
    ax.set_title(f"Running drawdown  (max: {dd.min():.2%})", fontsize=12)
    ax.set_xlabel("date")
    ax.set_ylabel("drawdown")
    ax.grid(True, alpha=0.25)
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def ensure_paper_pdf(default_path: Path) -> Path:
    """Download Zeng & Liu 2016 to default_path if not already cached."""
    if default_path.exists():
        print(f"[cache] reusing {default_path}")
        return default_path
    print(f"[download] fetching {PAPER_URL}")
    default_path.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(PAPER_URL, default_path)
    print(f"[download] wrote {default_path}")
    return default_path


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    demo_dir = repo / "docs" / "images" / "real-demo"
    demo_dir.mkdir(parents=True, exist_ok=True)

    # PAPER_PDF env var takes precedence; otherwise auto-download the canonical paper
    pdf_override = os.environ.get("PAPER_PDF")
    if pdf_override:
        pdf_path = Path(pdf_override).expanduser().resolve()
        if not pdf_path.exists():
            raise SystemExit(f"PAPER_PDF override path not found: {pdf_path}")
    else:
        pdf_path = ensure_paper_pdf(demo_dir / "paper.pdf")
    market_csv = demo_dir / "market_data.csv"
    card_json = demo_dir / "research_card.json"
    out_dir = demo_dir / "out"

    ensure_market_data(market_csv)
    ensure_research_card(pdf_path, card_json)

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    card_payload = card_json.read_text(encoding="utf-8")
    adapter = CSVAdapter(market_csv)

    # Pick backtest window from the PDF's reported period if present, else default
    card_obj = json.loads(card_payload)
    bt_start = BACKTEST_START
    bt_end = BACKTEST_END
    try:
        period = card_obj["factors"][0]["reported_metrics"]["backtest_period"]
        # Accept "2022-01-01~2024-12-31" or "2022-01~2024-12" etc
        if "~" in period:
            a, b = period.split("~", 1)

            def _parse(s: str, default: date) -> date:
                s = s.strip()
                for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
                    try:
                        return datetime.strptime(s, fmt).date()
                    except ValueError:
                        continue
                return default

            bt_start = _parse(a, BACKTEST_START)
            bt_end = _parse(b, BACKTEST_END)
    except Exception:
        pass
    print(f"[backtest] window: {bt_start} → {bt_end}")

    console = Console(record=True, width=112, force_terminal=True, color_system="truecolor")
    console.print("[bold cyan]$[/] uv run python scripts/generate_real_demo.py")
    env_hint = "PAPER_PDF + TUSHARE_TOKEN + OPENAI_API_KEY from env (cached on re-run)"
    console.print(f"[dim]  {env_hint}[/]")
    console.print()
    universe_tag = "universe: CSI 300 top 30"
    console.print(f"[bold]replicalpha run[/] — {pdf_path.name}  ([dim]{universe_tag}[/])")

    report = run_pipeline(
        pdf_path=pdf_path,
        out_dir=out_dir,
        adapter=adapter,
        extractor_llm=MockClient({"": card_payload}, match="contains"),
        codegen_llm=None,
        backtest_start=bt_start,
        backtest_end=bt_end,
        universe="",
    )

    _print_summary(console, report, out_dir.relative_to(repo))
    svg = demo_dir / "terminal.svg"
    console.save_svg(str(svg), title="replicalpha — real A-share demo")
    print(f"wrote {svg.relative_to(repo)}")

    # Charts
    if report.backtest is not None:
        plot_ic_series(report.backtest.ic_series, demo_dir / "ic_series.png")
        print(f"wrote {(demo_dir / 'ic_series.png').relative_to(repo)}")
        _, cum = compute_ls_returns(adapter, card_json, bt_start, bt_end, "")
        if not cum.empty:
            plot_cumret(cum, demo_dir / "cumret.png")
            print(f"wrote {(demo_dir / 'cumret.png').relative_to(repo)}")
            plot_drawdown(cum, demo_dir / "drawdown.png")
            print(f"wrote {(demo_dir / 'drawdown.png').relative_to(repo)}")

    # Copy report.md up one level for direct README linking
    shutil.copy(out_dir / "report.md", demo_dir / "report.md")
    print(f"wrote {(demo_dir / 'report.md').relative_to(repo)}")


if __name__ == "__main__":
    main()
