$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Join-Path $workspaceRoot ".runtime"

foreach ($name in @("backend", "frontend")) {
  $pidPath = Join-Path $runtimeDir "$name.pid"

  if (-not (Test-Path $pidPath)) {
    Write-Host "No PID file found for $name."
    continue
  }

  $pidValue = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1

  if (-not $pidValue) {
    Write-Host "PID file for $name is empty."
    continue
  }

  $process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue

  if ($process) {
    Stop-Process -Id $process.Id -Force
    Write-Host "Stopped $name (PID $($process.Id))."
  } else {
    Write-Host "$name process is no longer running."
  }

  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}
