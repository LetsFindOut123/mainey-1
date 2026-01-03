$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

# Ensure bootstrapped
& (Join-Path $RepoRoot "scripts\mainey_agent_bootstrap.ps1")

$AgentDir = Join-Path $RepoRoot "mainey-agent"
$VenvPython = Join-Path $AgentDir ".venv\Scripts\python.exe"

param(
  [Parameter(Position = 0)]
  [string] $Mode = "task",

  [Parameter(Position = 1)]
  [string] $Value = ""
)

if ($Mode -eq "--weweb") {
  $desc = $Value
  if (-not $desc -and -not [Console]::IsInputRedirected) {
    $desc = Read-Host "WeWeb snippet description"
  }
  if (-not $desc) { throw "Missing WeWeb snippet description." }
  & $VenvPython (Join-Path $AgentDir "main.py") "anything" --weweb $desc
  exit $LASTEXITCODE
}

if ($Mode -eq "--smoke") {
  & $VenvPython (Join-Path $AgentDir "main.py") "smoke:test" --no-emit-patch
  exit $LASTEXITCODE
}

# If called as: .\mainey_agent_run.ps1 "Do something" (without explicit mode),
# treat $Mode as the start of the task string.
$task = ""
if ($Mode -eq "task") {
  $task = $Value
} elseif ($Mode -ne "") {
  $task = $Mode
  if ($Value) { $task = "$task $Value" }
}

if (-not $task -and -not [Console]::IsInputRedirected) {
  $task = Read-Host "Task"
}
if (-not $task) { throw "Missing task string." }

& $VenvPython (Join-Path $AgentDir "main.py") $task
exit $LASTEXITCODE

