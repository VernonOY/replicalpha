"""End-to-end reproduction pipeline.

Chains:
  PDF → parse → extract ResearchCard → codegen → compile factor →
  backtest → validate → score → report

All intermediate artifacts are persisted to out_dir.
"""

from __future__ import annotations

import importlib.util
import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any

from replicalpha.core.backtest import run_backtest
from replicalpha.core.codegen import CodegenError, generate_factor_code
from replicalpha.core.data import DataAdapter
from replicalpha.core.models import (
    BacktestResult,
    CodegenResult,
    PipelineReport,
    PipelineStage,
)
from replicalpha.core.reporter import render_report
from replicalpha.core.scorer import score_reproducibility
from replicalpha.core.validator import run_red_team
from replicalpha.vendored.paper2alpha.core.extractor import Extractor
from replicalpha.vendored.paper2alpha.core.llm_client import LLMClient
from replicalpha.vendored.paper2alpha.core.models import ResearchCard
from replicalpha.vendored.paper2alpha.core.pdf_parser import parse_pdf


def run_pipeline(
    *,
    pdf_path: Path,
    out_dir: Path,
    adapter: DataAdapter,
    extractor_llm: LLMClient,
    codegen_llm: LLMClient | None,
    backtest_start: date,
    backtest_end: date,
    universe: str = "全A",
) -> PipelineReport:
    """Run the full reproduction pipeline.

    Args:
        pdf_path: Path to the research paper PDF.
        out_dir: Directory where artifacts are persisted.
        adapter: Market data adapter.
        extractor_llm: LLM client for extracting ResearchCard from PDF text.
        codegen_llm: LLM client for factor code generation fallback (None = DSL only).
        backtest_start: Start date for the backtest period.
        backtest_end: End date for the backtest period.
        universe: Universe filter string passed through to data adapter.

    Returns:
        PipelineReport with all stages populated.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    run_id = str(uuid.uuid4())[:8]
    completed: list[PipelineStage] = []

    # ── Stage 1: extract ─────────────────────────────────────────────────────
    parsed = parse_pdf(pdf_path)
    extractor = Extractor(llm=extractor_llm)
    card: ResearchCard = extractor.extract(parsed)

    card_path = out_dir / "research_card.json"
    card_path.write_text(
        json.dumps(card.model_dump(), indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    completed.append("extract")

    # ── Stage 2: codegen (first factor only) ─────────────────────────────────
    factor = card.factors[0]
    try:
        codegen_result: CodegenResult = generate_factor_code(
            factor.formula,
            factor_name=factor.name,
            params=factor.params,
            llm_client=codegen_llm,
        )
    except CodegenError as exc:
        # DSL failed and no LLM fallback — produce a minimal stub CodegenResult
        stub_src = (
            f'"""Factor: {factor.name} — stub (codegen failed)."""\n'
            "from __future__ import annotations\n"
            "from datetime import date\n\n\n"
            f'FACTOR_NAME = "{factor.name}"\n\n\n'
            "def compute(adapter, as_of: date, universe: str = '') -> dict[str, float]:\n"
            '    raise NotImplementedError("codegen produced a stub; see note in CodegenResult")\n'
        )
        codegen_result = CodegenResult(
            method="stub",
            source_code=stub_src,
            qtype_passed=False,
            qtype_violations=[],
            note=str(exc),
        )

    code_path = out_dir / f"factor_{factor.name}.py"
    code_path.write_text(codegen_result.source_code, encoding="utf-8")
    completed.append("codegen")

    # ── Stage 3: backtest (skip if stub) ─────────────────────────────────────
    backtest_result: BacktestResult | None = None
    held_tickers: list[str] = []

    if codegen_result.method != "stub":
        compute_fn = _load_compute(code_path, factor.name)
        backtest_result = run_backtest(
            compute=compute_fn,
            adapter=adapter,
            start=backtest_start,
            end=backtest_end,
            universe=universe,
        )

        # Compute held tickers (top quintile at backtest_end)
        latest_scores = compute_fn(adapter, backtest_end, universe)
        if latest_scores:
            sorted_t = sorted(latest_scores.items(), key=lambda kv: kv[1], reverse=True)
            cutoff = max(len(sorted_t) // 5, 1)
            held_tickers = [t for t, _ in sorted_t[:cutoff]]

        bt_path = out_dir / "backtest.json"
        bt_path.write_text(
            json.dumps(backtest_result.model_dump(), indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )
        completed.append("backtest")

    # ── Stage 4: validate ─────────────────────────────────────────────────────
    # validator requires a BacktestResult; use an empty one if backtest skipped
    effective_backtest = (
        backtest_result
        if backtest_result is not None
        else _empty_backtest(backtest_start, backtest_end)
    )
    findings = run_red_team(
        card=card,
        backtest=effective_backtest,
        codegen=codegen_result,
        adapter=adapter,
        held_tickers=held_tickers,
    )

    validator_path = out_dir / "validator.json"
    validator_path.write_text(
        json.dumps(
            [f.model_dump() for f in findings],
            indent=2,
            ensure_ascii=False,
            default=str,
        ),
        encoding="utf-8",
    )
    completed.append("validate")

    # ── Stage 5: score ────────────────────────────────────────────────────────
    repro_score = score_reproducibility(card, effective_backtest)

    repro_path = out_dir / "reproducibility.json"
    repro_path.write_text(
        json.dumps(repro_score.model_dump(), indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    completed.append("score")

    # ── Stage 6: report ───────────────────────────────────────────────────────
    completed.append("report")
    report = PipelineReport(
        run_id=run_id,
        paper_path=str(pdf_path),
        completed_stages=completed,
        codegen=codegen_result,
        backtest=backtest_result,
        validator_findings=findings,
        reproducibility=repro_score,
    )

    md_text = render_report(card=card, report=report)
    (out_dir / "report.md").write_text(md_text, encoding="utf-8")

    pipeline_path = out_dir / "pipeline_report.json"
    pipeline_path.write_text(report.to_json(), encoding="utf-8")

    return report


def _load_compute(code_path: Path, factor_name: str) -> Any:
    """Dynamically import the generated factor module and return its compute function."""
    module_name = f"_replicalpha_generated_{factor_name}"
    spec = importlib.util.spec_from_file_location(module_name, code_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load generated factor at {code_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.compute


def _empty_backtest(start: date, end: date) -> BacktestResult:
    """Return a zeroed BacktestResult for use when backtest was skipped."""
    return BacktestResult(
        ic_mean=0.0,
        ic_std=0.0,
        ic_series={},
        cumulative_return=0.0,
        max_drawdown=0.0,
        annualized_sharpe=0.0,
        start_date=start.isoformat(),
        end_date=end.isoformat(),
    )
