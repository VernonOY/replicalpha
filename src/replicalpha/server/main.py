"""FastAPI server exposing the replicalpha pipeline as HTTP endpoints.

Endpoints:
  POST /runs            — start a new run, returns {run_id, status_url}
  GET /runs/{run_id}    — run metadata + stage status
  GET /runs/{run_id}/report  — markdown report (text/markdown)
"""

from __future__ import annotations

import json
import os
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

from replicalpha.core.data import CSVAdapter
from replicalpha.core.orchestrator import run_pipeline
from replicalpha.vendored.paper2alpha.core.llm_client import OpenAIClient

app = FastAPI(title="replicalpha", version="0.1.0")

RUNS_ROOT = Path(os.environ.get("RUNS_ROOT", "./runs"))
DATA_CSV = Path(os.environ.get("REPLICALPHA_DATA_CSV", "tests/cases/sample_market_data.csv"))


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
