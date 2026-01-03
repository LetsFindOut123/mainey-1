$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js is not installed or not on PATH." -ForegroundColor Red
  Write-Host "Install Node 18+ from https://nodejs.org/ (or via your OS package manager)."
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: npm is not installed or not on PATH." -ForegroundColor Red
  Write-Host "Install Node 18+ from https://nodejs.org/ (npm is included)."
  exit 1
}

if (-not (Test-Path (Join-Path $RepoRoot "node_modules"))) {
  & npm install
}

if (Test-Path (Join-Path $RepoRoot ".next")) {
  Remove-Item -Recurse -Force (Join-Path $RepoRoot ".next")
}

& npm run build
exit $LASTEXITCODE

