from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DEFAULT_WEIGHTS = {
    "story": 0.22,
    "visual_quality": 0.24,
    "specificity": 0.12,
    "evidence": 0.16,
    "editability": 0.08,
    "copy_quality": 0.10,
    "consistency": 0.08,
}


def score_evaluation(data: dict[str, Any], *, weights: dict[str, float] | None = None) -> dict[str, Any]:
    weights = weights or DEFAULT_WEIGHTS
    scores = data.get("scores", {})
    missing = sorted(set(weights) - set(scores))
    if missing:
        raise ValueError(f"Missing rubric scores: {', '.join(missing)}")
    weighted = sum(float(scores[key]) * weight for key, weight in weights.items())
    hard_gates = data.get("hard_gates", {})
    gates_pass = all(bool(v) for v in hard_gates.values()) if hard_gates else True
    return {
        "weighted_score": round(weighted, 2),
        "hard_gates_pass": gates_pass,
        "passed": gates_pass and weighted >= float(data.get("pass_threshold", 85)),
    }


def score_file(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {**data, **score_evaluation(data)}
