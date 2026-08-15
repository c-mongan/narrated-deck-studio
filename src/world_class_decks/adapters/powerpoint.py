from __future__ import annotations

from pathlib import Path


# Conservative subset of documented PowerPoint animation constants.
ANIM_EFFECTS = {
    "appear": 1,
    "fly": 2,
    "fade": 10,
    "float": 30,
    "ascend": 39,
    "descend": 42,
    "faded_zoom": 48,
    "glide": 49,
    "grow_shrink": 59,
}
TRIGGERS = {"on_click": 1, "with_previous": 2, "after_previous": 3}
TRANSITIONS = {
    "cut": 257,
    "fade": 1793,
    "fade_smoothly": 3849,
}


def _psq(value: str | Path) -> str:
    return str(value).replace("'", "''")


def powershell_export_script(pptx: Path, out_dir: Path, *, width: int = 1920, height: int = 1080) -> str:
    """Return a Windows PowerShell snippet using PowerPoint COM for final-fidelity PNG export."""
    return f'''$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $true
$presentation = $ppt.Presentations.Open('{_psq(pptx)}', $false, $false, $false)
$presentation.Export('{_psq(out_dir)}', 'PNG', {width}, {height})
$presentation.Close()
$ppt.Quit()
'''


def powershell_motion_script(pptx: Path, motion_json: Path, output: Path) -> str:
    """Generate a PowerPoint-native animation/transition applicator.

    motion JSON schema is documented in references/motion-direction.md. Shape targeting
    is by explicit PowerPoint shape name; this makes motion auditable and avoids fragile
    positional guessing.
    """
    effect_map = "@{" + ";".join(f"'{k}'={v}" for k, v in ANIM_EFFECTS.items()) + "}"
    trigger_map = "@{" + ";".join(f"'{k}'={v}" for k, v in TRIGGERS.items()) + "}"
    transition_map = "@{" + ";".join(f"'{k}'={v}" for k, v in TRANSITIONS.items()) + "}"
    return f'''$ErrorActionPreference = 'Stop'
$effectMap = {effect_map}
$triggerMap = {trigger_map}
$transitionMap = {transition_map}
$plan = Get-Content -Raw '{_psq(motion_json)}' | ConvertFrom-Json
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $true
$presentation = $ppt.Presentations.Open('{_psq(pptx)}', $false, $false, $false)
foreach ($slidePlan in $plan.slides) {{
  $slide = $presentation.Slides.Item([int]$slidePlan.slide)
  if ($slidePlan.transition) {{
    $name = [string]$slidePlan.transition.effect
    if (-not $transitionMap.ContainsKey($name)) {{ throw "Unsupported transition: $name" }}
    $slide.SlideShowTransition.EntryEffect = $transitionMap[$name]
  }}
  foreach ($anim in @($slidePlan.animations)) {{
    $shape = $slide.Shapes.Item([string]$anim.shape)
    $effectName = [string]$anim.effect
    $triggerName = [string]$anim.trigger
    if (-not $effectMap.ContainsKey($effectName)) {{ throw "Unsupported animation: $effectName" }}
    if (-not $triggerMap.ContainsKey($triggerName)) {{ throw "Unsupported trigger: $triggerName" }}
    $effect = $slide.TimeLine.MainSequence.AddEffect($shape, $effectMap[$effectName], 0, $triggerMap[$triggerName])
    if ($null -ne $anim.duration) {{ $effect.Timing.Duration = [double]$anim.duration }}
    if ($null -ne $anim.delay) {{ $effect.Timing.TriggerDelayTime = [double]$anim.delay }}
  }}
}}
$presentation.SaveAs('{_psq(output)}')
$presentation.Close()
$ppt.Quit()
'''
