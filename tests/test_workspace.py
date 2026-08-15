from world_class_decks.workspace import init_workspace


def test_workspace_is_idempotent(tmp_path):
    first = init_workspace(tmp_path)
    second = init_workspace(tmp_path)
    assert first
    assert second == []
    assert (tmp_path / "visual_direction.json").exists()
    assert (tmp_path / "renders").is_dir()
