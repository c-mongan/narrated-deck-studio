from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


class RenderError(RuntimeError):
    pass


def render_pptx(path: Path, out_dir: Path, *, dpi: int = 150) -> list[Path]:
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    pdftoppm = shutil.which("pdftoppm")
    if not soffice or not pdftoppm:
        raise RenderError("Rendering requires LibreOffice and Poppler (pdftoppm).")

    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_dir = out_dir / "_pdf"
    pdf_dir.mkdir(exist_ok=True)
    subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf", "--outdir", str(pdf_dir), str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    pdf = pdf_dir / f"{path.stem}.pdf"
    if not pdf.exists():
        raise RenderError(f"LibreOffice did not produce {pdf}")

    prefix = out_dir / "slide"
    subprocess.run(
        [pdftoppm, "-png", "-r", str(dpi), str(pdf), str(prefix)],
        check=True,
        capture_output=True,
        text=True,
    )
    return sorted(out_dir.glob("slide-*.png"))


def make_contact_sheet(images: list[Path], output: Path, *, columns: int = 3, thumb_width: int = 480) -> Path:
    if not images:
        raise ValueError("No slide images supplied.")
    opened = [Image.open(p).convert("RGB") for p in images]
    ratio = opened[0].height / opened[0].width
    thumb_height = int(thumb_width * ratio)
    gutter = 24
    label_h = 36
    rows = (len(opened) + columns - 1) // columns
    canvas = Image.new("RGB", (columns * (thumb_width + gutter) + gutter, rows * (thumb_height + label_h + gutter) + gutter), "white")
    draw = ImageDraw.Draw(canvas)
    for idx, image in enumerate(opened):
        row, col = divmod(idx, columns)
        x = gutter + col * (thumb_width + gutter)
        y = gutter + row * (thumb_height + label_h + gutter)
        thumb = image.resize((thumb_width, thumb_height))
        canvas.paste(thumb, (x, y + label_h))
        draw.text((x, y + 8), f"Slide {idx + 1}", fill="black")
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)
    return output
