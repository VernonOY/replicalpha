"""Run the end-to-end pipeline on the bundled demo fixture and capture artifacts.

Produces:
  docs/images/demo-terminal.svg   — styled terminal capture of the run
  docs/images/demo-report.md      — the generated research report
  docs/images/demo-out/           — full output tree (research_card.json, etc.)
"""

from __future__ import annotations

import json
import shutil
from datetime import date
from pathlib import Path

from rich.console import Console

from replicalpha.cli.main import _print_summary
from replicalpha.core.data import CSVAdapter
from replicalpha.core.orchestrator import run_pipeline
from replicalpha.vendored.paper2alpha.core.llm_client import MockClient

MOCK_CARD = json.dumps(
    {
        "source": "demo paper — 20-day moving-average factor (synthetic)",
        "factors": [
            {
                "name": "ma20",
                "chinese_name": "20日均线",
                "definition": "20-day moving average of close price",
                "formula": "rolling_mean(close, 20)",
                "data_fields": ["close"],
                "params": {"lookback": 20},
                "universe": "全A",
                "reported_metrics": {
                    "ic_mean": 0.045,
                    "backtest_period": "2022-01~2024-12",
                },
            }
        ],
    }
)


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    out_dir = repo / "docs" / "images" / "demo-out"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    adapter = CSVAdapter(repo / "tests" / "cases" / "sample_market_data.csv")

    console = Console(record=True, width=108, force_terminal=True, color_system="truecolor")
    console.print("[bold cyan]$[/] uv run replicalpha run tests/cases/demo.pdf \\")
    console.print("    --out ./demo-out \\")
    console.print("    --data tests/cases/sample_market_data.csv \\")
    console.print("    --start 2022-03-01 --end 2022-12-31 \\")
    console.print("    --extractor-mock /tmp/card.json")
    console.print()
    console.print("[bold]replicalpha run[/] — demo.pdf")

    report = run_pipeline(
        pdf_path=repo / "tests" / "cases" / "demo.pdf",
        out_dir=out_dir,
        adapter=adapter,
        extractor_llm=MockClient({"": MOCK_CARD}, match="contains"),
        codegen_llm=None,
        backtest_start=date(2022, 3, 1),
        backtest_end=date(2022, 12, 31),
    )

    _print_summary(console, report, out_dir.relative_to(repo))

    svg_path = repo / "docs" / "images" / "demo-terminal.svg"
    console.save_svg(str(svg_path), title="replicalpha run — demo.pdf")
    print(f"wrote {svg_path.relative_to(repo)}")

    report_md = repo / "docs" / "images" / "demo-report.md"
    report_md.write_text((out_dir / "report.md").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"wrote {report_md.relative_to(repo)}")


if __name__ == "__main__":
    main()
