from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from replicalpha.core.data import CSVAdapter
from replicalpha.core.models import PipelineReport
from replicalpha.core.orchestrator import run_pipeline

FIXTURE_DATA = Path(__file__).parents[1] / "cases" / "sample_market_data.csv"
DEMO_PDF = Path(__file__).parents[1] / "cases" / "demo.pdf"


def _make_mock_extractor(card_json: str) -> MagicMock:
    """Mock LLM client that satisfies the LLMClient protocol.

    paper2alpha's Extractor calls llm.complete_json(system=..., user=...) and
    returns a raw JSON string. We return card_json regardless of prompt content.
    """
    m = MagicMock()
    m.complete_json.return_value = card_json
    return m


@pytest.fixture
def demo_card_json() -> str:
    return json.dumps(
        {
            "source": "demo paper",
            "factors": [
                {
                    "name": "ma20",
                    "chinese_name": "20日均线",
                    "definition": "20-day moving average",
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


def test_pipeline_writes_all_outputs(tmp_path: Path, demo_card_json: str) -> None:
    if not DEMO_PDF.exists():
        pytest.skip("demo.pdf fixture missing")
    adapter = CSVAdapter(FIXTURE_DATA)
    report = run_pipeline(
        pdf_path=DEMO_PDF,
        out_dir=tmp_path,
        adapter=adapter,
        extractor_llm=_make_mock_extractor(demo_card_json),
        codegen_llm=None,
        backtest_start=date(2022, 3, 1),
        backtest_end=date(2022, 12, 31),
    )
    assert isinstance(report, PipelineReport)
    assert (tmp_path / "research_card.json").exists()
    assert (tmp_path / "factor_ma20.py").exists()
    assert (tmp_path / "backtest.json").exists()
    assert (tmp_path / "validator.json").exists()
    assert (tmp_path / "report.md").exists()


def test_pipeline_all_stages_complete(tmp_path: Path, demo_card_json: str) -> None:
    """All 6 pipeline stages should be present in completed_stages."""
    if not DEMO_PDF.exists():
        pytest.skip("demo.pdf fixture missing")
    adapter = CSVAdapter(FIXTURE_DATA)
    report = run_pipeline(
        pdf_path=DEMO_PDF,
        out_dir=tmp_path,
        adapter=adapter,
        extractor_llm=_make_mock_extractor(demo_card_json),
        codegen_llm=None,
        backtest_start=date(2022, 3, 1),
        backtest_end=date(2022, 12, 31),
    )
    expected_stages = {"extract", "codegen", "backtest", "validate", "score", "report"}
    assert expected_stages.issubset(set(report.completed_stages))


def test_pipeline_report_has_backtest(tmp_path: Path, demo_card_json: str) -> None:
    """BacktestResult should be populated in the returned report."""
    if not DEMO_PDF.exists():
        pytest.skip("demo.pdf fixture missing")
    adapter = CSVAdapter(FIXTURE_DATA)
    report = run_pipeline(
        pdf_path=DEMO_PDF,
        out_dir=tmp_path,
        adapter=adapter,
        extractor_llm=_make_mock_extractor(demo_card_json),
        codegen_llm=None,
        backtest_start=date(2022, 3, 1),
        backtest_end=date(2022, 12, 31),
    )
    assert report.backtest is not None
    assert report.codegen is not None
    assert report.reproducibility is not None


def test_pipeline_stub_skips_backtest(
    tmp_path: Path,
) -> None:
    """When codegen produces a stub, backtest stage should be skipped gracefully."""
    if not DEMO_PDF.exists():
        pytest.skip("demo.pdf fixture missing")

    # Provide a card with an unsupported formula + no LLM → stub
    card_json = json.dumps(
        {
            "source": "stub test",
            "factors": [
                {
                    "name": "mystery_factor",
                    "chinese_name": "神秘因子",
                    "definition": "unsupported formula",
                    "formula": "unsupported_fn(close, 5)",
                    "data_fields": ["close"],
                    "params": {"lookback": 5},
                    "universe": "全A",
                    "reported_metrics": None,
                }
            ],
        }
    )
    adapter = CSVAdapter(FIXTURE_DATA)
    report = run_pipeline(
        pdf_path=DEMO_PDF,
        out_dir=tmp_path,
        adapter=adapter,
        extractor_llm=_make_mock_extractor(card_json),
        codegen_llm=None,
        backtest_start=date(2022, 3, 1),
        backtest_end=date(2022, 12, 31),
    )
    assert isinstance(report, PipelineReport)
    # codegen is a stub
    assert report.codegen is not None
    assert report.codegen.method == "stub"
    # backtest should be skipped
    assert report.backtest is None
    assert "backtest" not in report.completed_stages


def test_pipeline_returns_run_id(tmp_path: Path, demo_card_json: str) -> None:
    """PipelineReport.run_id should be a non-empty string."""
    if not DEMO_PDF.exists():
        pytest.skip("demo.pdf fixture missing")
    adapter = CSVAdapter(FIXTURE_DATA)
    report = run_pipeline(
        pdf_path=DEMO_PDF,
        out_dir=tmp_path,
        adapter=adapter,
        extractor_llm=_make_mock_extractor(demo_card_json),
        codegen_llm=None,
        backtest_start=date(2022, 3, 1),
        backtest_end=date(2022, 12, 31),
    )
    assert report.run_id
    assert isinstance(report.run_id, str)
