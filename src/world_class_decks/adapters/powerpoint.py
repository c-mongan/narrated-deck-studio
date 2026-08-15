from __future__ import annotations

from pathlib import Path


def powershell_export_script(pptx: Path, out_dir: Path, *, width: int = 1920, height: int = 1080) -> str:
    """Return a Windows PowerShell snippet using PowerPoint COM for final-fidelity PNG export."""
    return f'''$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $true
$presentation = $ppt.Presentations.Open("{pptx}", $false, $false, $false)
$presentation.Export("{out_dir}", "PNG", {width}, {height})
$presentation.Close()
$ppt.Quit()
'''
