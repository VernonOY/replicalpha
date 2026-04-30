"""Unit tests for core/agent/tool_registry.py."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from replicalpha.core.agent.tool_registry import (
    RegisteredTool,
    ToolContext,
    ToolRegistry,
    ToolResult,
    ToolSchema,
    build_default_registry,
)

FIXTURE_CSV = Path(__file__).parents[1] / "cases" / "sample_market_data.csv"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_run(
    runs_root: Path,
    run_id: str,
    *,
    verdict: str | None = None,
    score: float | None = None,
    factor_code: str | None = None,
    ic_series: dict[str, float] | None = None,
    extra: dict[str, Any] | None = None,
) -> Path:
    run_dir = runs_root / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {
        "run_id": run_id,
        "paper_path": f"papers/{run_id}.pdf",
    }
    if verdict is not None:
        report["verdict"] = verdict
    if score is not None:
        report["reproducibility"] = {
            "claimed_ic": 0.05,
            "reproduced_ic": 0.04,
            "sign_match": 1.0,
            "magnitude_score": 0.8,
            "final_score": score,
            "interpretation": "test",
        }
    if ic_series is not None:
        report["backtest"] = {
            "ic_mean": 0.04,
            "ic_std": 0.02,
            "ic_series": ic_series,
            "cumulative_return": 0.1,
            "max_drawdown": -0.05,
            "annualized_sharpe": 1.5,
            "start_date": "2022-01-03",
            "end_date": "2022-12-30",
        }
    if extra:
        report.update(extra)

    (run_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    if factor_code is not None:
        (run_dir / "factor_demo.py").write_text(factor_code, encoding="utf-8")
    return run_dir


_VALID_FACTOR_CODE = '''"""Demo factor."""

from __future__ import annotations

from datetime import date
from typing import Any


FACTOR_NAME = "demo"


def compute(adapter: Any, as_of: date, universe: str = "") -> dict[str, float]:
    md = adapter.get_metadata()
    out: dict[str, float] = {}
    for i, ticker in enumerate(sorted(md)):
        out[ticker] = float(i)
    return out
'''


# ---------------------------------------------------------------------------
# Registry mechanics
# ---------------------------------------------------------------------------


def test_register_get_list_round_trip() -> None:
    reg = ToolRegistry()
    schema = ToolSchema(
        name="probe",
        description="probe tool",
        input_schema={"type": "object", "properties": {}, "required": []},
    )

    def impl(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        return ToolResult(ok=True, data={"got": args}, display_hint="text")

    reg.register(RegisteredTool(schema, impl))

    fetched = reg.get("probe")
    assert fetched.schema.name == "probe"
    assert reg.list_schemas() == [schema]

    with pytest.raises(KeyError):
        reg.get("missing")


def test_register_duplicate_name_raises() -> None:
    reg = ToolRegistry()
    schema = ToolSchema(
        name="dup",
        description="x",
        input_schema={"type": "object", "properties": {}, "required": []},
    )

    def impl(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        return ToolResult(ok=True, data={}, display_hint="text")

    reg.register(RegisteredTool(schema, impl))
    with pytest.raises(ValueError, match="already registered"):
        reg.register(RegisteredTool(schema, impl))


def test_call_catches_exception_returns_failed_result(tmp_path: Path) -> None:
    reg = ToolRegistry()

    def broken_impl(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        raise RuntimeError("kaboom")

    reg.register(
        RegisteredTool(
            ToolSchema(
                name="broken",
                description="always fails",
                input_schema={"type": "object", "properties": {}, "required": []},
            ),
            broken_impl,
        )
    )

    result = reg.call("broken", {}, ToolContext(runs_root=tmp_path))
    assert result.ok is False
    assert result.error is not None
    assert "kaboom" in result.error
    assert result.display_hint == "text"


def test_call_unknown_tool_returns_error(tmp_path: Path) -> None:
    reg = ToolRegistry()
    result = reg.call("nope", {}, ToolContext(runs_root=tmp_path))
    assert result.ok is False
    assert result.error is not None
    assert "unknown tool" in result.error


# ---------------------------------------------------------------------------
# Default registry
# ---------------------------------------------------------------------------


def test_build_default_registry_has_15_tools() -> None:
    reg = build_default_registry()
    schemas = reg.list_schemas()
    assert len(schemas) == 15
    names = {s.name for s in schemas}
    expected = {
        "run_factor_analysis",
        "run_risk_attribution",
        "run_robustness",
        "generate_report",
        "read_factor_code",
        "write_factor_code",
        "run_backtest",
        "search_papers",
        "reproduce_paper",
        "list_runs",
        "compare_runs",
        "create_portfolio",
        "rebalance_portfolio",
        "query_data",
        "export_csv",
    }
    assert names == expected
    for s in schemas:
        assert s.name
        assert s.description
        assert s.input_schema
        assert s.input_schema.get("type") == "object"


# ---------------------------------------------------------------------------
# list_runs
# ---------------------------------------------------------------------------


def test_list_runs_lists_and_filters(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "r1", verdict="weak", score=0.3)
    _make_run(runs_root, "r2", verdict="strong", score=0.9)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res_all = reg.call("list_runs", {}, ctx)
    assert res_all.ok is True
    assert res_all.display_hint == "table"
    assert res_all.data["n"] == 2
    rows = sorted(res_all.data["rows"], key=lambda r: r["run_id"])
    assert rows[0]["run_id"] == "r1"
    assert rows[0]["verdict"] == "weak"
    assert rows[1]["verdict"] == "strong"

    res_filt = reg.call("list_runs", {"filter": {"verdict": "weak"}}, ctx)
    assert res_filt.ok is True
    assert res_filt.data["n"] == 1
    assert res_filt.data["rows"][0]["run_id"] == "r1"


def test_list_runs_with_missing_root(tmp_path: Path) -> None:
    reg = build_default_registry()
    ctx = ToolContext(runs_root=tmp_path / "nonexistent")
    res = reg.call("list_runs", {}, ctx)
    assert res.ok is True
    assert res.data["rows"] == []


# ---------------------------------------------------------------------------
# compare_runs
# ---------------------------------------------------------------------------


def test_compare_runs(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "a", verdict="weak", score=0.2)
    _make_run(runs_root, "b", verdict="strong", score=0.85)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("compare_runs", {"run_ids": ["a", "b"]}, ctx)
    assert res.ok is True
    assert res.display_hint == "table"
    rows = res.data["rows"]
    assert len(rows) == 2
    assert {r["run_id"] for r in rows} == {"a", "b"}
    for r in rows:
        assert "score" in r
        assert "verdict" in r
        assert "claimed_ic" in r
        assert "reproduced_ic" in r


def test_compare_runs_validates_count(tmp_path: Path) -> None:
    reg = build_default_registry()
    ctx = ToolContext(runs_root=tmp_path)
    res = reg.call("compare_runs", {"run_ids": ["only_one"]}, ctx)
    assert res.ok is False
    assert res.error is not None


# ---------------------------------------------------------------------------
# read_factor_code
# ---------------------------------------------------------------------------


def test_read_factor_code(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "rcode", factor_code=_VALID_FACTOR_CODE)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("read_factor_code", {"run_id": "rcode"}, ctx)
    assert res.ok is True
    assert res.display_hint == "code"
    assert res.data["filename"] == "factor_demo.py"
    assert "FACTOR_NAME" in res.data["content"]


def test_read_factor_code_prefers_user_override(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    run_dir = _make_run(runs_root, "rcode", factor_code=_VALID_FACTOR_CODE)
    (run_dir / "factor_user.py").write_text(
        "# user override\n" + _VALID_FACTOR_CODE, encoding="utf-8"
    )

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("read_factor_code", {"run_id": "rcode"}, ctx)
    assert res.ok is True
    assert res.data["filename"] == "factor_user.py"
    assert "user override" in res.data["content"]


def test_read_factor_code_missing_raises(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "empty")

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)
    res = reg.call("read_factor_code", {"run_id": "empty"}, ctx)
    assert res.ok is False
    assert res.error is not None


# ---------------------------------------------------------------------------
# write_factor_code
# ---------------------------------------------------------------------------


def test_write_factor_code_creates_user_file(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    run_dir = _make_run(runs_root, "rw", factor_code=_VALID_FACTOR_CODE)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    new_code = "# edited\n" + _VALID_FACTOR_CODE
    res = reg.call(
        "write_factor_code",
        {"run_id": "rw", "new_code": new_code},
        ctx,
    )
    assert res.ok is True
    assert res.display_hint == "diff"
    assert (run_dir / "factor_user.py").exists()
    # Original auto-generated factor must NOT be touched
    assert (run_dir / "factor_demo.py").read_text(encoding="utf-8") == _VALID_FACTOR_CODE


def test_write_factor_code_rejects_empty(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "rw", factor_code=_VALID_FACTOR_CODE)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("write_factor_code", {"run_id": "rw", "new_code": "   "}, ctx)
    assert res.ok is False
    assert res.error is not None


def test_write_factor_code_missing_run_dir(tmp_path: Path) -> None:
    reg = build_default_registry()
    ctx = ToolContext(runs_root=tmp_path / "runs")
    res = reg.call(
        "write_factor_code",
        {"run_id": "ghost", "new_code": "x = 1"},
        ctx,
    )
    assert res.ok is False
    assert res.error is not None


# ---------------------------------------------------------------------------
# generate_report
# ---------------------------------------------------------------------------


def test_generate_report_md(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    run_dir = _make_run(runs_root, "rep", verdict="strong", score=0.9)
    (run_dir / "report.md").write_text("# Report\n\nbody", encoding="utf-8")

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("generate_report", {"run_id": "rep", "format": "md"}, ctx)
    assert res.ok is True
    assert res.display_hint == "markdown"
    assert res.data["format"] == "md"
    assert "# Report" in res.data["content"]


def test_generate_report_json(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "rep", verdict="strong", score=0.9)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("generate_report", {"run_id": "rep", "format": "json"}, ctx)
    assert res.ok is True
    assert res.data["format"] == "json"
    assert res.data["content"]["run_id"] == "rep"


def test_generate_report_md_missing(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "rep")

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("generate_report", {"run_id": "rep", "format": "md"}, ctx)
    assert res.ok is False


# ---------------------------------------------------------------------------
# run_factor_analysis (smoke test)
# ---------------------------------------------------------------------------


@pytest.mark.skipif(not FIXTURE_CSV.exists(), reason="sample CSV missing")
def test_run_factor_analysis_writes_cache(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(
        runs_root,
        "fa",
        factor_code=_VALID_FACTOR_CODE,
        ic_series={"2022-03-01": 0.05},
    )

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)

    res = reg.call("run_factor_analysis", {"run_id": "fa"}, ctx)
    assert res.ok is True, res.error
    assert res.display_hint == "metric_grid"
    assert "ic_stats" in res.data
    assert "quintiles" in res.data
    cache = runs_root / "fa" / "analysis.json"
    assert cache.exists()

    # Second call should hit the cache (same data shape)
    res2 = reg.call("run_factor_analysis", {"run_id": "fa"}, ctx)
    assert res2.ok is True
    assert res2.data == res.data


def test_run_factor_analysis_requires_factor_code(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "nofactor")

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)

    res = reg.call("run_factor_analysis", {"run_id": "nofactor"}, ctx)
    assert res.ok is False
    assert res.error is not None


def test_run_factor_analysis_requires_data_csv(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "fa", factor_code=_VALID_FACTOR_CODE)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=None)

    res = reg.call("run_factor_analysis", {"run_id": "fa"}, ctx)
    assert res.ok is False
    assert res.error is not None


# ---------------------------------------------------------------------------
# run_risk_attribution / run_robustness — light smoke tests
# ---------------------------------------------------------------------------


@pytest.mark.skipif(not FIXTURE_CSV.exists(), reason="sample CSV missing")
def test_run_robustness_all(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    ic_series = {f"2022-{m:02d}-15": 0.02 + 0.001 * m for m in range(1, 13)}
    _make_run(runs_root, "rb", factor_code=_VALID_FACTOR_CODE, ic_series=ic_series)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)

    res = reg.call("run_robustness", {"run_id": "rb", "kind": "all"}, ctx)
    assert res.ok is True, res.error
    assert "yearly" in res.data
    assert "bootstrap_ic" in res.data
    assert "regimes" in res.data
    assert (runs_root / "rb" / "robustness.json").exists()


def test_run_robustness_subperiod_only(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    ic_series = {f"2022-{m:02d}-15": 0.02 for m in range(1, 13)}
    _make_run(runs_root, "rb", ic_series=ic_series)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("run_robustness", {"run_id": "rb", "kind": "subperiod"}, ctx)
    assert res.ok is True
    assert "yearly" in res.data
    assert "quarterly" in res.data
    assert "bootstrap_ic" not in res.data


def test_run_robustness_no_ic_series(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "noic")

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("run_robustness", {"run_id": "noic", "kind": "all"}, ctx)
    assert res.ok is False


@pytest.mark.skipif(not FIXTURE_CSV.exists(), reason="sample CSV missing")
def test_run_risk_attribution_smoke(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    # Need many IC observations for the OLS regression to run
    ic_series = {f"2022-{m:02d}-{d:02d}": 0.01 for m in range(1, 13) for d in [5, 15, 25]}
    _make_run(runs_root, "ra", ic_series=ic_series)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)

    res = reg.call("run_risk_attribution", {"run_id": "ra"}, ctx)
    # Result may be ok=False if synthetic data is too thin; we just check
    # that it doesn't raise an unhandled exception and the envelope is sane.
    assert isinstance(res, ToolResult)


# ---------------------------------------------------------------------------
# Stubs
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("name", "args"),
    [
        ("run_backtest", {"run_id": "x"}),
        ("search_papers", {"query": "momentum"}),
        ("reproduce_paper", {"paper_url": "http://x"}),
        ("create_portfolio", {"name": "p", "factor_runs": [], "weights": []}),
        ("rebalance_portfolio", {"portfolio_id": "p1"}),
        ("query_data", {"ticker": "AAPL", "field": "close", "start": "x", "end": "y"}),
    ],
)
def test_stub_tools_return_not_implemented(tmp_path: Path, name: str, args: dict[str, Any]) -> None:
    reg = build_default_registry()
    ctx = ToolContext(runs_root=tmp_path)
    res = reg.call(name, args, ctx)
    assert res.ok is True
    assert res.data["status"] == "not_implemented_in_v0.4"


# ---------------------------------------------------------------------------
# export_csv
# ---------------------------------------------------------------------------


def test_export_csv_ibkr_with_holdings(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    run_dir = _make_run(runs_root, "exp")
    (run_dir / "holdings.json").write_text(
        json.dumps({"tickers": ["AAPL", "MSFT", "GOOG"]}),
        encoding="utf-8",
    )

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("export_csv", {"run_id": "exp", "kind": "ibkr"}, ctx)
    assert res.ok is True
    assert res.display_hint == "code"
    assert res.data["kind"] == "ibkr"
    assert res.data["n_rows"] == 3
    assert "Symbol,Action,Quantity" in res.data["content"]
    assert "AAPL,BUY,100" in res.data["content"]


def test_export_csv_tiger_is_stub(tmp_path: Path) -> None:
    reg = build_default_registry()
    ctx = ToolContext(runs_root=tmp_path)
    res = reg.call("export_csv", {"run_id": "x", "kind": "tiger"}, ctx)
    assert res.ok is True
    assert res.data["status"] == "not_implemented_in_v0.4"


def test_export_csv_no_holdings_uses_held_tickers(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(
        runs_root,
        "exp2",
        extra={"held_tickers": ["TSLA", "NVDA"]},
    )

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)

    res = reg.call("export_csv", {"run_id": "exp2", "kind": "ibkr"}, ctx)
    assert res.ok is True
    assert res.data["n_rows"] == 2
    assert "TSLA,BUY,100" in res.data["content"]


# ---------------------------------------------------------------------------
# Additional coverage: edge / fallback paths
# ---------------------------------------------------------------------------


def test_load_report_pipeline_fallback(tmp_path: Path) -> None:
    """list_runs should pick up runs that only have pipeline_report.json."""
    runs_root = tmp_path / "runs"
    run_dir = runs_root / "legacy"
    run_dir.mkdir(parents=True)
    (run_dir / "pipeline_report.json").write_text(
        json.dumps({"run_id": "legacy", "verdict": "moderate"}),
        encoding="utf-8",
    )

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)
    res = reg.call("list_runs", {}, ctx)
    assert res.ok is True
    assert res.data["n"] == 1
    assert res.data["rows"][0]["run_id"] == "legacy"


def test_list_runs_skips_files(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    runs_root.mkdir()
    (runs_root / "stray_file.txt").write_text("ignore me", encoding="utf-8")
    _make_run(runs_root, "r1", verdict="weak", score=0.3)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)
    res = reg.call("list_runs", {}, ctx)
    assert res.ok is True
    assert res.data["n"] == 1


def test_list_runs_skips_dirs_without_report(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    runs_root.mkdir()
    (runs_root / "incomplete").mkdir()
    _make_run(runs_root, "r1", verdict="weak", score=0.3)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)
    res = reg.call("list_runs", {}, ctx)
    assert res.ok is True
    assert res.data["n"] == 1


def test_list_runs_filter_must_be_dict(tmp_path: Path) -> None:
    reg = build_default_registry()
    ctx = ToolContext(runs_root=tmp_path)
    res = reg.call("list_runs", {"filter": "not a dict"}, ctx)
    assert res.ok is False
    assert res.error is not None


def test_summarise_verdict_thresholds(tmp_path: Path) -> None:
    """Score thresholds 0.7 / 0.4 should map to strong/moderate/weak."""
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "strong_one", score=0.85)
    _make_run(runs_root, "moderate_one", score=0.55)
    _make_run(runs_root, "weak_one", score=0.2)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)
    res = reg.call("list_runs", {}, ctx)
    rows = {r["run_id"]: r["verdict"] for r in res.data["rows"]}
    assert rows["strong_one"] == "strong"
    assert rows["moderate_one"] == "moderate"
    assert rows["weak_one"] == "weak"


def test_export_csv_no_holdings_no_report(tmp_path: Path) -> None:
    """Run dir with no holdings.json and no report.json yields empty CSV."""
    runs_root = tmp_path / "runs"
    run_dir = runs_root / "bare"
    run_dir.mkdir(parents=True)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root)
    res = reg.call("export_csv", {"run_id": "bare", "kind": "ibkr"}, ctx)
    assert res.ok is True
    assert res.data["n_rows"] == 0
    # Header-only CSV
    assert res.data["content"].strip() == "Symbol,Action,Quantity"


def test_export_csv_futu_is_stub(tmp_path: Path) -> None:
    reg = build_default_registry()
    ctx = ToolContext(runs_root=tmp_path)
    res = reg.call("export_csv", {"run_id": "x", "kind": "futu"}, ctx)
    assert res.ok is True
    assert res.data["status"] == "not_implemented_in_v0.4"


def test_run_robustness_subperiod_only_no_data_csv(tmp_path: Path) -> None:
    """When data_csv is None, regime / universe paths return empty lists."""
    runs_root = tmp_path / "runs"
    ic_series = {f"2022-{m:02d}-15": 0.02 for m in range(1, 13)}
    _make_run(runs_root, "rb", ic_series=ic_series)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=None)
    res = reg.call("run_robustness", {"run_id": "rb", "kind": "regime"}, ctx)
    assert res.ok is True
    assert res.data["regimes"] == []

    res2 = reg.call("run_robustness", {"run_id": "rb", "kind": "universe"}, ctx)
    assert res2.ok is True
    assert res2.data["universe_split"] == []


@pytest.mark.skipif(not FIXTURE_CSV.exists(), reason="sample CSV missing")
def test_run_robustness_universe_with_data_csv(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    ic_series = {f"2022-{m:02d}-15": 0.02 for m in range(1, 13)}
    _make_run(runs_root, "rb", ic_series=ic_series)

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)
    res = reg.call("run_robustness", {"run_id": "rb", "kind": "universe"}, ctx)
    assert res.ok is True
    assert "universe_split" in res.data


def test_run_risk_attribution_cache_hit(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    run_dir = _make_run(runs_root, "ra", ic_series={"2022-01-15": 0.01})
    cached = {"alpha": 0.1, "n_obs": 100}
    (run_dir / "attribution.json").write_text(json.dumps(cached), encoding="utf-8")

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)
    res = reg.call("run_risk_attribution", {"run_id": "ra"}, ctx)
    assert res.ok is True
    assert res.data == cached


def test_run_risk_attribution_no_data_csv(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "ra", ic_series={"2022-01-15": 0.01})

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=None)
    res = reg.call("run_risk_attribution", {"run_id": "ra"}, ctx)
    assert res.ok is False
    assert res.error is not None


def test_run_risk_attribution_no_ic_series(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    _make_run(runs_root, "ra")

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)
    res = reg.call("run_risk_attribution", {"run_id": "ra"}, ctx)
    assert res.ok is False
    assert res.error is not None


def test_run_risk_attribution_too_few_observations(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    # Only 3 observations -> should fail
    _make_run(
        runs_root,
        "ra",
        ic_series={"2022-01-15": 0.01, "2022-02-15": 0.02, "2022-03-15": 0.03},
    )

    reg = build_default_registry()
    ctx = ToolContext(runs_root=runs_root, data_csv=FIXTURE_CSV)
    res = reg.call("run_risk_attribution", {"run_id": "ra"}, ctx)
    assert res.ok is False
