from __future__ import annotations

import platform
import shutil

from world_class_decks.adapters.ppt_master import find_ppt_master


def environment_report() -> dict[str, object]:
    ppt_master = find_ppt_master()
    return {
        "platform": platform.platform(),
        "python": platform.python_version(),
        "tools": {
            "libreoffice": shutil.which("soffice") or shutil.which("libreoffice"),
            "pdftoppm": shutil.which("pdftoppm"),
            "node": shutil.which("node"),
            "npm": shutil.which("npm"),
            "deck": shutil.which("deck"),
            "ppt_master": str(ppt_master) if ppt_master else None,
            "powershell": shutil.which("pwsh") or shutil.which("powershell"),
        },
    }
