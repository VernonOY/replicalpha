from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

FIX = Path(__file__).parents[1] / "cases"


def test_replicalpha_run_end_to_end(tmp_path: Path) -> None:
    """Invoke the CLI as a real subprocess and verify artifacts."""
    mock_card = {
        "source": "demo paper",
        "factors": [
            {
                "name": "ma20",
                "chinese_name": "20日均线",
                "definition": "d",
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
    mock_path = tmp_path / "card.json"
    mock_path.write_text(json.dumps(mock_card), encoding="utf-8")
    out_dir = tmp_path / "out"

    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "replicalpha.cli.main",
            "run",
            str(FIX / "demo.pdf"),
            "--out",
            str(out_dir),
            "--data",
            str(FIX / "sample_market_data.csv"),
            "--start",
            "2022-03-01",
            "--end",
            "2022-12-31",
            "--extractor-mock",
            str(mock_path),
        ],
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert proc.returncode == 0, proc.stderr
    assert (out_dir / "research_card.json").exists()
    assert (out_dir / "factor_ma20.py").exists()
    assert (out_dir / "backtest.json").exists()
    assert (out_dir / "validator.json").exists()
    assert (out_dir / "report.md").exists()
    assert (out_dir / "reproducibility.json").exists()
    assert (out_dir / "pipeline_report.json").exists()

    report = json.loads((out_dir / "pipeline_report.json").read_text(encoding="utf-8"))
    assert report["codegen"]["method"] == "dsl"
    assert report["reproducibility"]["final_score"] >= 0
