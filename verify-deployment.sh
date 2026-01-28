#!/bin/bash
# Quick deployment verification script

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 DEPLOYMENT VERIFICATION CHECKLIST"
echo "===================================="
echo ""

# 1. Files exist
echo "✓ Checking files..."
[ -f "src/post_history.ts" ] && echo "  ✅ src/post_history.ts" || echo "  ❌ src/post_history.ts MISSING"
[ -f "src/geo_gate.ts" ] && echo "  ✅ src/geo_gate.ts" || echo "  ❌ src/geo_gate.ts MISSING"
[ -f "src/run_once.ts" ] && echo "  ✅ src/run_once.ts" || echo "  ❌ src/run_once.ts MISSING"
[ -f "scripts/autopost-hourly.sh" ] && echo "  ✅ scripts/autopost-hourly.sh" || echo "  ❌ scripts/autopost-hourly.sh MISSING"
echo ""

# 2. Bash syntax
echo "✓ Checking bash syntax..."
if bash -n scripts/autopost-hourly.sh 2>/dev/null; then
  echo "  ✅ scripts/autopost-hourly.sh syntax OK"
else
  echo "  ❌ scripts/autopost-hourly.sh syntax FAILED"
fi
echo ""

# 3. TypeScript imports
echo "✓ Checking TypeScript imports..."
if grep -q "import { geoGate" src/run_once.ts; then
  echo "  ✅ geoGate imported"
else
  echo "  ❌ geoGate NOT imported"
fi

if grep -q "import { hasRecentDuplicate, recordPosted" src/run_once.ts; then
  echo "  ✅ post_history functions imported"
else
  echo "  ❌ post_history functions NOT imported"
fi
echo ""

# 4. Key functions present
echo "✓ Checking key functions..."
if grep -q "async function pickFirstNotDuplicate" src/run_once.ts; then
  echo "  ✅ pickFirstNotDuplicate is async"
else
  echo "  ❌ pickFirstNotDuplicate NOT async"
fi

if grep -q "await recordPosted" src/run_once.ts; then
  echo "  ✅ recordPosted called with await"
else
  echo "  ❌ recordPosted NOT awaited"
fi

if grep -q "await hasRecentDuplicate" src/run_once.ts; then
  echo "  ✅ hasRecentDuplicate called with await"
else
  echo "  ❌ hasRecentDuplicate NOT awaited"
fi
echo ""

# 5. GeoGate function exists
echo "✓ Checking geo_gate.ts..."
if grep -q "export function geoGate" src/geo_gate.ts; then
  echo "  ✅ geoGate function exported"
else
  echo "  ❌ geoGate function NOT exported"
fi

if grep -q '"US"\|"LATAM"\|"MIDDLE_EAST"' src/geo_gate.ts; then
  echo "  ✅ Region whitelist present"
else
  echo "  ❌ Region whitelist NOT found"
fi
echo ""

# 6. Directories
echo "✓ Checking directories..."
mkdir -p data logs
echo "  ✅ data/ directory created"
echo "  ✅ logs/ directory created"
echo ""

# 7. Summary
echo "===================================="
echo "✅ VERIFICATION COMPLETE!"
echo ""
echo "Next steps:"
echo "  1. npm run dev (test safe mode)"
echo "  2. X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live (test live)"
echo "  3. cat data/posted.json (verify history file)"
echo "  4. Schedule: 0 * * * * cd $PROJECT_ROOT && ./scripts/autopost-hourly.sh"
echo ""
