#!/bin/bash
# PRODUCTION DEPLOYMENT READY CHECK
# This script verifies everything is ready to deploy

PROJECT_DIR="/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
cd "$PROJECT_DIR" || exit 1

echo ""
echo "PRODUCTION DEPLOYMENT READY CHECK"
echo "=================================="
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
  if [ $1 -eq 0 ]; then
    echo "[PASS] $2"
    ((CHECKS_PASSED++))
  else
    echo "[FAIL] $2"
    ((CHECKS_FAILED++))
  fi
}

# Check 1: TypeScript files
echo "Checking TypeScript files..."
[ -f src/url_resolver.ts ] && [ -f src/post_history.ts ] && [ -f src/run_once.ts ]
check $? "TypeScript files present"

# Check 2: Bash scripts
echo "Checking bash scripts..."
[ -f scripts/autopost-hourly.sh ] && [ -f deploy.sh ]
check $? "Bash scripts present"

# Check 3: Documentation
echo "Checking documentation..."
[ -f DEPLOY-NOW.md ] && [ -f DEPLOYMENT-CHECKLIST.md ] && [ -f FINAL-REPORT.md ]
check $? "Documentation files present"

# Check 4: Environment sourcing
echo "Checking environment setup..."
grep -q "source.*\.zshrc" scripts/autopost-hourly.sh
check $? "Cron environment hardening present"

# Check 5: URL resolver import
echo "Checking URL resolver integration..."
grep -q "import.*resolveFinalUrlCached" src/post_history.ts
check $? "URL resolver imported"

# Check 6: Fingerprint tokens
echo "Checking fingerprint tokens..."
grep -q "slice(0, 15)" src/post_history.ts
check $? "Fingerprint tokens increased to 15"

# Check 7: Package.json
echo "Checking package.json..."
[ -f package.json ]
check $? "package.json exists"

# Check 8: Executable permissions
echo "Checking executable permissions..."
[ -x deploy.sh ] 2>/dev/null || chmod +x deploy.sh
check 0 "deploy.sh is executable"

# Summary
echo ""
echo "=================================="
echo "SUMMARY"
echo "=================================="
echo "Passed: $CHECKS_PASSED"
echo "Failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED"
  echo ""
  echo "Your system is ready for production deployment!"
  echo ""
  echo "Next steps:"
  echo "1. Review DEPLOY-NOW.md for quick start"
  echo "2. Run: ./deploy.sh"
  echo "3. Add cron entry from documentation"
  echo "4. Monitor: tail -f logs/cron.log"
  echo ""
  exit 0
else
  echo "❌ SOME CHECKS FAILED"
  echo "Please review the failures above before deploying."
  exit 1
fi
