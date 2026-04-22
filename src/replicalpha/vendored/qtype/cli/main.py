"""qtype CLI — thin click+rich wrapper around qtype.core."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .. import __version__
from ..core.analyzer import QtypeAnalyzer
from ..core.rules import ALL_RULES
from ..core.violation import Violation

console = Console()
err_console = Console(stderr=True)


@click.group()
@click.version_option(version=__version__, prog_name="qtype")
def cli() -> None:
    """qtype — static analyzer for quantitative trading code."""


@cli.command()
@click.argument(
    "path",
    type=click.Path(exists=True, file_okay=True, dir_okay=True, path_type=Path),
)
@click.option(
    "--format",
    "-f",
    "output_format",
    type=click.Choice(["rich", "json"]),
    default="rich",
    help="output format",
)
@click.option(
    "--rules",
    "-r",
    "rule_filter",
    default=None,
    help="comma-separated rule IDs to run (e.g. QT001,QT003)",
)
def check(path: Path, output_format: str, rule_filter: str | None) -> None:
    """Check a file or directory for quant code issues."""
    if rule_filter:
        wanted = {r.strip() for r in rule_filter.split(",") if r.strip()}
        analyzer = QtypeAnalyzer(rules=[cls() for cls in ALL_RULES if cls.rule_id in wanted])
    else:
        analyzer = QtypeAnalyzer()
    violations = analyzer.check_file(path) if path.is_file() else analyzer.check_directory(path)

    if output_format == "json":
        _output_json(violations)
    else:
        _output_rich(violations)

    if violations:
        sys.exit(1)


def _output_json(violations: list[Violation]) -> None:
    payload = [
        {
            "rule_id": v.rule_id,
            "rule_name": v.rule_name,
            "file": v.file,
            "line": v.line,
            "message": v.message,
            "severity": v.severity,
            "suggestion": v.suggestion,
        }
        for v in violations
    ]
    click.echo(json.dumps(payload, indent=2))


def _output_rich(violations: list[Violation]) -> None:
    if not violations:
        console.print(Panel("[bold green]No issues found[/]", border_style="green"))
        return

    by_file: dict[str, list[Violation]] = {}
    for v in violations:
        by_file.setdefault(v.file, []).append(v)

    total = len(violations)
    files = len(by_file)
    console.print()
    console.print(
        f"  Found [bold red]{total}[/] issue{'s' if total != 1 else ''} "
        f"in [bold]{files}[/] file{'s' if files != 1 else ''}"
    )
    console.print()

    for filepath, file_violations in by_file.items():
        console.print(f"  [dim]{filepath}[/]")
        for v in file_violations:
            color = "red" if v.severity == "error" else "yellow"
            console.print(f"    [{color}]{v.rule_id}[/] [dim]line {v.line}[/]  {v.message}")
            if v.suggestion:
                console.print(f"           [dim]→ {v.suggestion}[/]")
        console.print()


@cli.command()
def rules() -> None:
    """List all available qtype rules."""
    table = Table(title="qtype rules", header_style="bold")
    table.add_column("ID", style="cyan")
    table.add_column("Name")
    table.add_column("Severity")

    for rule_cls in ALL_RULES:
        instance = rule_cls()
        sev_color = "red" if instance.severity == "error" else "yellow"
        table.add_row(
            instance.rule_id,
            instance.rule_name,
            f"[{sev_color}]{instance.severity}[/]",
        )

    console.print(table)


@cli.command()
@click.argument(
    "path",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
    default=".",
)
@click.option("--force", is_flag=True, help="overwrite existing .qtype.toml")
def init(path: Path, force: bool) -> None:
    """Scaffold a .qtype.toml config file (full config support in v0.2)."""
    target = path / ".qtype.toml"
    if target.exists() and not force:
        err_console.print(f"[yellow]{target} already exists; pass --force to overwrite[/]")
        return
    target.write_text(
        "# qtype config (v0.1 stub — config loading lands in v0.2)\n"
        "\n"
        "[rules]\n"
        '# enabled = ["QT001", "QT002", "QT003", "QT004", "QT005"]\n'
        "\n"
        "[ignore]\n"
        '# paths = ["tests/", "vendor/"]\n',
        encoding="utf-8",
    )
    console.print(f"[green]Created[/] {target}")


if __name__ == "__main__":
    cli()
