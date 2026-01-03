$ErrorActionPreference = "Stop"

function Write-InstallHelp {
  Write-Host "ERROR: python3 is not installed or not on PATH." -ForegroundColor Red
  Write-Host ""
  Write-Host "Install instructions:"
  Write-Host "- Windows: install Python 3 from python.org (ensure 'Add python to PATH' is checked)."
  Write-Host "- macOS (Homebrew): brew install python"
  Write-Host "- Ubuntu/Debian: sudo apt update && sudo apt install -y python3 python3-venv python3-pip"
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

$AgentDir = Join-Path $RepoRoot "mainey-agent"
$VenvDir = Join-Path $AgentDir ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$Requirements = Join-Path $AgentDir "requirements.txt"
$EnvFile = Join-Path $AgentDir ".env"

$py = Get-Command python3 -ErrorAction SilentlyContinue
if (-not $py) {
  Write-InstallHelp
  exit 1
}

try {
  & python3 -c "import venv, ensurepip" | Out-Null
} catch {
  Write-Host "ERROR: python3 is present, but virtualenv support (venv/ensurepip) is missing." -ForegroundColor Red
  Write-Host ""
  Write-Host "Install instructions:"
  Write-Host "- Windows: reinstall Python 3 from python.org and ensure pip is included."
  Write-Host "- Ubuntu/Debian: sudo apt update && sudo apt install -y python3-venv python3-pip"
  exit 1
}

if (-not (Test-Path $AgentDir)) { throw "Expected directory not found: $AgentDir" }
if (-not (Test-Path $Requirements)) { throw "Expected requirements file not found: $Requirements" }

if (-not (Test-Path $VenvDir)) {
  & python3 -m venv $VenvDir | Out-Null
}

try {
  & $VenvPython -m pip install --upgrade pip | Out-Null
} catch {
  # Fallback for environments where pip metadata is incomplete.
  try { & $VenvPython -m ensurepip --upgrade | Out-Null } catch {}
  try { & $VenvPython -m pip install --force-reinstall --no-deps "pip==24.0" | Out-Null } catch {}
}
& $VenvPython -m pip install -r $Requirements | Out-Null

function New-EnvFile {
  $roleDefault = if ($env:MAINEY_AGENT_ROLE) { $env:MAINEY_AGENT_ROLE } else { "developer" }
  $xanoBaseDefault = if ($env:XANO_BASE_URL) { $env:XANO_BASE_URL } else { "" }
  $xanoKeyDefault = if ($env:XANO_API_KEY) { $env:XANO_API_KEY } else { "" }
  $openaiKeyDefault = if ($env:OPENAI_API_KEY) { $env:OPENAI_API_KEY } else { "" }

  $role = $roleDefault
  $xanoBase = $xanoBaseDefault
  $xanoKey = $xanoKeyDefault
  $openaiKey = $openaiKeyDefault

  $interactive = -not [Console]::IsInputRedirected
  if ($interactive) {
    Write-Host ""
    Write-Host "Mainey Agent env setup (creates mainey-agent\.env). Leave blank to skip optional values."
    $in = Read-Host "ROLE [$roleDefault]"
    if ($in) { $role = $in }

    $in = Read-Host "XANO_BASE_URL (optional) [$xanoBaseDefault]"
    if ($in) { $xanoBase = $in }

    $in = Read-Host "XANO_API_KEY (optional) [$([string]::IsNullOrEmpty($xanoKeyDefault) ? "" : "(set)") ]"
    if ($in) { $xanoKey = $in }

    $in = Read-Host "OPENAI_API_KEY (optional) [$([string]::IsNullOrEmpty($openaiKeyDefault) ? "" : "(set)") ]"
    if ($in) { $openaiKey = $in }
  }

  $lines = @()
  $lines += "MAINEY_AGENT_ROLE=$role"
  if ($xanoBase) { $lines += "XANO_BASE_URL=$xanoBase" }
  if ($xanoKey) { $lines += "XANO_API_KEY=$xanoKey" }
  if ($openaiKey) { $lines += "OPENAI_API_KEY=$openaiKey" }

  Set-Content -Path $EnvFile -Value ($lines -join "`n") -Encoding UTF8
  Write-Host "Wrote $EnvFile (secrets are gitignored)."
}

if (-not (Test-Path $EnvFile)) {
  New-EnvFile
}

Write-Host "Bootstrap complete."

