$ErrorActionPreference = "Stop"

# ===== CONFIG =====
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "autopost-hourly.log"

$SleepSeconds = 3600
$RetryMax = 3
$RetrySleep = 120

# Flags de tu sistema
$env:X_LIVE = "1"
$env:IMAGE_LIVE = "1"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function TS { (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") }

function Log($msg) {
  $line = "[{0}] {1}" -f (TS), $msg
  $line | Tee-Object -FilePath $LogFile -Append
}

Set-Location $ProjectRoot

Log "[START] Real Geopolitik Autopost Hourly Loop started (root=$ProjectRoot)"
Log "[CONFIG] X_LIVE=$env:X_LIVE IMAGE_LIVE=$env:IMAGE_LIVE RETRY_MAX=$RetryMax"

$cycle = 0
while ($true) {
  $cycle++
  Log "[CYCLE] === Cycle #$cycle ==="

  $success = $false
  for ($attempt=1; $attempt -le $RetryMax; $attempt++) {
    try {
      Log "[RUN] Attempt $attempt/$RetryMax"
      & npm run dev -- --live 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Null
      Log "[SUCCESS] Autopost cycle completed successfully"
      $success = $true
      break
    } catch {
      Log "[ERROR] Cycle failed on attempt $attempt. Retrying in ${RetrySleep}s..."
      Start-Sleep -Seconds $RetrySleep
    }
  }

  if (-not $success) {
    Log "[FAIL] Cycle #$cycle failed after $RetryMax attempts. Waiting ${SleepSeconds}s to next cycle."
  }

  Log "[CYCLE] Waiting ${SleepSeconds}s until next cycle..."
  Start-Sleep -Seconds $SleepSeconds
}
