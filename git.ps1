$ErrorActionPreference = "Stop"

$gitRoot = Join-Path $PSScriptRoot ".tools\git"
$gitExe = Join-Path $gitRoot "cmd\git.exe"

if (-not (Test-Path $gitExe)) {
  Write-Host "Portable Git is not installed. Run .\install-git.ps1 first." -ForegroundColor Yellow
  exit 1
}

$env:Path = "$gitRoot\cmd;$gitRoot\usr\bin;$env:Path"
& $gitExe @args
