from __future__ import annotations

import re
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"a": A_NS, "p": P_NS, "r": R_NS}


def _xml_files(zf: zipfile.ZipFile, prefix: str) -> list[str]:
    return [n for n in zf.namelist() if n.startswith(prefix) and n.endswith(".xml")]


def inspect_capabilities(path: Path) -> dict[str, object]:
    """Inspect native PowerPoint capability usage without rendering.

    This is intentionally descriptive, not a quality score. A brilliant static deck can
    have no animation; a terrible deck can have dozens. The report gives the creative
    reviewer evidence about whether theme, typography, native charts, media and motion
    are actually present in the PPTX package.
    """
    fonts: Counter[str] = Counter()
    transitions = 0
    timings = 0
    charts = 0
    tables = 0
    pictures = 0
    theme_count = 0
    master_count = 0
    layout_count = 0
    media_files: list[str] = []
    embedded_fonts: list[str] = []

    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        theme_count = len(_xml_files(zf, "ppt/theme/"))
        master_count = len(_xml_files(zf, "ppt/slideMasters/"))
        layout_count = len(_xml_files(zf, "ppt/slideLayouts/"))
        charts = len(_xml_files(zf, "ppt/charts/"))
        media_files = [n for n in names if n.startswith("ppt/media/") and not n.endswith("/")]
        embedded_fonts = [n for n in names if n.startswith("ppt/fonts/") and not n.endswith("/")]

        for slide_name in _xml_files(zf, "ppt/slides/"):
            root = ET.fromstring(zf.read(slide_name))
            transitions += len(root.findall(".//p:transition", NS))
            timings += len(root.findall(".//p:timing", NS))
            tables += len(root.findall(".//a:tbl", NS))
            pictures += len(root.findall(".//p:pic", NS))

            for node in root.findall(".//*[@typeface]"):
                face = node.attrib.get("typeface", "").strip()
                if face and not face.startswith("+"):
                    fonts[face] += 1

        # Theme typefaces are semantically useful even when slide runs inherit them.
        for theme_name in _xml_files(zf, "ppt/theme/"):
            try:
                root = ET.fromstring(zf.read(theme_name))
            except ET.ParseError:
                continue
            for node in root.findall(".//*[@typeface]"):
                face = node.attrib.get("typeface", "").strip()
                if face and not face.startswith("+"):
                    fonts[face] += 1

    return {
        "file": str(path),
        "native": {
            "themes": theme_count,
            "slide_masters": master_count,
            "slide_layouts": layout_count,
            "charts": charts,
            "tables": tables,
            "pictures": pictures,
            "media_files": len(media_files),
            "embedded_fonts": len(embedded_fonts),
        },
        "motion": {
            "slides_with_transition_markup": transitions,
            "slides_with_timing_markup": timings,
        },
        "typography": {
            "declared_font_families": [name for name, _ in fonts.most_common()],
            "font_usage_mentions": dict(fonts.most_common()),
        },
        "media": media_files,
        "embedded_font_parts": embedded_fonts,
    }
