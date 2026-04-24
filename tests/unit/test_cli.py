from __future__ import annotations

import json
from pathlib import Path

from click.testing import CliRunner

from replicalpha.cli.main import cli

FIX_ROOT = Path(__file__).parents[1] / "cases"


def test_version_flag() -> None:
    r = CliRunner()
    result = r.invoke(cli, ["--version"])
    assert result.exit_code == 0


def test_run_with_extractor_mock(tmp_path: Path) -> None:
    mock_card = json.dumps(
        {
            "source": "demo",
            "factors": [
                {
                    "name": "ma20",
                    "chinese_name": "20日均线",
                    "definition": "d",
                    "formula": "rolling_mean(close, 20)",
                    "data_fields": ["close"],
                    "params": {"lookback": 20},
                    "universe": "全A",
                    "reported_metrics": {"ic_mean": 0.045, "backtest_period": "2022~2024"},
                }
            ],
        }
    )
    mock_path = tmp_path / "card.json"
    mock_path.write_text(mock_card, encoding="utf-8")

    runner = CliRunner()
    result = runner.invoke(
        cli,
        [
            "run",
            str(FIX_ROOT / "demo.pdf"),
            "--out",
            str(tmp_path / "out"),
            "--data",
            str(FIX_ROOT / "sample_market_data.csv"),
            "--start",
            "2022-03-01",
            "--end",
            "2022-12-31",
            "--extractor-mock",
            str(mock_path),
        ],
    )
    assert result.exit_code == 0, result.output
    assert (tmp_path / "out" / "report.md").exists()
    assert "ma20" in result.output or "reproduction" in result.output.lower()


def test_run_missing_pdf_exits_nonzero(tmp_path: Path) -> None:
    runner = CliRunner()
    result = runner.invoke(
        cli,
        [
            "run",
            str(tmp_path / "missing.pdf"),
            "--out",
            str(tmp_path / "out"),
            "--data",
            str(FIX_ROOT / "sample_market_data.csv"),
        ],
    )
    assert result.exit_code != 0


def test_run_missing_data_csv_clean_error(tmp_path: Path) -> None:
    runner = CliRunner()
    result = runner.invoke(
        cli,
        [
            "run",
            str(FIX_ROOT / "demo.pdf"),
            "--out",
            str(tmp_path / "out"),
            "--data",
            str(tmp_path / "no_data.csv"),
        ],
    )
    assert result.exit_code != 0
    assert "Traceback" not in result.output


def test_run_bad_date_format_clean_error(tmp_path: Path) -> None:
    runner = CliRunner()
    result = runner.invoke(
        cli,
        [
            "run",
            str(FIX_ROOT / "demo.pdf"),
            "--out",
            str(tmp_path / "out"),
            "--data",
            str(FIX_ROOT / "sample_market_data.csv"),
            "--start",
            "20220301",  # missing hyphens
        ],
    )
    assert result.exit_code != 0
    assert "Traceback" not in result.output


def test_codegen_llm_requires_api_key(tmp_path: Path) -> None:
    import json

    mock_card = json.dumps(
        {
            "source": "demo",
            "factors": [
                {
                    "name": "ma20",
                    "chinese_name": "20日均线",
                    "definition": "d",
                    "formula": "rolling_mean(close, 20)",
                    "data_fields": ["close"],
                    "params": {"lookback": 20},
                    "universe": "全A",
                    "reported_metrics": {"ic_mean": 0.045, "backtest_period": "2022~2024"},
                }
            ],
        }
    )
    mock_path = tmp_path / "card.json"
    mock_path.write_text(mock_card, encoding="utf-8")

    runner = CliRunner(env={"OPENAI_API_KEY": ""})
    result = runner.invoke(
        cli,
        [
            "run",
            str(FIX_ROOT / "demo.pdf"),
            "--out",
            str(tmp_path / "out"),
            "--data",
            str(FIX_ROOT / "sample_market_data.csv"),
            "--extractor-mock",
            str(mock_path),
            "--codegen-llm",
        ],
    )
    assert result.exit_code != 0
    assert "Traceback" not in result.output
