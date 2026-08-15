import pytest

from world_class_decks.evals.runner import score_evaluation


def test_eval_passes_high_score_and_gates():
    data = {
        "pass_threshold": 85,
        "hard_gates": {"opens": True, "no_overlap": True},
        "scores": {
            "story": 90,
            "visual_quality": 92,
            "specificity": 88,
            "evidence": 90,
            "editability": 90,
            "copy_quality": 95,
            "consistency": 91,
        },
    }
    result = score_evaluation(data)
    assert result["passed"] is True
    assert result["weighted_score"] > 90


def test_hard_gate_can_fail_good_deck():
    data = {
        "hard_gates": {"opens": True, "no_overlap": False},
        "scores": {k: 100 for k in ["story", "visual_quality", "specificity", "evidence", "editability", "copy_quality", "consistency"]},
    }
    assert score_evaluation(data)["passed"] is False


def test_missing_score_rejected():
    with pytest.raises(ValueError):
        score_evaluation({"scores": {"story": 90}})
