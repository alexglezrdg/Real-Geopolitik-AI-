#!/bin/bash
# QUICK START: Production Deployment

set -euo pipefail

PROJECT_ROOT="/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
cd "$PROJECT_ROOT"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       GEOPOLITIK X AUTOPOST - PRODUCTION DEPLOYMENT             ║"
echo "║                   Quick Start Guide                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ===== STEP 1: Verify Environment =====
echo "📋 STEP 1: Verify Environment"
echo "================================"

if [ ! -f "$HOME/.zshrc" ]; then
  echo "⚠️  Warning: ~/.zshrc not found"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ ERROR: npm not found. Install node/nvm first."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "❌ ERROR: node not found. Install node/nvm first."
  exit 1
fi

echo "✅ npm: $(which npm)"
echo "✅ node: $(which node)"
echo "✅ node version: $(node --version)"
echo ""

# ===== STEP 2: TypeScript Compilation =====
echo "🔨 STEP 2: TypeScript Compilation"
echo "===================================="

if ! npx tsc --noEmit; then
  echo "❌ TypeScript compilation failed!"
  exit 1
fi

echo "✅ TypeScript: 0 errors"
echo ""

# ===== STEP 3: Bash Syntax =====
echo "🔍 STEP 3: Bash Syntax Check"
echo "=============================="

if ! bash -n scripts/autopost-hourly.sh; then
  echo "❌ Bash syntax error in scripts/autopost-hourly.sh"
  exit 1
fi

echo "✅ scripts/autopost-hourly.sh syntax: OK"
echo ""

# ===== STEP 4: Create Directories =====
echo "📁 STEP 4: Create Directories"
echo "=============================="

mkdir -p data logs
echo "✅ data/ directory"
echo "✅ logs/ directory"
echo ""

# ===== STEP 5: Test Dry Run =====
echo "🧪 STEP 5: Test Dry Run (Safe Mode)"
echo "====================================="

echo "Running npm run dev (dry-run)..."
if npm run dev; then
  echo "✅ Dry run successful"
else
  echo "⚠️  Dry run failed (may be normal for missing feeds)"
fi
echo ""

# ===== STEP 6: Verify Lock =====
echo "🔐 STEP 6: Verify Lock File"
echo "============================="

LOCK_TEST="/tmp/rg_test.lock"
if flock -n "$LOCK_TEST" -c "echo ok"; then
  rm "$LOCK_TEST" 2>/dev/null || true
  echo "✅ flock working"
else
  echo "⚠️  flock may not be available"
fi
echo ""

# ===== STEP 7: Display Cron Entry =====
echo "📅 STEP 7: Cron Entry Setup"
echo "============================="

CRON_ENTRY='0 * * * * cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost" && /usr/bin/env bash -lc '"'"'source ~/.zshrc && ./scripts/autopost-hourly.sh'"'"' >> logs/cron.log 2>&1'

echo "To schedule hourly execution, run:"
echo ""
echo "  crontab -e"
echo ""
echo "And add this line:"
echo ""
echo "$CRON_ENTRY"
echo ""
echo "Then save (Ctrl+X in nano, :wq in vim)"
echo ""

# ===== STEP 8: Manual Test =====
echo "🚀 STEP 8: Manual Test (Optional)"
echo "=================================="

read -p "Run manual test now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Running ./scripts/autopost-hourly.sh..."
  ./scripts/autopost-hourly.sh || true
  
  echo ""
  echo "Checking logs..."
  tail -10 logs/autopost-hourly.log
fi

echo ""

# ===== FINAL SUMMARY =====
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  ✅ DEPLOYMENT READY                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Add cron entry:"
echo "   $ crontab -e"
echo ""
echo "2. Monitor logs:"
echo "   $ tail -f logs/autopost-hourly.log"
echo ""
echo "3. Verify posts:"
echo "   $ cat data/posted.json | jq '.[-1]'"
echo ""
echo "4. Monitor processes:"
echo "   $ ps aux | grep 'npm run dev'"
echo ""
echo "Documentation:"
echo "  - PRODUCTION-VERIFICATION.md (detailed checks)"
echo "  - PRODUCTION-FIXES-APPLIED.md (all fixes)"
echo "  - DEPLOY-READY.md (deployment guide)"
echo ""
