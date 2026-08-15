from world_class_decks.qa.copy import find_copy_issues


def test_detects_generic_heading_and_slop():
    findings = find_copy_issues([(1, "Key Priorities", "Title"), (2, "Unlock transformative value", "Body")])
    codes = {f.code for f in findings}
    assert "generic-heading" in codes
    assert "copy-slop:unlock" in codes
    assert "copy-slop:transformative" in codes


def test_specific_copy_is_clean():
    findings = find_copy_issues([(1, "Two failure modes account for 73% of incidents", "Title")])
    assert findings == []
