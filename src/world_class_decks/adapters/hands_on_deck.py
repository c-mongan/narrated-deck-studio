from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


class HandsOnDeckUnavailable(RuntimeError):
    pass


def run_deck_command(args: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    """Thin adapter; upstream CLI remains the source of truth."""
    deck = shutil.which("deck")
    if not deck:
        raise HandsOnDeckUnavailable(
            "hands-on-deck CLI (`deck`) not found. Install the upstream project, then rerun."
        )
    return subprocess.run([deck, *args], cwd=cwd, check=True, text=True, capture_output=True)
