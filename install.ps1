$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$nodeVersion = "v24.15.0"
$nodeFolder = "node-$nodeVersion-win-x64"
$toolsDir = Join-Path $PSScriptRoot ".tools"
$zipPath = Join-Path $toolsDir "$nodeFolder.zip"
$extractPath = Join-Path $toolsDir $nodeFolder
$nodeRoot = Join-Path $toolsDir "node"

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

if (-not (Test-Path (Join-Path $nodeRoot "npm.cmd"))) {
  $url = "https://nodejs.org/dist/$nodeVersion/$nodeFolder.zip"
  Write-Host "Downloading Node.js $nodeVersion..."
  Invoke-WebRequest -Uri $url -OutFile $zipPath

  if (Test-Path $extractPath) {
    Remove-Item -LiteralPath $extractPath -Recurse -Force
  }

  Write-Host "Extracting Node.js..."
  Expand-Archive -LiteralPath $zipPath -DestinationPath $toolsDir -Force

  if (Test-Path $nodeRoot) {
    Remove-Item -LiteralPath $nodeRoot -Recurse -Force
  }

  Move-Item -LiteralPath $extractPath -Destination $nodeRoot
}

$env:Path = "$nodeRoot;$env:Path"

Write-Host "Node version:"
& (Join-Path $nodeRoot "node.exe") --version

Write-Host "npm version:"
& (Join-Path $nodeRoot "npm.cmd") --version

Write-Host "Installing project dependencies..."
& (Join-Path $nodeRoot "npm.cmd") install

Write-Host "Install complete. Start the app with: .\dev.ps1"
