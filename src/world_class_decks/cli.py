from __future__ import annotations

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from world_class_decks.doctor import environment_report
from world_class_decks.evals.runner import score_file
from world_class_decks.qa.pptx import audit_pptx
from world_class_decks.render import make_contact_sheet, render_pptx
from world_class_decks.workspace import init_workspace

app = typer.Typer(no_args_is_help=True, help="Build, audit, render, and evaluate world-class PowerPoint decks.")
console = Console()


@app.command()
def doctor() -> None:
    """Check optional local dependencies."""
    report = environment_report()
    console.print_json(json.dumps(report))


@app.command("init-workspace")
def init_workspace_cmd(path: Path) -> None:
    """Create a structured deck workspace."""
    written = init_workspace(path)
    console.print(f"Created {len(written)} workspace files in {path}")


@app.command()
def audit(
    pptx: Path,
    output: Path | None = typer.Option(None, help="Optional JSON report path."),
    max_words: int = 90,
    min_font_pt: float = 14.0,
) -> None:
    """Run deterministic QA on a PowerPoint file."""
    report = audit_pptx(pptx, max_words_per_slide=max_words, min_font_pt=min_font_pt)
    table = Table(title=f"Audit: {pptx.name}")
    table.add_column("Severity")
    table.add_column("Slide")
    table.add_column("Code")
    table.add_column("Finding")
    for f in report.findings:
        table.add_row(f.severity.value, str(f.slide or "-"), f.code, f.message)
    console.print(table)
    console.print(f"Passed: {report.passed}")
    if output:
        output.write_text(json.dumps(report.as_dict(), indent=2) + "\n", encoding="utf-8")
    if not report.passed:
        raise typer.Exit(2)


@app.command()
def render(pptx: Path, out_dir: Path, dpi: int = 150) -> None:
    """Render a deck to PNG images using LibreOffice + Poppler."""
    images = render_pptx(pptx, out_dir, dpi=dpi)
    console.print(f"Rendered {len(images)} slides to {out_dir}")


@app.command("contact-sheet")
def contact_sheet(render_dir: Path, output: Path, columns: int = 3) -> None:
    """Create a whole-deck contact sheet for visual review."""
    images = sorted(render_dir.glob("slide-*.png"))
    make_contact_sheet(images, output, columns=columns)
    console.print(f"Wrote {output}")


@app.command("score-eval")
def score_eval(path: Path) -> None:
    """Score a completed evaluation JSON file."""
    console.print_json(json.dumps(score_file(path)))


if __name__ == "__main__":
    app()
