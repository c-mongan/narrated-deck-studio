from __future__ import annotations

import json
from pathlib import Path

FILES = {
    "brief.md": "# Deck brief\n\nAudience:\nDecision/action desired:\nSource material:\nConstraints:\n",
    "design_brief.json": {"audience": "", "tone": "", "constraints": [], "reference_decks": []},
    "content_plan.json": {"thesis": "", "sections": [], "slide_count_target": 10},
    "evidence_plan.json": {"claims": []},
    "asset_plan.json": {"assets": []},
    "outline.json": {"slides": []},
    "visual_direction.json": {
        "concept": "",
        "palette": {},
        "typography": {},
        "grid": {},
        "image_style": "",
        "chart_style": "",
        "signature_motif": "",
    },
    "review.json": {"iteration": 0, "findings": [], "status": "not-reviewed"},
}


def init_workspace(path: Path) -> list[Path]:
    path.mkdir(parents=True, exist_ok=True)
    (path / "assets").mkdir(exist_ok=True)
    (path / "renders").mkdir(exist_ok=True)
    written: list[Path] = []
    for name, content in FILES.items():
        target = path / name
        if target.exists():
            continue
        if isinstance(content, str):
            target.write_text(content, encoding="utf-8")
        else:
            target.write_text(json.dumps(content, indent=2) + "\n", encoding="utf-8")
        written.append(target)
    return written
