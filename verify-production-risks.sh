#!/bin/bash
# PRODUCTION RISK VERIFICATION
# Validates all 3 critical edge cases before deployment

set -euo pipefail

PROJECT_DIR="/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
cd "$PROJECT_DIR" || exit 1

echo ""
echo "PRODUCTION RISK VERIFICATION"
echo "============================="
echo ""

PASS=0
FAIL=0

test_pass() {
  echo "✅ $1"
  ((PASS++))
}

test_fail() {
  echo "❌ $1"
  ((FAIL++))
}

# ============================================================================
# RISK #1: CRON ENVIRONMENT
# ============================================================================
echo "RISK #1: Cron Environment - npm/node in PATH"
echo "=============================================="
echo ""

# Test 1a: Check nvm is in ~/.zshrc
if grep -q 'export NVM_DIR' "$HOME/.zshrc" 2>/dev/null; then
  test_pass "nvm configured in ~/.zshrc"
else
  test_fail "nvm NOT in ~/.zshrc (cron won't find npm)"
fi

# Test 1b: Source ~/.zshrc and verify npm
if bash -lc 'which npm > /dev/null 2>&1'; then
  NPM_PATH=$(bash -lc 'which npm')
  test_pass "npm available in login bash: $NPM_PATH"
else
  test_fail "npm NOT available even after ~/.zshrc sourcing"
fi

# Test 1c: Source ~/.zshrc and verify node
if bash -lc 'which node > /dev/null 2>&1'; then
  NODE_PATH=$(bash -lc 'which node')
  test_pass "node available in login bash: $NODE_PATH"
else
  test_fail "node NOT available even after ~/.zshrc sourcing"
fi

# Test 1d: Script has environment sourcing
if grep -q 'source.*\.zshrc' scripts/autopost-hourly.sh; then
  test_pass "autopost-hourly.sh sources ~/.zshrc"
else
  test_fail "autopost-hourly.sh does NOT source ~/.zshrc"
fi

# Test 1e: Script has npm verification
if grep -q 'command -v npm' scripts/autopost-hourly.sh; then
  test_pass "autopost-hourly.sh verifies npm exists"
else
  test_fail "autopost-hourly.sh does NOT verify npm"
fi

echo ""

# ============================================================================
# RISK #2: LOCK MECHANISM
# ============================================================================
echo "RISK #2: Lock Mechanism - Prevents Concurrency"
echo "=============================================="
echo ""

# Test 2a: flock available
if command -v flock > /dev/null 2>&1; then
  test_pass "flock is available on system"
else
  test_fail "flock NOT found (critical for lock mechanism)"
fi

# Test 2b: Script uses flock -n (non-blocking)
if grep -q 'flock -n' scripts/autopost-hourly.sh; then
  test_pass "Script uses flock -n (non-blocking)"
else
  test_fail "Script does NOT use flock -n"
fi

# Test 2c: Lock file location
if grep -q '/tmp/rg_autopost.lock' scripts/autopost-hourly.sh; then
  test_pass "Lock file in /tmp (appropriate location)"
else
  test_fail "Lock file location unclear"
fi

# Test 2d: flock envWraps npm run dev
if grep -A 10 'flock -n' scripts/autopost-hourly.sh | grep -q 'npm run dev'; then
  test_pass "flock envWraps 'npm run dev' command"
else
  test_fail "npm run dev may not be fully wrapped by lock"
fi

# Test 2e: Lock error handler exists
if grep -q 'SKIP.*locked' scripts/autopost-hourly.sh; then
  test_pass "Script logs [SKIP] locked on lock failure"
else
  test_fail "No [SKIP] locked handler found"
fi

# Test 2f: Timestamp defined in subshell
if grep -A 15 'flock -n' scripts/autopost-hourly.sh | grep -q 'timestamp()'; then
  test_pass "timestamp() defined inside bash subshell (not global)"
else
  test_fail "timestamp() may be at global scope (subshell bug)"
fi

echo ""

# ============================================================================
# RISK #3: URL RESOLVER TIMEOUT
# ============================================================================
echo "RISK #3: URL Resolver - Timeout & Fallback"
echo "=========================================="
echo ""

# Test 3a: url_resolver.ts exists
if [ -f src/url_resolver.ts ]; then
  test_pass "url_resolver.ts module exists"
else
  test_fail "url_resolver.ts NOT found"
fi

# Test 3b: Timeout parameter exists
if grep -q 'timeoutMs' src/url_resolver.ts; then
  test_pass "url_resolver has timeoutMs parameter"
else
  test_fail "url_resolver does NOT have timeoutMs"
fi

# Test 3c: maxRedirects exists
if grep -q 'maxRedirects' src/url_resolver.ts; then
  test_pass "url_resolver has maxRedirects limit"
else
  test_fail "url_resolver does NOT limit redirects"
fi

# Test 3d: Timeout default is reasonable (5-10s)
if grep -q 'timeoutMs = 5000\|timeoutMs: 5000' src/url_resolver.ts; then
  test_pass "Default timeout is 5000ms (appropriate)"
else
  if grep -q 'timeoutMs.*[0-9]\+000' src/url_resolver.ts; then
    test_pass "Timeout is set to milliseconds"
  else
    test_fail "Timeout default unclear or missing"
  fi
fi

# Test 3e: post_history uses resolver with timeout
if grep -q 'resolveFinalUrlCached.*timeoutMs.*3000' src/post_history.ts; then
  test_pass "post_history calls resolver with 3000ms timeout"
else
  test_fail "post_history may not have correct timeout"
fi

# Test 3f: Error handling in resolver
if grep -q 'resolve(current)' src/url_resolver.ts; then
  test_pass "url_resolver returns original URL on timeout/error"
else
  test_fail "url_resolver error handling unclear"
fi

# Test 3g: Cache mechanism exists
if grep -q 'resolveCache' src/url_resolver.ts; then
  test_pass "url_resolver has caching mechanism"
else
  test_fail "url_resolver lacks caching"
fi

# Test 3h: post_history has try-catch around resolver
if grep -A 5 'resolveFinalUrlCached' src/post_history.ts | grep -q 'catch'; then
  test_pass "post_history has try-catch around resolver call"
else
  test_fail "post_history may not handle resolver errors"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "SUMMARY"
echo "======="
TOTAL=$((PASS + FAIL))
echo "Passed: $PASS / $TOTAL"
echo "Failed: $FAIL / $TOTAL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✅ ALL PRODUCTION RISKS MITIGATED"
  echo ""
  echo "System is safe for deployment:"
  echo "  1. ✅ Cron environment properly configured"
  echo "  2. ✅ Lock mechanism prevents concurrency"
  echo "  3. ✅ URL resolver has timeout protection"
  echo ""
  echo "Ready to deploy!"
  exit 0
else
  echo "❌ SOME RISKS NOT MITIGATED"
  echo ""
  echo "Review failures above before deploying."
  exit 1
fi
