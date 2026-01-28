#!/bin/bash
# PRODUCTION VALIDATION TEST SUITE
# Tests all 5 bugs to verify fixes are working

set -euo pipefail

PROJECT_ROOT="/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
cd "$PROJECT_ROOT"

PASSED=0
FAILED=0

echo ""
echo "PRODUCTION VALIDATION TEST SUITE"
echo "All 5 Bugs - Verification Tests"
echo ""

# Helper functions
pass() {
  echo "[PASS] $1"
  ((PASSED++))
}

fail() {
  echo "[FAIL] $1"
  ((FAILED++))
}

warn() {
  echo "[WARN] $1"
}

info() {
  echo "[INFO] $1"
}

# ========================================
# BUG #1: Cron Environment Not Loading
# ========================================
echo ""
echo "TEST 1: Cron Environment Loading (Bug #1)"
echo "=========================================="

# Test 1.1: Check ~/.zshrc exists
if [ -f "$HOME/.zshrc" ]; then
  pass "~/.zshrc exists"
else
  fail "~/.zshrc not found (cron won't load nvm)"
fi

# Test 1.2: Check nvm is sourced in ~/.zshrc
if grep -q "nvm" "$HOME/.zshrc" 2>/dev/null; then
  pass "nvm sourced in ~/.zshrc"
else
  fail "nvm not found in ~/.zshrc"
fi

# Test 1.3: Check npm in PATH
if command -v npm >/dev/null 2>&1; then
  pass "npm available in PATH: $(which npm)"
else
  fail "npm not found in PATH"
fi

# Test 1.4: Check node in PATH
if command -v node >/dev/null 2>&1; then
  pass "node available in PATH: $(which node)"
else
  fail "node not found in PATH"
fi

# Test 1.5: Verify script sources ~/.zshrc
if grep -q 'source.*\.zshrc' scripts/autopost-hourly.sh; then
  pass "autopost-hourly.sh sources ~/.zshrc"
else
  fail "autopost-hourly.sh doesn't source ~/.zshrc"
fi

# Test 1.6: Verify script checks npm exists
if grep -q 'command -v npm' scripts/autopost-hourly.sh; then
  pass "autopost-hourly.sh checks npm existence"
else
  fail "autopost-hourly.sh doesn't verify npm"
fi

# ========================================
# BUG #2: Timestamp Function Scope
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Timestamp Function Scope (Bug #2)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 2.1: Verify timestamp() is NOT defined at global level
if grep -q '^timestamp()' scripts/autopost-hourly.sh; then
  fail "timestamp() defined at global level (scope bug)"
else
  pass "timestamp() not defined globally"
fi

# Test 2.2: Verify timestamp() IS defined inside bash -c
if grep -q 'bash -c.*timestamp()' scripts/autopost-hourly.sh; then
  pass "timestamp() defined inside bash -c subshell"
else
  warn "timestamp() definition not found in bash -c (check manually)"
fi

# Test 2.3: Test timestamp function works
TEST_TS=$(bash -c 'timestamp() { date +"%Y-%m-%d %H:%M:%S"; }; timestamp')
if [[ $TEST_TS =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}:[0-9]{2}$ ]]; then
  pass "timestamp() function produces correct format: $TEST_TS"
else
  fail "timestamp() function broken: $TEST_TS"
fi

# Test 2.4: Verify fallback STAMP variable exists
if grep -q 'STAMP=' scripts/autopost-hourly.sh; then
  pass "Fallback STAMP variable defined"
else
  warn "No fallback STAMP variable"
fi

# ========================================
# BUG #3: Post History Safety
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Post History Safety (Bug #3)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 3.1: Check post_history.ts exists
if [ -f "src/post_history.ts" ]; then
  pass "post_history.ts exists"
else
  fail "post_history.ts not found"
fi

# Test 3.2: Verify recordPosted() function exists
if grep -q "export.*recordPosted" src/post_history.ts; then
  pass "recordPosted() function exported"
else
  fail "recordPosted() not found"
fi

# Test 3.3: Check run_once.ts calls recordPosted with await
if grep -q "await.*recordPosted" src/run_once.ts; then
  pass "run_once.ts awaits recordPosted()"
else
  fail "recordPosted() not awaited in run_once.ts"
fi

# Test 3.4: Verify post_history.json exists or initializes
if [ -f "data/posted.json" ]; then
  pass "Post history file exists: $(wc -l < data/posted.json) lines"
else
  warn "Post history file doesn't exist (will initialize on first run)"
fi

# ========================================
# BUG #4: URL Redirects Not Resolved
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: URL Redirect Resolution (Bug #4)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 4.1: Check url_resolver.ts exists
if [ -f "src/url_resolver.ts" ]; then
  pass "url_resolver.ts exists (NEW MODULE)"
else
  fail "url_resolver.ts not found (Bug #4 not fixed)"
fi

# Test 4.2: Verify resolveFinalUrl export
if grep -q "export.*resolveFinalUrl[^C]" src/url_resolver.ts; then
  pass "resolveFinalUrl() exported"
else
  fail "resolveFinalUrl() not exported"
fi

# Test 4.3: Verify resolveFinalUrlCached export
if grep -q "export.*resolveFinalUrlCached" src/url_resolver.ts; then
  pass "resolveFinalUrlCached() exported"
else
  fail "resolveFinalUrlCached() not exported"
fi

# Test 4.4: Check post_history.ts imports url_resolver
if grep -q "import.*resolveFinalUrlCached.*url_resolver" src/post_history.ts; then
  pass "post_history.ts imports resolveFinalUrlCached"
else
  fail "post_history.ts doesn't import url_resolver"
fi

# Test 4.5: Check hasRecentDuplicate() calls resolveFinalUrlCached
if grep -q "await.*resolveFinalUrlCached" src/post_history.ts; then
  pass "hasRecentDuplicate() calls resolveFinalUrlCached()"
else
  fail "hasRecentDuplicate() doesn't resolve URLs"
fi

# Test 4.6: Verify HTTP timeout is set
if grep -q "timeoutMs.*3000" src/post_history.ts; then
  pass "URL resolution timeout set to 3000ms"
else
  warn "URL resolution timeout not verified"
fi

# ========================================
# BUG #5: Fingerprint Collision
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Fingerprint Token Increase (Bug #5)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 5.1: Check titleFingerprint function exists
if grep -q "titleFingerprint" src/post_history.ts; then
  pass "titleFingerprint() function exists"
else
  fail "titleFingerprint() not found"
fi

# Test 5.2: Verify tokens slice is 15 (not 10)
if grep -q "slice(0, 15)" src/post_history.ts; then
  pass "Fingerprint tokens increased to 15"
  
  # Show the line for confirmation
  LINE=$(grep -n "slice(0, 15)" src/post_history.ts | head -1)
  info "Line: $LINE"
else
  if grep -q "slice(0, 10)" src/post_history.ts; then
    fail "Fingerprint tokens still at 10 (not increased to 15)"
  else
    warn "Could not verify fingerprint token count"
  fi
fi

# Test 5.3: Verify fingerprint uses SHA1
if grep -q "sha1(" src/post_history.ts || grep -q "createHash" src/post_history.ts; then
  pass "Fingerprint uses cryptographic hash"
else
  warn "Hash function not verified"
fi

# ========================================
# COMPILATION TESTS
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: TypeScript Compilation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npx tsc --noEmit 2>/dev/null; then
  pass "TypeScript compilation: 0 errors"
else
  fail "TypeScript compilation failed"
  npx tsc --noEmit || true
fi

# ========================================
# BASH SYNTAX TESTS
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: Bash Syntax Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if bash -n scripts/autopost-hourly.sh 2>/dev/null; then
  pass "scripts/autopost-hourly.sh: Valid bash syntax"
else
  fail "scripts/autopost-hourly.sh: Bash syntax error"
  bash -n scripts/autopost-hourly.sh || true
fi

if [ -f "deploy.sh" ] && bash -n deploy.sh 2>/dev/null; then
  pass "deploy.sh: Valid bash syntax"
else
  warn "deploy.sh not found or has syntax error"
fi

# ========================================
# FINAL SUMMARY
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FINAL RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL=$((PASSED + FAILED))

echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $FAILED${NC}"
else
  echo -e "${GREEN}Failed: $FAILED${NC}"
fi

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║           🟢 ALL TESTS PASSED - PRODUCTION READY               ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Next steps:"
  echo "1. Add cron entry:    crontab -e"
  echo "2. Monitor logs:      tail -f logs/autopost-hourly.log"
  echo "3. Verify posts:      cat data/posted.json | jq '.[-1]'"
  echo ""
  exit 0
else
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║         🔴 SOME TESTS FAILED - REVIEW NEEDED                   ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Review the failures above and run this script again after fixes."
  echo ""
  exit 1
fi
