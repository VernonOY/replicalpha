"""replicalpha CLI — run <pdf> --out <dir>."""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import click
from rich.console import Console

from replicalpha.core.data import CSVAdapter
from replicalpha.core.models import PipelineReport
from replicalpha.core.orchestrator import run_pipeline
from replicalpha.vendored.paper2alpha.core.llm_client import (
    LLMClient,
    MockClient,
    OpenAIClient,
)


@click.group()
@click.version_option(package_name="replicalpha")
def cli() -> None:
    """replicalpha — PDF → factor code → backtest → Red Team → reproducibility score."""


@cli.command()
@click.argument("pdf", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--out", "out_dir", type=click.Path(path_type=Path), required=True)
@click.option(
    "--data",
    "data_csv",
    type=click.Path(path_type=Path),
    required=True,
    help="CSV file for DataAdapter.",
)
@click.option(
    "--start", "start_str", type=str, default="2022-01-03", help="Backtest start YYYY-MM-DD."
)
@click.option("--end", "end_str", type=str, default="2024-12-31", help="Backtest end YYYY-MM-DD.")
@click.option(
    "--extractor-mock",
    type=click.Path(path_type=Path),
    default=None,
    help="Path to JSON with mock ResearchCard (offline demo / tests).",
)
@click.option(
    "--codegen-llm/--no-codegen-llm",
    default=False,
    help="Enable LLM fallback for non-DSL formulas (requires OPENAI_API_KEY).",
)
def run(
    pdf: Path,
    out_dir: Path,
    data_csv: Path,
    start_str: str,
    end_str: str,
    extractor_mock: Path | None,
    codegen_llm: bool,
) -> None:
    """Run the full pipeline on a single PDF."""
    console = Console()

    if not data_csv.exists():
        raise click.ClickException(f"data CSV not found: {data_csv}")

    try:
        start = datetime.strptime(start_str, "%Y-%m-%d").date()
        end = datetime.strptime(end_str, "%Y-%m-%d").date()
    except ValueError as exc:
        raise click.ClickException(f"bad date format, expected YYYY-MM-DD: {exc}") from exc

    adapter = CSVAdapter(data_csv)
    api_key = os.environ.get("OPENAI_API_KEY")

    extractor: LLMClient
    if extractor_mock is not None:
        payload = extractor_mock.read_text(encoding="utf-8")
        extractor = MockClient({"": payload}, match="contains")
    else:
        if not api_key:
            raise click.ClickException(
                "no extractor available: set OPENAI_API_KEY or pass --extractor-mock"
            )
        extractor = OpenAIClient(api_key=api_key)

    codegen: LLMClient | None = None
    if codegen_llm:
        if not api_key:
            raise click.ClickException("--codegen-llm requires OPENAI_API_KEY env var")
        codegen = OpenAIClient(api_key=api_key)

    console.print(f"[bold]replicalpha run[/] — {pdf.name}")

    report = run_pipeline(
        pdf_path=pdf,
        out_dir=out_dir,
        adapter=adapter,
        extractor_llm=extractor,
        codegen_llm=codegen,
        backtest_start=start,
        backtest_end=end,
    )

    _print_summary(console, report, out_dir)


def _print_summary(console: Console, report: PipelineReport, out_dir: Path) -> None:
    console.print()
    console.print(f"[green]✓[/] run {report.run_id} finished")
    console.print(f"  output: {out_dir}")
    if report.codegen:
        mark = "[green]✓[/]" if report.codegen.qtype_passed else "[yellow]![/]"
        console.print(f"  codegen ({report.codegen.method}) {mark}")
    if report.backtest:
        b = report.backtest
        console.print(
            f"  backtest: IC {b.ic_mean:.4f}  cumret {b.cumulative_return:+.2%}  "
            f"maxDD {b.max_drawdown:.2%}  Sharpe {b.annualized_sharpe:.2f}"
        )
    if report.reproducibility:
        r = report.reproducibility
        console.print(f"  reproducibility: [bold]{r.final_score:.2f}[/]  — {r.interpretation}")
    if report.validator_findings:
        counts: dict[str, int] = {}
        for f in report.validator_findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1
        parts = ", ".join(f"{n} {sev}" for sev, n in counts.items())
        console.print(f"  red team findings: {parts}")


if __name__ == "__main__":
    cli()
