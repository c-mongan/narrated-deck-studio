from world_class_decks.evals.pairwise import score_pairwise


def test_pairwise_scoring():
    result = score_pairwise([
        {"winner": "candidate"},
        {"winner": "tie"},
        {"winner": "reference"},
        {"winner": "candidate"},
    ])
    assert result["comparisons"] == 4
    assert result["candidate_win_rate"] == 0.625
    assert 0 <= result["lower_95"] <= result["upper_95"] <= 1
