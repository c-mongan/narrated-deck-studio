from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DEFAULT_WEIGHTS = {
    "story": 0.15,
    "visual_quality": 0.13,
    "art_direction": 0.12,
    "typography": 0.10,
    "composition": 0.10,
    "imagery": 0.09,
    "specificity": 0.08,
    "evidence": 0.08,
    "copy_quality": 0.06,
    "editability": 0.04,
    "consistency": 0.03,
    "motion": 0.02,
}


def score_evaluation(data: dict[str, Any], *, weights: dict[str, float] | None = None) -> dict[str, Any]:
    weights = weights or DEFAULT_WEIGHTS
    scores = data.get("scores", {})
    missing = sorted(k for k in weights if k not in scores)
    if missing:
        raise ValueError(f"Missing rubric scores: {', '.join(missing)}")

    # null means legitimately not applicable (e.g. motion for a leave-behind PDF).
    applicable = {k: w for k, w in weights.items() if scores[k] is not None}
    if not applicable:
        raise ValueError("No applicable rubric dimensions.")
    weight_total = sum(applicable.values())
    weighted = sum(float(scores[k]) * w for k, w in applicable.items()) / weight_total
    hard_gates = data.get("hard_gates", {})
    gates_pass = all(bool(v) for v in hard_gates.values()) if hard_gates else True
    threshold = float(data.get("pass_threshold", 90))
    return {
        "weighted_score": round(weighted, 2),
        "hard_gates_pass": gates_pass,
        "passed": gates_pass and weighted >= threshold,
        "applicable_dimensions": sorted(applicable),
    }


def score_file(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {**data, **score_evaluation(data)}
