from __future__ import annotations

import platform
import shutil


def environment_report() -> dict[str, object]:
    return {
        "platform": platform.platform(),
        "python": platform.python_version(),
        "tools": {
            "libreoffice": shutil.which("soffice") or shutil.which("libreoffice"),
            "pdftoppm": shutil.which("pdftoppm"),
            "node": shutil.which("node"),
            "npm": shutil.which("npm"),
            "deck": shutil.which("deck"),
            "powershell": shutil.which("pwsh") or shutil.which("powershell"),
        },
    }
