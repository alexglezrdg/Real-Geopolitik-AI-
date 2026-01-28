# 🚀 LIVE DEPLOYMENT GUIDE - Real Geopolitik X Autopost

**Status:** ✅ Production Ready (Media upload: requires X App permissions fix)

---

## Quick Start (1 Post Now)

### Single LIVE post with image:

```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

**Expected output:**
```
🔧 Mode: LIVE (explicit --live)
🤖 Automatic mode: picking trending story...
✅ Picked: "Story title..."
✅ Generated: mode="single" urgency="..."
🎨 Generating image...
✅ Image ready: out/images/news-{timestamp}.rg.png
✅ Media uploaded: {media_id}
✅ Thread posted successfully!
   View: https://x.com/i/status/{tweet_id}
```

---

## Hourly Automation (1 Post/Hour = 24/Day)

### macOS / Linux:

```bash
./scripts/autopost-hourly.sh
```

**What it does:**
- Runs indefinitely every 3600 seconds (1 hour)
- Auto-retries on failure (max 3 attempts, 120s delay)
- Logs timestamps to `logs/autopost-hourly.log`
- Graceful shutdown on Ctrl+C

### Windows PowerShell:

```powershell
.\scripts\autopost-hourly.ps1
```

**Run in background (Windows):**
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\scripts\autopost-hourly.ps1'"
```

---

## Daily Limit Configuration (20 Posts/Day)

✅ **Already configured to 20/day** in `.env`:

```env
MAX_POSTS_PER_DAY=20
```

### How it works:

1. System runs every 1 hour (3600s)
2. Each run attempts to post 1 story
3. **Stops posting** when daily count reaches 20
4. Resets counter at midnight (UTC)
5. Database deduplication prevents re-posting

### To change limit:

```env
MAX_POSTS_PER_DAY=30  # or any number
```

---

## 🖼️ Image Generation Pipeline

### Step 1: DALL-E 3 creates base image
- Prompt: Generated from `visual.headline`, `visual.subheadline`, etc.
- Size: 1024×1792 (9:16 mobile format)
- Quality: Natural, cinematographic style
- Time: ~10-15 seconds

### Step 2: Sharp overlays RG logo
- Source: `./assets/rg_logo.png`
- Placement: Corner/branded position
- Output: `out/images/news-{timestamp}.rg.png`

### Step 3: Upload to X Media API
- Endpoint: `https://upload.twitter.com/1.1/media/upload.json`
- Auth: OAuth 1.0a
- Returns: `media_id` for tweet attachment
- Time: ~2-3 seconds

### Step 4: Post tweet with media
- Attach `media_id` to first tweet only
- Fallback: text-only if media upload fails

---

## ⚠️ Media Upload 401 Error (Current Issue)

### Symptom:
```
❌ Media upload error: Media upload failed 401: 
{"errors":[{"message":"Could not authenticate you","code":32}]}
```

### Root cause:
Your X app doesn't have "Read and Write" permissions.

### Fix (5 minutes):

1. **Go to X Developer Portal:**
   - https://developer.twitter.com/en/portal/dashboard

2. **Select your app** (Real Geopolitik)

3. **Click "App Settings"**

4. **Find "User authentication settings"** section

5. **Change "App permissions" to:**
   - ✅ **Read and Write** (currently probably "Read only")

6. **Regenerate API Keys** (if prompted):
   - Get new Consumer Key/Secret
   - Get new Access Token/Secret
   - Update `.env` with new values

7. **Verify in logs:**
   ```
   ✅ Media uploaded: 1234567890
   ```

---

## Environment Variables

### Required for LIVE mode:

```env
# X API (OAuth 1.0a)
X_CONSUMER_KEY=your_consumer_key
X_CONSUMER_SECRET=your_consumer_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret

# Claude
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (for DALL-E image generation)
OPENAI_API_KEY=sk-proj-...

# System
MAX_POSTS_PER_DAY=20
IMAGE_LIVE=1
```

### Optional flags at runtime:

```bash
# Enable LIVE posting
X_LIVE=1

# Enable image generation
IMAGE_LIVE=1

# Force specific URL
--url "https://news.google.com/..."

# Dry-run mode (default, no posting)
# (omit X_LIVE and --live)
```

---

## Command Reference

### Dry-run (safe, no posting):
```bash
npm run dev
```

### LIVE text-only post:
```bash
X_LIVE=1 npm run dev -- --live
```

### LIVE with images:
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

### LIVE specific URL:
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live --url "https://..."
```

### Hourly loop (all posts):
```bash
./scripts/autopost-hourly.sh
```

### Background loop (nohup):
```bash
nohup ./scripts/autopost-hourly.sh > logs/autopost.log 2>&1 &
```

---

## File Structure

```
src/
├── run_once.ts          ← Main entry point, orchestrates flow
├── x.ts                 ← X API posting + media upload
├── openai_image.ts      ← DALL-E image generation + logo overlay
├── claude.ts            ← NewsPack generation (JSON)
├── news_picker.ts       ← Story selection + scoring
├── news_sources.ts      ← RSS feeds + keywords
├── rss.ts               ← Feed fetching
├── db.ts                ← SQLite dedup + daily limits
└── scheduler.ts         ← (optional cron tasks)

scripts/
├── autopost-hourly.sh   ← Bash automation loop
└── autopost-hourly.ps1  ← PowerShell automation loop

out/images/
└── news-{timestamp}.rg.png  ← Generated images

logs/
└── autopost-hourly.log  ← Hourly run logs
```

---

## Monitoring & Logging

### Real-time logs from hourly script:
```bash
tail -f logs/autopost-hourly.log
```

### Watch for these lines:

**✅ Success:**
```
[2026-01-25 21:15:08] [SUCCESS] Autopost cycle completed successfully
[2026-01-25 21:15:08] [CYCLE] Waiting 3600s until next cycle...
```

**⚠️ Retry:**
```
[2026-01-25 21:15:08] [ERROR] Cycle failed on attempt 1. Retrying in 120s...
[2026-01-25 21:16:08] [SUCCESS] Autopost cycle completed successfully (on attempt 2)
```

**❌ Failure after retries:**
```
[2026-01-25 21:15:08] [FAIL] Cycle #1 failed after 3 attempts. Waiting 3600s...
```

---

## Story Selection & Scoring

### Automatic picker (default):
1. Fetches all 11 RSS feeds
2. Filters by geopolitical keywords
3. Scores by:
   - **Recency** (+40 if < 2 hours)
   - **LatAm priority** (+30 if mentions Latin America)
   - **Urgency tags** (+15 if "guerra", "sanciones", etc.)
   - **Conflict signals** (+10 if geopolitical)
   - **Source reliability** (+5 bonus)

### Priority feeds:
- 🏆 **Google News - Cuba Trump** (priority 1)
- 🏆 **BBC Mundo** (priority 1)
- 🏆 **Reuters Americas** (priority 1)
- ⭐ **France 24 Español** (priority 1)
- ⭐ **Al Jazeera English** (priority 2)
- (+ 6 more global/regional feeds)

---

## FAQ

### Q: Can I post more than 20/day?
**A:** Yes, change `MAX_POSTS_PER_DAY=X` in `.env` and redeploy.

### Q: What if media upload fails?
**A:** Tweet still posts as text-only (fallback). Check X app permissions.

### Q: How do I post a specific URL?
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live --url "https://..."
```

### Q: Can I schedule posts for specific times?
**A:** Current system: every hour. For custom times, edit `scripts/autopost-hourly.sh` with conditional time checks.

### Q: How do I stop the hourly loop?
**A:** Press `Ctrl+C` in terminal. Graceful shutdown within 5 seconds.

### Q: How do I see what story was picked?
**A:** Check logs: `tail -f logs/autopost-hourly.log` or run single post in dry-run mode.

---

## Checklist Before Going LIVE (24/7)

- [ ] X API credentials are valid (can test with `npm run dev`)
- [ ] X app has **"Read and Write"** permissions
- [ ] `.env` has `MAX_POSTS_PER_DAY=20` (or your desired limit)
- [ ] `IMAGE_LIVE=1` is set
- [ ] OPENAI_API_KEY is valid
- [ ] ANTHROPIC_API_KEY is valid
- [ ] `./assets/rg_logo.png` exists
- [ ] `./logs/` directory exists or will be created
- [ ] First test post runs: `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live`
- [ ] Image generates without errors
- [ ] Tweet posts to X successfully
- [ ] Image appears on tweet (not just text)
- [ ] Start hourly loop: `./scripts/autopost-hourly.sh`
- [ ] Monitor logs for 24 hours

---

## Next Steps

1. **Fix X app permissions** (401 error)
   - Change to "Read and Write"
   - Regenerate tokens

2. **Test single LIVE post:**
   ```bash
   X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
   ```

3. **Verify image appears on tweet**

4. **Start hourly automation:**
   ```bash
   ./scripts/autopost-hourly.sh
   ```

5. **Monitor for 24 hours**
   ```bash
   tail -f logs/autopost-hourly.log
   ```

6. **Enjoy 20 geopolitical stories/day on X!** 🎉

---

**Version:** 1.0 (2026-01-25)  
**Status:** ✅ Ready for production (media upload needs permission fix)  
**Support:** Check logs/ directory for debugging
