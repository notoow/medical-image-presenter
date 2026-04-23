$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$toolsDir = Join-Path $PSScriptRoot ".tools"
$gitRoot = Join-Path $toolsDir "git"
$tmpDir = Join-Path $toolsDir "tmp-git"

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

if (Test-Path (Join-Path $gitRoot "cmd\git.exe")) {
  Write-Host "Portable Git is already installed."
  & (Join-Path $gitRoot "cmd\git.exe") --version
  exit 0
}

Write-Host "Finding latest Git for Windows portable release..."
$release = Invoke-RestMethod "https://api.github.com/repos/git-for-windows/git/releases/latest"
$asset = $release.assets |
  Where-Object { $_.name -match "^PortableGit-.*-64-bit\.7z\.exe$" } |
  Select-Object -First 1

if (-not $asset) {
  throw "Could not find a 64-bit PortableGit asset in the latest release."
}

$installerPath = Join-Path $toolsDir $asset.name

Write-Host "Downloading $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerPath

if (Test-Path $tmpDir) {
  Remove-Item -LiteralPath $tmpDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

Write-Host "Extracting Portable Git..."
& $installerPath -y "-o$tmpDir" | Out-Null

if (Test-Path $gitRoot) {
  Remove-Item -LiteralPath $gitRoot -Recurse -Force
}

Move-Item -LiteralPath $tmpDir -Destination $gitRoot
Remove-Item -LiteralPath $installerPath -Force

Write-Host "Git version:"
& (Join-Path $gitRoot "cmd\git.exe") --version

Write-Host "Install complete. Use .\git.ps1 for project-local git commands."
