from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any


def _wilson_interval(wins: float, trials: int, z: float = 1.96) -> tuple[float, float]:
    if trials == 0:
        return (0.0, 0.0)
    p = wins / trials
    denom = 1 + z * z / trials
    centre = (p + z * z / (2 * trials)) / denom
    margin = z * math.sqrt((p * (1 - p) + z * z / (4 * trials)) / trials) / denom
    return max(0.0, centre - margin), min(1.0, centre + margin)


def score_pairwise(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Score blind candidate-vs-human comparisons.

    Winner values: candidate, reference, tie. Ties count as half a win. A record may
    optionally include `eligible: false` for a comparison invalidated by instruction or
    factual failure.
    """
    eligible = [r for r in records if r.get("eligible", True)]
    if not eligible:
        return {"comparisons": 0, "candidate_win_rate": 0.0, "lower_95": 0.0, "upper_95": 0.0}
    points = 0.0
    by_dimension: dict[str, list[float]] = {}
    for record in eligible:
        winner = record.get("winner")
        if winner == "candidate":
            points += 1.0
        elif winner == "tie":
            points += 0.5
        elif winner != "reference":
            raise ValueError(f"Unknown winner: {winner!r}")
        for key, value in record.get("dimension_preference", {}).items():
            by_dimension.setdefault(key, []).append(float(value))

    lower, upper = _wilson_interval(points, len(eligible))
    return {
        "comparisons": len(eligible),
        "candidate_points": points,
        "candidate_win_rate": round(points / len(eligible), 4),
        "lower_95": round(lower, 4),
        "upper_95": round(upper, 4),
        "dimension_means": {
            key: round(sum(values) / len(values), 3) for key, values in sorted(by_dimension.items())
        },
    }


def score_pairwise_file(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    records = data["comparisons"] if isinstance(data, dict) else data
    return score_pairwise(records)
