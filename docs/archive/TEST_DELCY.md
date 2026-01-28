# 🧪 Testing Delcy Portrait System & Deduplication Fix

## ✅ What Was Fixed

### Problem 1: Duplicate Detection Not Working
**Root Cause:** Event fingerprints were using **hour-level bucketing**  
- **Old:** fingerprint = SHA1(region::entities::2026-01-26H14)
- **Issue:** 2pm Israel post ≠ 5pm Israel post (different hours = different fingerprints)
- **Result:** Same Israel story posted 3-4 times (2pm, 3pm, 5pm)

**Solution:** Changed to **DAY-level bucketing**
- **New:** fingerprint = SHA1(region::entities::2026-01-26)
- **Effect:** All Israel stories posted today get SAME fingerprint
- **Result:** -45 penalty blocks all repeats within 24h window

### Problem 2: Portrait System Not Tested
**Status:** Code complete but not tested with actual story
- Smart matching: ✅ (extracts keywords from filenames)
- Composition engine: ✅ (Sharp-based overlay)
- DALLE_FULL fallback: ✅ (guaranteed)
- **Need:** Actual story with "Delcy" or "Rodriguez" entity

---

## 🚀 How to Test

### Option 1: Wait for Delcy Story (Next Hour)
If RSS feeds have a Delcy/Venezuela story, it will:
1. Auto-detect "delcy" or "rodriguez" entity
2. Find matching portrait: `DELCY RODRIGUEZ.webp`
3. Generate DALLE image for background
4. Compose final image with portrait overlay
5. Expected log: `[IMG] mode: COMPOSED [IMG] entity: delcy [IMG] portrait: ./assets/portraits/DELCY RODRIGUEZ.webp`

### Option 2: Manual Test (Immediate)
Create test with fake Delcy story:

```bash
# Clear today's post count (TEMPORARY - for testing only)
rm data/bot.sqlite
# Or edit MAX_POSTS_PER_DAY in src/run_once.ts temporarily

# Run with manual URL (if Delcy story available)
npm run dev -- --dry-run

# Check logs for portrait matching
# Expected: "[IMG] mode: COMPOSED" instead of "DALLE_FULL"
```

### Option 3: Verify Deduplication Working
Next time Israel story appears, system will:
1. Calculate fingerprint: SHA1("MIDDLE_EAST::israel gaza rehenes recupera::2026-01-26")
2. Check against `recentEventFingerprints[]` in state
3. Apply -45 penalty → score too low to post
4. Log: `Duplicate event: israel`

---

## 📊 Expected Behavior After Fix

### 24-Hour Deduplication Window
```
2026-01-26:
├─ 14:06 → Israel story (posted, added to fingerprints)
├─ 15:00 → Israel story again (BLOCKED: -45 penalty)
├─ 17:00 → Israel story again (BLOCKED: -45 penalty)
└─ 21:00 → Israel story again (BLOCKED: -45 penalty) ✅

2026-01-27:
└─ 00:01 → Israel story (NEW DAY: allowed - new fingerprint)
```

---

## 🔍 Verification Checklist

- [ ] No 4th repeat of Israel story (should be blocked now)
- [ ] Delcy story uses portrait if it appears
- [ ] `curator_state.json` has `recentEventFingerprints: [...]`
- [ ] Portrait logs show `[IMG] mode: COMPOSED` for Delcy
- [ ] `assets/output/` has `.composed.png` files (not just `.dalle.png`)

---

## 📝 Code Changes

File: `src/curator.ts` (lines 115-135)
- Changed `dateKey` from hour-level (H14, H15, etc.) to day-level
- Expanded entity extraction from 5 words to 8 words for better matching
- Added 24-hour window comment

Impact: All events posted today with same region + similar content get blocked.

---

## 🎯 Next Steps

1. **Immediate:** System will block Israel duplicates going forward
2. **Within 1 hour:** If Delcy story appears in RSS, portrait system auto-activates
3. **Manual test:** Can inject test Delcy story if needed

Test status: Ready ✅
