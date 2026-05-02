"""Tool registry for the replicalpha agent runtime.

This module defines:

- The schema (:class:`ToolSchema`) used to expose tools to Anthropic's
  tool-use API.
- A uniform :class:`ToolResult` return value that the agent runtime can
  feed back into the model and the frontend can render via ``display_hint``.
- A :class:`ToolRegistry` that holds a name -> (schema, impl) mapping.
- A :func:`build_default_registry` that registers the v0.4 default set of
  15 tools.

Design notes
------------
- Implementations are **pure**: no network, no LLM calls. The agent
  runtime (Phase 2B) is responsible for any LLM interaction.
- Implementations either read existing run artifacts under
  ``ctx.runs_root/{run_id}/`` or write new artifacts (e.g. ``analysis.json``).
- Tools that are not yet implementable in v0.4 (paper search, broker
  rebalance, etc.) are exposed as **stubs** that return
  ``{"status": "not_implemented_in_v0.4", ...}`` with ``display_hint="text"``.
  The runtime + frontend can render these honestly while we keep schemas
  stable across the v0.4 → v0.5 transition.

JSON-schema shape
-----------------
Each tool's ``input_schema`` follows the Anthropic tool-use API: it MUST
have ``type: "object"``, a ``properties`` map, and a ``required`` list.
"""

from __future__ import annotations

import json
import traceback
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Literal, cast

from pydantic import BaseModel, ConfigDict

from replicalpha.core.data import CSVAdapter
from replicalpha.core.factor_analysis import analyze_factor
from replicalpha.core.risk_attribution import (
    attribute_risk,
    build_ff_factors_from_universe,
)
from replicalpha.core.robustness import (
    bootstrap_ic_ci,
    regime_conditional,
    subperiod_ic,
    universe_split_ic,
)

# ---------------------------------------------------------------------------
# Public schema / result models
# ---------------------------------------------------------------------------

DisplayHint = Literal[
    "table",
    "chart",
    "code",
    "text",
    "markdown",
    "metric_grid",
    "diff",
]


class ToolSchema(BaseModel):
    """Anthropic tool-use schema for one tool."""

    model_config = ConfigDict(extra="forbid")

    name: str
    description: str
    input_schema: dict[str, Any]


class ToolResult(BaseModel):
    """Uniform structured return value from any tool implementation."""

    model_config = ConfigDict(extra="forbid")

    ok: bool
    data: dict[str, Any]
    display_hint: DisplayHint
    error: str | None = None


class ToolContext(BaseModel):
    """Runtime-supplied paths + per-conversation state passed to every tool."""

    model_config = ConfigDict(extra="forbid", arbitrary_types_allowed=True)

    runs_root: Path
    current_run_id: str | None = None
    data_csv: Path | None = None


ToolImpl = Callable[[dict[str, Any], ToolContext], ToolResult]


@dataclass
class RegisteredTool:
    """Internal pairing of schema + implementation."""

    schema: ToolSchema
    impl: ToolImpl


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


class ToolRegistry:
    """In-process registry mapping tool name → (schema, impl).

    The agent runtime uses :meth:`list_schemas` to advertise tools to the
    model and :meth:`call` to dispatch a tool_use block. ``call`` catches
    any exception raised by the implementation and packages it into a
    failed :class:`ToolResult` so the runtime can hand it back to the
    model as a ``tool_result`` content block.
    """

    def __init__(self) -> None:
        self._tools: dict[str, RegisteredTool] = {}

    def register(self, tool: RegisteredTool) -> None:
        if tool.schema.name in self._tools:
            raise ValueError(f"tool already registered: {tool.schema.name}")
        self._tools[tool.schema.name] = tool

    def get(self, name: str) -> RegisteredTool:
        if name not in self._tools:
            raise KeyError(name)
        return self._tools[name]

    def list_schemas(self) -> list[ToolSchema]:
        return [t.schema for t in self._tools.values()]

    def call(
        self,
        name: str,
        args: dict[str, Any],
        ctx: ToolContext,
    ) -> ToolResult:
        if name not in self._tools:
            return ToolResult(
                ok=False,
                data={},
                display_hint="text",
                error=f"unknown tool: {name}",
            )
        try:
            return self._tools[name].impl(args, ctx)
        except Exception as exc:
            return ToolResult(
                ok=False,
                data={},
                display_hint="text",
                error=f"{type(exc).__name__}: {exc}\n{traceback.format_exc(limit=3)}",
            )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _run_dir(ctx: ToolContext, run_id: str) -> Path:
    return ctx.runs_root / run_id


def _read_json(path: Path) -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(path.read_text(encoding="utf-8")))


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )


def _load_report(run_dir: Path) -> dict[str, Any]:
    """Load a run's primary report JSON.

    Looks for ``report.json`` first (preferred surface), falling back to
    ``pipeline_report.json`` (current orchestrator output) for backward
    compatibility.
    """
    for fname in ("report.json", "pipeline_report.json"):
        p = run_dir / fname
        if p.exists():
            return _read_json(p)
    raise FileNotFoundError(f"no report.json or pipeline_report.json found under {run_dir}")


def _load_compute_from_file(code_path: Path, factor_name: str) -> Any:
    """Dynamically import a factor module and return its ``compute`` function."""
    import importlib.util

    module_name = f"_replicalpha_agent_factor_{factor_name}_{abs(hash(str(code_path)))}"
    spec = importlib.util.spec_from_file_location(module_name, code_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load factor module at {code_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.compute


def _load_panel(base_path: Path) -> Any:
    """Load a panel DataFrame written by the orchestrator.

    Tries parquet first, then pickle. Returns an empty DataFrame if neither
    exists (backward-compat for v0.3 runs without persisted panels).
    """
    import pandas as pd

    parquet = base_path.with_suffix(".parquet")
    pkl = base_path.with_suffix(".pkl")
    if parquet.exists():
        try:
            return pd.read_parquet(parquet)
        except (ImportError, ValueError):
            pass
    if pkl.exists():
        return pd.read_pickle(pkl)
    return pd.DataFrame()


def _stub_result(extra: dict[str, Any] | None = None) -> ToolResult:
    """Build a v0.5 'not implemented' stub result."""
    payload: dict[str, Any] = {"status": "not_implemented_in_v0.4"}
    if extra:
        payload.update(extra)
    return ToolResult(ok=True, data=payload, display_hint="text")


# ---------------------------------------------------------------------------
# Tool 1 — run_factor_analysis
# ---------------------------------------------------------------------------


_RUN_FACTOR_ANALYSIS_SCHEMA = ToolSchema(
    name="run_factor_analysis",
    description=(
        "Run alphalens-style factor analysis on a finished run. Computes IC "
        "stats, quintile decomposition, monotonicity test, long-short spread, "
        "and forward IC at multiple horizons. Caches the result to "
        "analysis.json under the run dir."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
        },
        "required": ["run_id"],
    },
)


def _impl_run_factor_analysis(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    run_id = str(args["run_id"])
    run_dir = _run_dir(ctx, run_id)
    cache = run_dir / "analysis.json"
    if cache.exists():
        return ToolResult(
            ok=True,
            data=_read_json(cache),
            display_hint="metric_grid",
        )

    if ctx.data_csv is None or not ctx.data_csv.exists():
        raise RuntimeError("ToolContext.data_csv must be set to a valid CSV path")

    # Find the factor module — prefer factor_user.py if present, else first factor_*.py
    factor_files = sorted(run_dir.glob("factor_*.py"))
    if not factor_files:
        raise FileNotFoundError(f"no factor_*.py found in {run_dir}")
    user_override = run_dir / "factor_user.py"
    factor_path = user_override if user_override.exists() else factor_files[0]
    factor_name = factor_path.stem.replace("factor_", "")

    compute_fn = _load_compute_from_file(factor_path, factor_name)
    adapter = CSVAdapter(ctx.data_csv)

    # Determine analysis window from existing report if possible
    start_d: date
    end_d: date
    try:
        report = _load_report(run_dir)
        bt = report.get("backtest") or {}
        if bt.get("start_date") and bt.get("end_date"):
            start_d = date.fromisoformat(str(bt["start_date"]))
            end_d = date.fromisoformat(str(bt["end_date"]))
        else:
            raise KeyError
    except (FileNotFoundError, KeyError):
        days = adapter.get_trading_days(date(1900, 1, 1), date(2999, 12, 31))
        if not days:
            raise RuntimeError("no trading days in data CSV") from None
        start_d, end_d = days[0], days[-1]

    result = analyze_factor(
        compute=compute_fn,
        adapter=adapter,
        start=start_d,
        end=end_d,
    )
    payload = result.model_dump()
    payload_serializable = json.loads(json.dumps(payload, default=str))
    # Top-level shape we expose: keep a copy keyed under 'ic_stats' for clarity
    out: dict[str, Any] = {
        "ic_stats": payload_serializable["ic"],
        "quintiles": payload_serializable["quintiles"],
        "monotonicity": payload_serializable["monotonicity"],
        "long_short_spread": payload_serializable["long_short_spread"],
        "long_short_t_stat": payload_serializable["long_short_t_stat"],
        "forward_ic": payload_serializable["forward_ic"],
        "ic_series": payload_serializable["ic_series"],
        # v0.4 Stage 3a additions:
        "ic_autocorrelation": payload_serializable.get("ic_autocorrelation", []),
        "quintile_cumret": payload_serializable.get("quintile_cumret", {}),
    }
    _write_json(cache, out)
    return ToolResult(ok=True, data=out, display_hint="metric_grid")


# ---------------------------------------------------------------------------
# Tool 2 — run_risk_attribution
# ---------------------------------------------------------------------------


_RUN_RISK_ATTRIBUTION_SCHEMA = ToolSchema(
    name="run_risk_attribution",
    description=(
        "Run FF5+UMD risk attribution on a finished run. Builds toy "
        "Fama-French proxies from the universe and regresses portfolio "
        "returns on them with Newey-West HAC covariance. Writes "
        "attribution.json."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
        },
        "required": ["run_id"],
    },
)


def _impl_run_risk_attribution(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    import pandas as pd

    run_id = str(args["run_id"])
    run_dir = _run_dir(ctx, run_id)
    cache = run_dir / "attribution.json"
    if cache.exists():
        return ToolResult(ok=True, data=_read_json(cache), display_hint="chart")

    if ctx.data_csv is None or not ctx.data_csv.exists():
        raise RuntimeError("ToolContext.data_csv must be set to a valid CSV path")

    report = _load_report(run_dir)
    bt = report.get("backtest") or {}
    ic_series_raw = bt.get("ic_series") or {}
    if not ic_series_raw:
        raise RuntimeError("backtest.ic_series is empty; cannot run attribution")

    # Use the IC series as a proxy daily portfolio return series
    # (this is a simplification for v0.4 — a real implementation would
    # have a stored portfolio_returns.json artifact).
    port_returns = pd.Series(
        {pd.Timestamp(k): float(v) for k, v in ic_series_raw.items()},
        dtype=float,
    ).sort_index()

    if len(port_returns) < 10:
        raise RuntimeError(f"too few return observations ({len(port_returns)}) for attribution")

    adapter = CSVAdapter(ctx.data_csv)
    start_d = port_returns.index.min().date()
    end_d = port_returns.index.max().date()
    ff = build_ff_factors_from_universe(adapter, "", start_d, end_d)
    if ff.empty:
        raise RuntimeError("ff_factors are empty; insufficient universe data")

    result = attribute_risk(
        portfolio_returns=port_returns,
        portfolio_holdings={},
        metadata=adapter.get_metadata(),
        ff_factors=ff,
    )
    out = json.loads(json.dumps(result.model_dump(), default=str))

    # v0.4 Stage 3d: enrich with portfolio-level metrics. Use the IC series as
    # a proxy portfolio_returns (consistent with the existing simplification
    # documented above). For turnover, we don't have a real holdings panel, so
    # this is omitted — `turnover` will be empty and the frontend will show
    # NoData with a sensible label. Capacity uses the proxy returns directly.
    from replicalpha.core.portfolio_metrics import (
        compute_capacity_curves,
        compute_turnover,
    )

    capacity_rep = compute_capacity_curves(port_returns)
    out["capacity"] = json.loads(json.dumps(capacity_rep.model_dump(), default=str))
    # Turnover requires a holdings panel; with v0.4 we don't persist one, so
    # report an empty TurnoverReport (frontend renders NoData gracefully).
    out["turnover"] = json.loads(
        json.dumps(compute_turnover(pd.DataFrame()).model_dump(), default=str)
    )
    _write_json(cache, out)
    return ToolResult(ok=True, data=out, display_hint="chart")


# ---------------------------------------------------------------------------
# Tool 3 — run_robustness
# ---------------------------------------------------------------------------


_RUN_ROBUSTNESS_SCHEMA = ToolSchema(
    name="run_robustness",
    description=(
        "Run robustness diagnostics on a finished run. Pick `kind`: 'all' "
        "for the full suite, or 'subperiod' / 'regime' / 'bootstrap' / "
        "'universe' for a single check. Writes robustness.json."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
            "kind": {
                "type": "string",
                "enum": ["all", "subperiod", "regime", "bootstrap", "universe"],
            },
        },
        "required": ["run_id", "kind"],
    },
)


def _impl_run_robustness(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    import pandas as pd

    run_id = str(args["run_id"])
    kind = str(args["kind"])
    run_dir = _run_dir(ctx, run_id)

    report = _load_report(run_dir)
    bt = report.get("backtest") or {}
    ic_series_raw = bt.get("ic_series") or {}
    if not ic_series_raw:
        raise RuntimeError("backtest.ic_series is empty; cannot run robustness")
    ic_series = {str(k): float(v) for k, v in ic_series_raw.items()}

    out: dict[str, Any] = {}

    if kind in ("all", "subperiod"):
        out["yearly"] = [s.model_dump() for s in subperiod_ic(ic_series, freq="Y")]
        out["quarterly"] = [s.model_dump() for s in subperiod_ic(ic_series, freq="Q")]

    if kind in ("all", "bootstrap"):
        out["bootstrap_ic"] = bootstrap_ic_ci(ic_series).model_dump()

    if kind in ("all", "regime"):
        # Build a synthetic market return series from IC dates if no real one
        # exists. This is a stand-in until a separate market-return artifact
        # is wired up.
        if ctx.data_csv is not None and ctx.data_csv.exists():
            adapter = CSVAdapter(ctx.data_csv)
            dates_sorted = sorted(date.fromisoformat(d) for d in ic_series)
            mkt_start, mkt_end = dates_sorted[0], dates_sorted[-1]
            px = adapter.get_price("close", mkt_start, mkt_end, "")
            mkt_days = adapter.get_trading_days(mkt_start, mkt_end)
            if px and mkt_days:
                # Equal-weighted market index
                df = pd.DataFrame(
                    {
                        t: pd.Series(v[: len(mkt_days)], index=mkt_days[: len(v)])
                        for t, v in px.items()
                    }
                )
                df.index = pd.to_datetime(df.index)
                rets = df.pct_change().mean(axis=1).dropna()
                out["regimes"] = [r.model_dump() for r in regime_conditional(ic_series, rets)]
            else:
                out["regimes"] = []
        else:
            out["regimes"] = []

    if kind in ("all", "universe"):
        # universe_split needs scores + returns panels persisted by the
        # orchestrator (parquet preferred, pickle fallback). v0.3 runs that
        # don't have these files yield an empty list (backward-compat).
        scores_panel = _load_panel(run_dir / "scores_panel")
        returns_panel = _load_panel(run_dir / "returns_panel")
        if (
            ctx.data_csv is not None
            and ctx.data_csv.exists()
            and not scores_panel.empty
            and not returns_panel.empty
        ):
            adapter = CSVAdapter(ctx.data_csv)
            metadata = adapter.get_metadata()
            out["universe_split"] = [
                u.model_dump() for u in universe_split_ic(scores_panel, returns_panel, metadata)
            ]
        else:
            out["universe_split"] = []

    cache = run_dir / "robustness.json"
    _write_json(cache, out)
    return ToolResult(ok=True, data=out, display_hint="chart")


# ---------------------------------------------------------------------------
# Tool 4 — generate_report
# ---------------------------------------------------------------------------


_GENERATE_REPORT_SCHEMA = ToolSchema(
    name="generate_report",
    description=(
        "Read the existing rendered report for a run. Pick `format`: 'md' "
        "for the human-readable markdown, 'json' for the structured "
        "PipelineReport JSON."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
            "format": {"type": "string", "enum": ["md", "json"]},
        },
        "required": ["run_id", "format"],
    },
)


def _impl_generate_report(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    run_id = str(args["run_id"])
    fmt = str(args["format"])
    run_dir = _run_dir(ctx, run_id)
    if fmt == "md":
        path = run_dir / "report.md"
        if not path.exists():
            raise FileNotFoundError(f"report.md not found in {run_dir}")
        return ToolResult(
            ok=True,
            data={"format": "md", "content": path.read_text(encoding="utf-8")},
            display_hint="markdown",
        )
    # json
    return ToolResult(
        ok=True,
        data={"format": "json", "content": _load_report(run_dir)},
        display_hint="markdown",
    )


# ---------------------------------------------------------------------------
# Tool 5 — read_factor_code
# ---------------------------------------------------------------------------


_READ_FACTOR_CODE_SCHEMA = ToolSchema(
    name="read_factor_code",
    description=(
        "Read the generated factor Python code for a run. Returns "
        "factor_user.py if a user override exists, otherwise the first "
        "factor_*.py file."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
        },
        "required": ["run_id"],
    },
)


def _impl_read_factor_code(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    run_id = str(args["run_id"])
    run_dir = _run_dir(ctx, run_id)
    user_override = run_dir / "factor_user.py"
    if user_override.exists():
        path = user_override
    else:
        candidates = sorted(run_dir.glob("factor_*.py"))
        if not candidates:
            raise FileNotFoundError(f"no factor_*.py found in {run_dir}")
        path = candidates[0]
    return ToolResult(
        ok=True,
        data={
            "filename": path.name,
            "content": path.read_text(encoding="utf-8"),
            "language": "python",
        },
        display_hint="code",
    )


# ---------------------------------------------------------------------------
# Tool 6 — write_factor_code
# ---------------------------------------------------------------------------


_WRITE_FACTOR_CODE_SCHEMA = ToolSchema(
    name="write_factor_code",
    description=(
        "Write a user-edited factor implementation. ALWAYS writes to "
        "factor_user.py (never overwrites the auto-generated file). Returns "
        "a diff summary. Does NOT trigger a re-run — that is the agent "
        "runtime's job."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
            "new_code": {"type": "string"},
        },
        "required": ["run_id", "new_code"],
    },
)


def _impl_write_factor_code(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    run_id = str(args["run_id"])
    new_code = str(args["new_code"])
    if not new_code.strip():
        raise ValueError("new_code must be non-empty")

    run_dir = _run_dir(ctx, run_id)
    if not run_dir.exists():
        raise FileNotFoundError(f"run dir does not exist: {run_dir}")

    target = run_dir / "factor_user.py"
    old_code = target.read_text(encoding="utf-8") if target.exists() else ""
    target.write_text(new_code, encoding="utf-8")

    old_lines = old_code.splitlines()
    new_lines = new_code.splitlines()
    return ToolResult(
        ok=True,
        data={
            "filename": "factor_user.py",
            "old_lines": len(old_lines),
            "new_lines": len(new_lines),
            "added": max(0, len(new_lines) - len(old_lines)),
            "removed": max(0, len(old_lines) - len(new_lines)),
            "previously_existed": old_code != "",
        },
        display_hint="diff",
    )


# ---------------------------------------------------------------------------
# Tool 7 — run_backtest (stub)
# ---------------------------------------------------------------------------


_RUN_BACKTEST_SCHEMA = ToolSchema(
    name="run_backtest",
    description=(
        "Re-run the backtest for a given run. NOT IMPLEMENTED in v0.4 — "
        "use the replicalpha CLI to re-run pipelines for now. Will be "
        "wired up in v0.5."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
        },
        "required": ["run_id"],
    },
)


def _impl_run_backtest(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    return _stub_result({"hint": "use replicalpha CLI to re-run"})


# ---------------------------------------------------------------------------
# Tool 8 — search_papers (stub)
# ---------------------------------------------------------------------------


_SEARCH_PAPERS_SCHEMA = ToolSchema(
    name="search_papers",
    description=(
        "Search academic paper sources (arxiv, ssrn, etc) for relevant "
        "research. NOT IMPLEMENTED in v0.4 — paper-discovery sources will "
        "be wired up in v0.5."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "sources": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["query"],
    },
)


def _impl_search_papers(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    return _stub_result()


# ---------------------------------------------------------------------------
# Tool 9 — reproduce_paper (stub)
# ---------------------------------------------------------------------------


_REPRODUCE_PAPER_SCHEMA = ToolSchema(
    name="reproduce_paper",
    description=(
        "Run the end-to-end PDF→factor→backtest pipeline on a paper URL. "
        "NOT IMPLEMENTED in v0.4 — invoke the replicalpha CLI directly for "
        "now. The runtime hookup will land in v0.5."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "paper_url": {"type": "string"},
        },
        "required": ["paper_url"],
    },
)


def _impl_reproduce_paper(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    return _stub_result()


# ---------------------------------------------------------------------------
# Tool 10 — list_runs
# ---------------------------------------------------------------------------


_LIST_RUNS_SCHEMA = ToolSchema(
    name="list_runs",
    description=(
        "List all runs under runs_root. Reads each run's report.json (or "
        "pipeline_report.json) and returns a summary row per run. Optional "
        "`filter` is a dict of {field: value} to narrow the result."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "filter": {"type": "object"},
        },
        "required": [],
    },
)


def _summarise_report(run_dir: Path, report: dict[str, Any]) -> dict[str, Any]:
    """Extract a flat summary row from a report dict."""
    repro = report.get("reproducibility") or {}
    bt = report.get("backtest") or {}
    score = repro.get("final_score")
    verdict = report.get("verdict")
    if verdict is None and score is not None:
        if score >= 0.7:
            verdict = "strong"
        elif score >= 0.4:
            verdict = "moderate"
        else:
            verdict = "weak"
    return {
        "run_id": str(report.get("run_id") or run_dir.name),
        "verdict": verdict,
        "score": float(score) if score is not None else None,
        "claimed_ic": repro.get("claimed_ic"),
        "reproduced_ic": repro.get("reproduced_ic"),
        "ic_mean": bt.get("ic_mean"),
        "paper_path": report.get("paper_path"),
    }


def _impl_list_runs(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    filt_raw = args.get("filter") or {}
    if not isinstance(filt_raw, dict):
        raise ValueError("filter must be an object")
    filt: dict[str, Any] = filt_raw

    rows: list[dict[str, Any]] = []
    if not ctx.runs_root.exists():
        return ToolResult(ok=True, data={"rows": [], "n": 0}, display_hint="table")

    for child in sorted(ctx.runs_root.iterdir()):
        if not child.is_dir():
            continue
        try:
            report = _load_report(child)
        except FileNotFoundError:
            continue
        row = _summarise_report(child, report)
        if all(row.get(k) == v for k, v in filt.items()):
            rows.append(row)
    return ToolResult(
        ok=True,
        data={"rows": rows, "n": len(rows)},
        display_hint="table",
    )


# ---------------------------------------------------------------------------
# Tool 11 — compare_runs
# ---------------------------------------------------------------------------


_COMPARE_RUNS_SCHEMA = ToolSchema(
    name="compare_runs",
    description=(
        "Side-by-side comparison of 2-5 runs. Reads each run's report.json "
        "and returns claimed IC / reproduced IC / score / verdict per run."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_ids": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 2,
                "maxItems": 5,
            },
        },
        "required": ["run_ids"],
    },
)


def _impl_compare_runs(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    run_ids = args["run_ids"]
    if not isinstance(run_ids, list) or not (2 <= len(run_ids) <= 5):
        raise ValueError("run_ids must be a list of 2-5 strings")
    rows: list[dict[str, Any]] = []
    for rid in run_ids:
        run_dir = _run_dir(ctx, str(rid))
        report = _load_report(run_dir)
        rows.append(_summarise_report(run_dir, report))
    return ToolResult(
        ok=True,
        data={"rows": rows, "n": len(rows)},
        display_hint="table",
    )


# ---------------------------------------------------------------------------
# Tool 12 — create_portfolio (stub)
# ---------------------------------------------------------------------------


_CREATE_PORTFOLIO_SCHEMA = ToolSchema(
    name="create_portfolio",
    description=(
        "Create a multi-factor portfolio from one or more factor runs with "
        "explicit weights. NOT IMPLEMENTED in v0.4 — portfolio storage "
        "(SQLite) lands in Phase 3."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "factor_runs": {
                "type": "array",
                "items": {"type": "string"},
            },
            "weights": {
                "type": "array",
                "items": {"type": "number"},
            },
        },
        "required": ["name", "factor_runs", "weights"],
    },
)


def _impl_create_portfolio(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    return _stub_result()


# ---------------------------------------------------------------------------
# Tool 13 — rebalance_portfolio (stub)
# ---------------------------------------------------------------------------


_REBALANCE_PORTFOLIO_SCHEMA = ToolSchema(
    name="rebalance_portfolio",
    description=(
        "Rebalance a saved portfolio at the latest available date. NOT "
        "IMPLEMENTED in v0.4 — portfolio runtime lands in Phase 3."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "portfolio_id": {"type": "string"},
        },
        "required": ["portfolio_id"],
    },
)


def _impl_rebalance_portfolio(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    return _stub_result()


# ---------------------------------------------------------------------------
# Tool 14 — query_data (stub)
# ---------------------------------------------------------------------------


_QUERY_DATA_SCHEMA = ToolSchema(
    name="query_data",
    description=(
        "Query market data for a ticker / field / date range. NOT "
        "IMPLEMENTED in v0.4 — DataAdapter wiring lands in Phase 3."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "ticker": {"type": "string"},
            "field": {"type": "string"},
            "start": {"type": "string"},
            "end": {"type": "string"},
        },
        "required": ["ticker", "field", "start", "end"],
    },
)


def _impl_query_data(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    return _stub_result({"hint": "wire DataAdapter in Phase 3"})


# ---------------------------------------------------------------------------
# Tool 15 — export_csv
# ---------------------------------------------------------------------------


_EXPORT_CSV_SCHEMA = ToolSchema(
    name="export_csv",
    description=(
        "Export a run's portfolio holdings as a broker-formatted CSV. "
        "Supports IBKR in v0.4; tiger / futu are stubs that will land in "
        "v0.5."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
            "kind": {
                "type": "string",
                "enum": ["ibkr", "tiger", "futu"],
            },
        },
        "required": ["run_id", "kind"],
    },
)


def _impl_export_csv(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    run_id = str(args["run_id"])
    kind = str(args["kind"])
    if kind in ("tiger", "futu"):
        return _stub_result({"kind": kind})

    run_dir = _run_dir(ctx, run_id)
    holdings_path = run_dir / "holdings.json"
    if holdings_path.exists():
        holdings = _read_json(holdings_path)
        tickers = list(holdings.get("tickers", []))
    else:
        # Fall back to top-quintile from validator / report if present
        try:
            report = _load_report(run_dir)
        except FileNotFoundError:
            tickers = []
        else:
            tickers = list(report.get("held_tickers") or [])

    # IBKR basket CSV format: Symbol,Action,Quantity
    lines = ["Symbol,Action,Quantity"]
    for t in tickers:
        lines.append(f"{t},BUY,100")
    csv_text = "\n".join(lines) + "\n"
    return ToolResult(
        ok=True,
        data={
            "kind": "ibkr",
            "filename": f"{run_id}_ibkr.csv",
            "content": csv_text,
            "n_rows": len(tickers),
        },
        display_hint="code",
    )


# ---------------------------------------------------------------------------
# Default registry assembly
# ---------------------------------------------------------------------------


_DEFAULT_TOOLS: list[RegisteredTool] = [
    RegisteredTool(_RUN_FACTOR_ANALYSIS_SCHEMA, _impl_run_factor_analysis),
    RegisteredTool(_RUN_RISK_ATTRIBUTION_SCHEMA, _impl_run_risk_attribution),
    RegisteredTool(_RUN_ROBUSTNESS_SCHEMA, _impl_run_robustness),
    RegisteredTool(_GENERATE_REPORT_SCHEMA, _impl_generate_report),
    RegisteredTool(_READ_FACTOR_CODE_SCHEMA, _impl_read_factor_code),
    RegisteredTool(_WRITE_FACTOR_CODE_SCHEMA, _impl_write_factor_code),
    RegisteredTool(_RUN_BACKTEST_SCHEMA, _impl_run_backtest),
    RegisteredTool(_SEARCH_PAPERS_SCHEMA, _impl_search_papers),
    RegisteredTool(_REPRODUCE_PAPER_SCHEMA, _impl_reproduce_paper),
    RegisteredTool(_LIST_RUNS_SCHEMA, _impl_list_runs),
    RegisteredTool(_COMPARE_RUNS_SCHEMA, _impl_compare_runs),
    RegisteredTool(_CREATE_PORTFOLIO_SCHEMA, _impl_create_portfolio),
    RegisteredTool(_REBALANCE_PORTFOLIO_SCHEMA, _impl_rebalance_portfolio),
    RegisteredTool(_QUERY_DATA_SCHEMA, _impl_query_data),
    RegisteredTool(_EXPORT_CSV_SCHEMA, _impl_export_csv),
]


def build_default_registry() -> ToolRegistry:
    """Return a registry with the v0.4 default 15 tools registered."""
    reg = ToolRegistry()
    for tool in _DEFAULT_TOOLS:
        reg.register(tool)
    return reg
