#!/bin/bash
# Production-grade autopost hourly loop with cron hardening

set -euo pipefail

# ===== ENVIRONMENT SETUP =====
# Absolute paths (cron doesn't guarantee cwd)
PROJECT_ROOT="/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
cd "$PROJECT_ROOT" || exit 1

# Explicit PATH for cron (hardened - doesn't depend on ~/.zshrc)
# Includes standard macOS paths and nvm installation paths
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.nvm/versions/node/*/bin"
export NODE_ENV="production"
export X_LIVE=1
export IMAGE_LIVE=1

# Verify critical dependencies exist (explicit checks, not sourcing)
NODE_BIN=$(command -v node 2>/dev/null || echo "")
NPM_BIN=$(command -v npm 2>/dev/null || echo "")

mkdir -p logs data

if [ -z "$NPM_BIN" ] || [ -z "$NODE_BIN" ]; then
  STAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$STAMP] [ERROR] node or npm not found in PATH: $PATH" >> logs/autopost-hourly.log
  exit 1
fi

mkdir -p logs data

LOG_FILE="logs/autopost-hourly.log"
LOCK_FILE="/tmp/rg_autopost.lock"

# Non-blocking lock: si ya está corriendo otro ciclo, SKIP
if ! command -v flock >/dev/null 2>&1; then
  STAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$STAMP] [WARN] flock not found; running WITHOUT lock" >> "$LOG_FILE"
  if X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live >> "$LOG_FILE" 2>&1; then
    STAMP=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$STAMP] [SUCCESS] cycle executed" >> "$LOG_FILE"
  else
    STAMP=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$STAMP] [ERROR] cycle failed" >> "$LOG_FILE"
  fi
  exit 0
fi

flock -n "$LOCK_FILE" bash -c '
  set -euo pipefail
  mkdir -p logs data
  LOG_FILE="logs/autopost-hourly.log"
  
  # Define timestamp INSIDE subshell (critical)
  timestamp() { date +"%Y-%m-%d %H:%M:%S"; }
  
  echo "[$(timestamp)] [CYCLE] start" >> "$LOG_FILE"
  
  if X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live >> "$LOG_FILE" 2>&1; then
    echo "[$(timestamp)] [SUCCESS] cycle executed" >> "$LOG_FILE"
  else
    echo "[$(timestamp)] [ERROR] cycle failed" >> "$LOG_FILE"
  fi
' || {
  STAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$STAMP] [SKIP] locked (another run in progress)" >> "$LOG_FILE"
  exit 0
}
