[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Install-WingetPackage {
    param(
        [Parameter(Mandatory)] [string] $Id,
        [switch] $Optional
    )
    Write-Host "Installing/verifying $Id"
    & winget install --id $Id --exact --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        if ($Optional) {
            Write-Warning "Optional package $Id could not be installed."
            return
        }
        throw "winget failed for required package $Id (exit $LASTEXITCODE)"
    }
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'winget is required. Install Microsoft App Installer first.'
}

$requiredPackages = @(
    'OpenJS.NodeJS.LTS',
    'astral-sh.uv',
    'yt-dlp.yt-dlp',
    'Gyan.FFmpeg',
    'jqlang.jq',
    'TheDocumentFoundation.LibreOffice',
    'oschwartz10612.Poppler'
)
$recommendedPackages = @(
    'ChrisBagwell.SoX',
    'MediaArea.MediaInfo',
    'OliverBetz.ExifTool',
    'UB-Mannheim.TesseractOCR',
    'ImageMagick.ImageMagick',
    'MoritzBunkus.MKVToolNix',
    'GoLang.Go'
)

foreach ($package in $requiredPackages) { Install-WingetPackage -Id $package }
foreach ($package in $recommendedPackages) { Install-WingetPackage -Id $package -Optional }

$pathAdditions = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links",
    "$env:ProgramFiles\nodejs",
    "$env:ProgramFiles\LibreOffice\program",
    "$env:ProgramFiles\Tesseract-OCR",
    "$HOME\.local\bin"
)
foreach ($entry in $pathAdditions) {
    if ((Test-Path $entry) -and ($env:Path -notlike "*$entry*")) {
        $env:Path = "$entry;$env:Path"
    }
}

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    throw 'uv was installed but is not visible yet. Open a new PowerShell and rerun this script.'
}

& uv python install 3.11
if ($LASTEXITCODE -ne 0) { throw 'uv could not install Python 3.11' }
& uv venv --python 3.11 .venv
if ($LASTEXITCODE -ne 0) { throw 'uv could not create .venv' }
& uv pip sync --python .venv\Scripts\python.exe requirements-media.lock
if ($LASTEXITCODE -ne 0) { throw 'Locked Python media stack installation failed' }

if (Get-Command go -ErrorAction SilentlyContinue) {
    New-Item -ItemType Directory -Force "$HOME\.local\bin" | Out-Null
    $env:GOBIN = "$HOME\.local\bin"
    & go install github.com/steipete/songsee/cmd/songsee@v0.1.1
    if ($LASTEXITCODE -ne 0) { throw 'Pinned Songsee installation failed' }
} else {
    Write-Warning 'Go is not visible yet; reopen PowerShell and rerun to install Songsee.'
}

$mfaPrefix = "$HOME\.local\share\narrated-demo-toolkit\mfa"
if (Get-Command micromamba -ErrorAction SilentlyContinue) {
    if (Test-Path "$mfaPrefix\Scripts\mfa.exe") {
        & micromamba install -y -p $mfaPrefix -c conda-forge 'montreal-forced-aligner=3.4.1'
    } else {
        & micromamba create -y -p $mfaPrefix -c conda-forge 'montreal-forced-aligner=3.4.1'
    }
    if ($LASTEXITCODE -ne 0) { throw 'Pinned MFA installation failed' }
} else {
    Write-Warning 'Optional MFA was skipped because micromamba is not installed.'
}

& node scripts/toolchain.mjs
if ($LASTEXITCODE -ne 0) {
    throw 'Required dependency verification failed. Reopen PowerShell if winget changed PATH, then run npm run doctor.'
}
