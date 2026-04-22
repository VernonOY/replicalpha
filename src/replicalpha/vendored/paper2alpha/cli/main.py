from __future__ import annotations

import os
from pathlib import Path

import click
from rich.console import Console

from ..core.config import load_config
from ..core.llm_client import LLMClient, MockClient, OpenAIClient
from ..core.pipeline import run_pipeline


@click.group()
@click.version_option(package_name="paper2alpha")
def cli() -> None:
    """paper2alpha — research PDF → executable alpha factors."""


@cli.command()
@click.argument("pdf", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option(
    "--out",
    "out_dir",
    type=click.Path(file_okay=False, path_type=Path),
    required=True,
    help="Output directory for card.json / factor_*.py / qtype_report.json.",
)
@click.option(
    "--config",
    "config_path",
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    default=None,
    help="Optional TOML config file (default: rely on env vars and built-in defaults).",
)
@click.option(
    "--llm-mock",
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    default=None,
    help="Path to a JSON file used as a deterministic LLM response (tests only).",
)
def run(
    pdf: Path,
    out_dir: Path,
    config_path: Path | None,
    llm_mock: Path | None,
) -> None:
    """Run the full PDF → card → code pipeline."""
    console = Console()
    llm: LLMClient
    if llm_mock is not None:
        llm = MockClient(
            {"": llm_mock.read_text(encoding="utf-8")},
            match="contains",
        )
    else:
        try:
            cfg = load_config(path=config_path, env=os.environ)
        except ValueError as exc:
            raise click.ClickException(str(exc)) from exc
        llm = OpenAIClient(api_key=cfg.api_key, model=cfg.model)
    result = run_pipeline(pdf=pdf, out_dir=out_dir, llm=llm)
    console.print(f"[green]✓[/] extracted {len(result.card.factors)} factor(s)")
    for f in result.card.factors:
        console.print(f"  • {f.name} — {f.chinese_name}")
    mark = "[green]PASS[/]" if result.check.passed else "[red]FAIL[/]"
    console.print(f"qtype: {mark}  ({len(result.check.violations)} violation(s))")


if __name__ == "__main__":
    cli()
