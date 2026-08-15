from __future__ import annotations

import json
from pathlib import Path

FILES = {
    "brief.md": "# Deck brief\n\nAudience:\nDecision/action desired:\nSource material:\nConstraints:\nPresentation context:\n",
    "design_brief.json": {
        "audience": "", "tone": "", "constraints": [], "reference_decks": [],
        "delivery_context": "", "brand_constraints": [], "must_feel_like": [], "must_not_feel_like": []
    },
    "content_plan.json": {"thesis": "", "sections": [], "slide_count_target": 10},
    "evidence_plan.json": {"claims": []},
    "asset_plan.json": {"assets": []},
    "outline.json": {"slides": []},
    "concept_candidates.json": {
        "candidates": [],
        "selection_criteria": ["topic_specificity", "memorability", "audience_fit", "visual_range", "feasibility"],
        "selected": "",
        "rejected_reasons": {}
    },
    "creative_strategy.json": {
        "big_idea": "", "emotional_arc": "", "visual_metaphor": "", "editorial_point_of_view": "",
        "hero_moments": [], "restraint_rules": [], "surprise_budget": []
    },
    "theme_system.json": {
        "concept": "", "palette_roles": {}, "font_roles": {}, "type_scale": {}, "grid": {},
        "spacing_scale": [], "image_treatment": {}, "chart_system": {}, "shape_language": {},
        "signature_motif": "", "section_variants": []
    },
    "visual_direction.json": {
        "concept": "", "palette": {}, "typography": {}, "grid": {}, "image_style": "",
        "chart_style": "", "signature_motif": "", "composition_rules": [], "anti_patterns": []
    },
    "motion_plan.json": {"principle": "", "slides": []},
    "benchmark_plan.json": {
        "human_references": [], "blind_pairwise_required": True, "minimum_comparisons": 5,
        "target_candidate_win_rate": 0.70, "dimensions": [
            "art_direction", "typography", "composition", "imagery", "story", "specificity", "motion"
        ]
    },
    "review.json": {"iteration": 0, "findings": [], "status": "not-reviewed"},
}


def init_workspace(path: Path) -> list[Path]:
    path.mkdir(parents=True, exist_ok=True)
    for dirname in ("assets", "renders", "concepts", "references", "motion"):
        (path / dirname).mkdir(exist_ok=True)
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
