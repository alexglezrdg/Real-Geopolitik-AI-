# 🚀 DEPLOYMENT - EXACT COMMANDS

All 3 production risks verified. Ready to deploy.

---

## STEP 1: Final Pre-Deployment Check

```bash
cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"

# Verify TypeScript
npx tsc --noEmit
# Expected: (no output, 0 errors)

# Verify bash syntax
bash -n scripts/autopost-hourly.sh
# Expected: (no output = valid)

# Verify npm in cron environment
bash -lc 'which npm && which node'
# Expected: 
#   /usr/local/bin/npm
#   /usr/local/bin/node
```

---

## STEP 2: Run Automated Deployment Script

```bash
./deploy.sh
```

This will:
1. ✅ Verify environment
2. ✅ Compile TypeScript
3. ✅ Create directories
4. ✅ Show you the cron entry

---

## STEP 3: Add Cron Entry

```bash
crontab -e
```

**Paste this line:**
```cron
0 * * * * /usr/bin/env bash -lc 'source ~/.zshrc && cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost" && ./scripts/autopost-hourly.sh' >> logs/cron.log 2>&1
```

**Save and exit:**
- Nano: `Ctrl+O`, `Enter`, `Ctrl+X`
- Vim: `:wq`

**Verify it was added:**
```bash
crontab -l | grep autopost
```

Expected: The line you just added

---

## STEP 4: Monitor First Cycle (Manual Test)

```bash
# Run manually to see output
./scripts/autopost-hourly.sh

# Check logs
tail -20 logs/autopost-hourly.log
```

Expected output:
```
[2026-01-26 HH:MM:SS] [CYCLE] start
[2026-01-26 HH:MM:SS] ✅ Story picked: "..."
[2026-01-26 HH:MM:SS] ✅ Media uploaded
[2026-01-26 HH:MM:SS] ✅ Thread posted
[2026-01-26 HH:MM:SS] [SUCCESS] cycle executed
```

---

## STEP 5: Monitor Hourly Cron Execution

**Watch live (next hour):**
```bash
tail -f logs/cron.log
```

**Or check after 1 hour:**
```bash
grep "\[CYCLE\]\|\[SUCCESS\]\|\[SKIP\]" logs/cron.log | tail -5
```

Expected pattern:
```
[2026-01-26 14:00:00] [CYCLE] start        ← Hour 1
[2026-01-26 14:00:25] [SUCCESS] executed
[2026-01-26 15:00:00] [CYCLE] start        ← Hour 2
[2026-01-26 15:00:10] [SKIP] duplicate
```

---

## STEP 6: Verify Data Accumulation

```bash
# Check post history
cat data/posted.json | jq 'length'
# Should increase by 0-2 per hour (duplicates are filtered)

# View latest post
cat data/posted.json | jq '.[-1]'
# Should show: timestamp, title, source, url, url_hash, title_fp
```

---

## TROUBLESHOOTING

### "npm: command not found" in logs

```bash
# Check nvm in ~/.zshrc
cat ~/.zshrc | grep -i nvm

# Should output something like:
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# If empty, nvm not installed
brew install nvm
```

### "Cron job never runs"

```bash
# Verify cron is running
ps aux | grep cron

# Check crontab syntax
crontab -l

# Test the exact cron entry manually
/usr/bin/env bash -lc 'source ~/.zshrc && cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost" && ./scripts/autopost-hourly.sh'
```

### "Lock file stale"

```bash
# Check if process is stuck
ps aux | grep "npm run dev"

# If stuck, kill it
pkill -f "npm run dev"

# Clear lock
rm -f /tmp/rg_autopost.lock

# Try again
./scripts/autopost-hourly.sh
```

---

## MONITORING DASHBOARD (Optional)

Create a monitoring script:

```bash
#!/bin/bash
while true; do
  clear
  echo "=== AUTOPOST MONITORING ==="
  echo ""
  echo "Last 5 cycles:"
  grep "\[CYCLE\]" logs/cron.log | tail -5
  echo ""
  echo "Recent posts:"
  cat data/posted.json | jq '.[-3:] | map(.title[0:40])' 2>/dev/null || echo "No posts yet"
  echo ""
  echo "Errors (last 24h):"
  grep "\[ERROR\]" logs/cron.log | tail -3 || echo "No errors"
  echo ""
  sleep 60
done
```

Run it:
```bash
chmod +x monitor.sh
./monitor.sh
```

---

## QUICK REFERENCE

| Command | Purpose |
|---------|---------|
| `./deploy.sh` | Automated setup |
| `crontab -e` | Add cron entry |
| `crontab -l` | View cron entry |
| `tail -f logs/cron.log` | Watch live |
| `grep [SUCCESS] logs/cron.log` | Count successes |
| `cat data/posted.json \| jq length` | Count posts |
| `pkill -f "npm run dev"` | Emergency stop |
| `rm -f /tmp/rg_autopost.lock` | Clear stuck lock |

---

## EXPECTED RESULTS (48 Hours)

**Hour 0-24:**
- ~24 hourly cycles
- ~2-6 posts to X
- Minimal duplicates filtered

**Hour 24-48:**
- Same pattern
- System stable
- Ready for production use

---

## SUCCESS CRITERIA

✅ Cron executes every hour (check logs)
✅ Cycles complete in <60 seconds (no hang)
✅ Posts appear on X timeline
✅ No duplicate posts
✅ No npm/node errors
✅ Lock prevents concurrency
✅ URL redirects resolved correctly

If all ✅, **you're production-ready!**

---

**Status: 🟢 READY TO DEPLOY**

Execute commands above and monitor first 48 hours.

