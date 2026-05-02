"""FastAPI server exposing the replicalpha pipeline as HTTP endpoints.

Endpoints:
  POST /runs                             — start a new run
  GET  /runs                             — list all runs (filesystem-aggregated)
  GET  /runs/{run_id}                    — run metadata + stage status
  GET  /runs/{run_id}/report             — markdown report (text/markdown)
  GET  /runs/{run_id}/analysis           — cached analysis.json (or 404)
  GET  /runs/{run_id}/attribution        — cached attribution.json (or 404)
  GET  /runs/{run_id}/robustness         — cached robustness.json (or 404)
  POST /runs/{run_id}/analysis/compute   — run factor analysis synchronously
  POST /runs/{run_id}/attribution/compute — run risk attribution synchronously
  POST /runs/{run_id}/robustness/compute  — run robustness diagnostics
"""

from __future__ import annotations

import json
import os
from datetime import date
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from replicalpha.core.agent.tool_registry import ToolContext, build_default_registry
from replicalpha.core.data import CSVAdapter
from replicalpha.core.orchestrator import run_pipeline
from replicalpha.vendored.paper2alpha.core.llm_client import OpenAIClient

app = FastAPI(title="replicalpha", version="0.1.0")

# Allow the bundled HTML (file:// or any localhost origin) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

RUNS_ROOT = Path(os.environ.get("RUNS_ROOT", "./runs"))
DATA_CSV = Path(os.environ.get("REPLICALPHA_DATA_CSV", "tests/cases/sample_market_data.csv"))
FRONTEND_DIR = Path(__file__).resolve().parents[3] / "frontend"

# Wire the agent SSE router. Imported after ``RUNS_ROOT`` / ``DATA_CSV`` are
# defined because the router reads them lazily at request time.
from replicalpha.server.agent import router as agent_router  # noqa: E402

app.include_router(agent_router)

# Serve the bundled HTML at /ui so the frontend is same-origin with the API
# (no CORS / file:// quirks).
if FRONTEND_DIR.exists():
    app.mount("/ui/static", StaticFiles(directory=str(FRONTEND_DIR)), name="ui-static")

    @app.get("/ui", include_in_schema=False)
    @app.get("/ui/", include_in_schema=False)
    def serve_ui() -> FileResponse:
        return FileResponse(
            str(FRONTEND_DIR / "replicalpha.html"),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _read_artifact(run_id: str, name: str) -> dict[str, Any]:
    """Read a JSON artifact from a run dir or raise 404."""
    path = RUNS_ROOT / run_id / name
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{name} not found for run {run_id}")
    data: Any = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise HTTPException(status_code=500, detail=f"{name} is not a JSON object")
    return data


def _load_report_for_summary(run_dir: Path) -> dict[str, Any] | None:
    for fname in ("report.json", "pipeline_report.json"):
        p = run_dir / fname
        if p.exists():
            try:
                obj = json.loads(p.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                return None
            if isinstance(obj, dict):
                return obj
    return None


def _summarise_run_dir(run_dir: Path) -> dict[str, Any]:
    """Build a list-row dict for one run dir, even if reports are missing."""
    report = _load_report_for_summary(run_dir) or {}
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
    created_at: str | None = None
    try:
        created_at = date.fromtimestamp(run_dir.stat().st_mtime).isoformat()
    except OSError:
        created_at = None
    return {
        "run_id": str(report.get("run_id") or run_dir.name),
        "paper_path": report.get("paper_path"),
        "created_at": created_at,
        "verdict": verdict,
        "score": float(score) if isinstance(score, (int, float)) else None,
        "ic_mean": bt.get("ic_mean"),
    }


def _compute_via_tool(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Dispatch a tool through the registry and return data or raise 4xx/5xx."""
    registry = build_default_registry()
    ctx = ToolContext(runs_root=RUNS_ROOT, current_run_id=None, data_csv=DATA_CSV)
    result = registry.call(tool_name, args, ctx)
    if not result.ok:
        raise HTTPException(status_code=500, detail=result.error or f"{tool_name} failed")
    return {"data": result.data, "display_hint": result.display_hint}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "replicalpha", "version": "0.1.0"}


@app.post("/runs")
async def start_run(pdf: UploadFile) -> dict[str, str]:
    run_id = f"r-{uuid4().hex[:8]}"
    run_dir = RUNS_ROOT / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = run_dir / "paper.pdf"
    pdf_path.write_bytes(await pdf.read())

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured on server")
    if not DATA_CSV.exists():
        raise HTTPException(status_code=500, detail=f"data CSV not found at {DATA_CSV}")

    adapter = CSVAdapter(DATA_CSV)
    run_pipeline(
        pdf_path=pdf_path,
        out_dir=run_dir,
        adapter=adapter,
        extractor_llm=OpenAIClient(api_key=key),
        codegen_llm=None,
        backtest_start=date(2022, 1, 3),
        backtest_end=date(2024, 12, 31),
    )
    return {"run_id": run_id, "status_url": f"/runs/{run_id}"}


@app.get("/runs")
def list_runs() -> dict[str, Any]:
    """Aggregate every run dir under ``RUNS_ROOT`` into a single index."""
    if not RUNS_ROOT.exists():
        return {"runs": [], "n": 0}
    rows: list[dict[str, Any]] = []
    for child in sorted(RUNS_ROOT.iterdir()):
        if not child.is_dir():
            continue
        rows.append(_summarise_run_dir(child))
    return {"runs": rows, "n": len(rows)}


@app.get("/runs/{run_id}")
def get_run(run_id: str) -> dict[str, object]:
    run_dir = RUNS_ROOT / run_id
    report_path = run_dir / "pipeline_report.json"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail=f"run {run_id} not found")
    data: dict[str, object] = json.loads(report_path.read_text(encoding="utf-8"))
    return data


@app.get("/runs/{run_id}/report", response_class=PlainTextResponse)
def get_markdown_report(run_id: str) -> str:
    run_dir = RUNS_ROOT / run_id
    md_path = run_dir / "report.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"report for run {run_id} not found")
    return md_path.read_text(encoding="utf-8")


@app.get("/runs/{run_id}/analysis")
def get_analysis(run_id: str) -> dict[str, Any]:
    return _read_artifact(run_id, "analysis.json")


@app.get("/runs/{run_id}/attribution")
def get_attribution(run_id: str) -> dict[str, Any]:
    return _read_artifact(run_id, "attribution.json")


@app.get("/runs/{run_id}/robustness")
def get_robustness(run_id: str) -> dict[str, Any]:
    return _read_artifact(run_id, "robustness.json")


@app.post("/runs/{run_id}/analysis/compute")
def compute_analysis(run_id: str) -> dict[str, Any]:
    return _compute_via_tool("run_factor_analysis", {"run_id": run_id})


@app.post("/runs/{run_id}/attribution/compute")
def compute_attribution(run_id: str) -> dict[str, Any]:
    return _compute_via_tool("run_risk_attribution", {"run_id": run_id})


@app.post("/runs/{run_id}/robustness/compute")
def compute_robustness(run_id: str, kind: str = "all") -> dict[str, Any]:
    return _compute_via_tool("run_robustness", {"run_id": run_id, "kind": kind})
