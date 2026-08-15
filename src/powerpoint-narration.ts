import path from "node:path";

function ps(value: string): string { return value.replace(/'/g, "''"); }

export interface SlideTiming { slide: number; start: number; end: number }

export function powerpointNarrationScript(inputPptx: string, audioMaster: string, timings: SlideTiming[], outputPptx: string, outputPpsx: string): string {
  if (timings.length === 0) throw new Error("At least one slide timing is required");
  const timingJson = JSON.stringify(timings).replace(/'/g, "''");
  return `$ErrorActionPreference = 'Stop'
$timings = '${timingJson}' | ConvertFrom-Json
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $true
$presentation = $ppt.Presentations.Open('${ps(path.resolve(inputPptx))}', $false, $false, $false)
try {
  if ($presentation.Slides.Count -ne $timings.Count) { throw 'Slide timing count does not match the presentation' }
  $first = $presentation.Slides.Item(1)
  $audio = $first.Shapes.AddMediaObject2('${ps(path.resolve(audioMaster))}', $false, $true, -100, -100, 1, 1)
  $audio.Name = 'NDS Continuous Narration Master'
  $play = $audio.AnimationSettings.PlaySettings
  $play.PlayOnEntry = $true
  $play.HideWhileNotPlaying = $true
  $play.PauseAnimation = $false
  $play.StopAfterSlides = $presentation.Slides.Count
  foreach ($timing in $timings) {
    $slide = $presentation.Slides.Item([int]$timing.slide)
    $slide.SlideShowTransition.AdvanceOnTime = $true
    $slide.SlideShowTransition.AdvanceTime = [double]($timing.end - $timing.start)
  }
  $presentation.SaveAs('${ps(path.resolve(outputPptx))}', 24)
  $presentation.SaveCopyAs('${ps(path.resolve(outputPpsx))}', 28)
} finally {
  $presentation.Close()
  $ppt.Quit()
}
`;
}
