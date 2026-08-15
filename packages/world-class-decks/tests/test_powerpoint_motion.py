from pathlib import Path

from world_class_decks.adapters.powerpoint import powershell_motion_script


def test_motion_script_targets_named_shapes():
    script = powershell_motion_script(Path("in.pptx"), Path("motion.json"), Path("out.pptx"))
    assert "TimeLine.MainSequence.AddEffect" in script
    assert "Shapes.Item" in script
    assert "Unsupported animation" in script
