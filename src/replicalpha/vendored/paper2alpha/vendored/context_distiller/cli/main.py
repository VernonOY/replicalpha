"""context-distiller CLI — thin click+rich wrapper around core.Distiller."""

from __future__ import annotations

from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .. import __version__
from ..core.distiller import Distiller

console = Console()

_DEFAULT_KB = "./knowledge_base"


@click.group()
@click.version_option(version=__version__, prog_name="distill")
def cli() -> None:
    """distill — quantitative domain knowledge manager for LLM context."""


@cli.command()
@click.argument("task")
@click.option(
    "--kb",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    default=_DEFAULT_KB,
    help="Path to knowledge_base directory.",
    show_default=True,
)
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, path_type=Path),
    default=None,
    help="Path to store index data (default: <kb>/../.distiller_data).",
)
@click.option(
    "--budget",
    type=int,
    default=4000,
    help="Token budget for context output.",
    show_default=True,
)
def query(task: str, kb: Path, data_dir: Path | None, budget: int) -> None:
    """Query the knowledge base for relevant context."""
    distiller = Distiller(knowledge_dir=kb, data_dir=data_dir)
    context = distiller.get_context(task=task, token_budget=budget)
    if not context:
        console.print("[dim]No results found.[/]")
        return
    console.print(Panel(context, title="Context", border_style="blue"))


@cli.command()
@click.option(
    "--kb",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    default=_DEFAULT_KB,
    help="Path to knowledge_base directory.",
    show_default=True,
)
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, path_type=Path),
    default=None,
    help="Path to store index data (default: <kb>/../.distiller_data).",
)
def add(kb: Path, data_dir: Path | None) -> None:
    """Ingest all documents from the knowledge base directory."""
    distiller = Distiller(knowledge_dir=kb, data_dir=data_dir)
    stats = distiller.ingest()
    console.print(f"[green]Ingested[/] {stats['documents']} documents → {stats['chunks']} chunks")


@cli.command()
@click.option(
    "--kb",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    default=_DEFAULT_KB,
    help="Path to knowledge_base directory.",
    show_default=True,
)
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, path_type=Path),
    default=None,
    help="Path to store index data (default: <kb>/../.distiller_data).",
)
def status(kb: Path, data_dir: Path | None) -> None:
    """Show knowledge base statistics."""
    distiller = Distiller(knowledge_dir=kb, data_dir=data_dir)
    info = distiller.status()

    table = Table(title="Knowledge Base Status", header_style="bold")
    table.add_column("Category", style="cyan")
    table.add_column("Documents", justify="right")

    for cat, count in info["categories"].items():
        table.add_row(cat, str(count))

    console.print(table)
    console.print(f"\nIndexed chunks: [bold]{info['total_chunks']}[/]")
    console.print(f"Knowledge dir:  [dim]{info['knowledge_dir']}[/]")


if __name__ == "__main__":
    cli()
