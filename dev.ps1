$ErrorActionPreference = "Stop"

$nodeRoot = Join-Path $PSScriptRoot ".tools\node"
$nodeBin = Join-Path $nodeRoot "node.exe"
$npmCmd = Join-Path $nodeRoot "npm.cmd"

if (-not (Test-Path $nodeBin) -or -not (Test-Path $npmCmd)) {
  Write-Host "Portable Node/npm is not installed. Run .\install.ps1 first." -ForegroundColor Yellow
  exit 1
}

$env:Path = "$nodeRoot;$env:Path"
& $npmCmd run dev
