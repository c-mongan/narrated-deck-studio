from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


class PptMasterUnavailable(RuntimeError):
    pass


def find_ppt_master(root: Path | None = None) -> Path | None:
    candidates: list[Path] = []
    if root:
        candidates.extend([root, root / "skills" / "ppt-master"])
    candidates.extend([
        Path.cwd() / "ppt-master",
        Path.home() / ".agents" / "skills" / "ppt-master",
        Path.home() / ".claude" / "skills" / "ppt-master",
    ])
    for candidate in candidates:
        if (candidate / "SKILL.md").exists() or (candidate / "skills" / "ppt-master" / "SKILL.md").exists():
            return candidate
    return None


def run_script(script: Path, args: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    python = shutil.which("python3") or shutil.which("python")
    if not python:
        raise PptMasterUnavailable("Python executable not found.")
    if not script.exists():
        raise PptMasterUnavailable(f"PPT Master script not found: {script}")
    return subprocess.run([python, str(script), *args], cwd=cwd, check=True, text=True, capture_output=True)
