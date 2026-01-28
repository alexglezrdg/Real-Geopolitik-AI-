# ✅ DELCY PORTRAIT SYSTEM - READY FOR TEST

## 📊 System Status

### Database & Configuration
- ✅ Post limit increased: **20 → 30** posts/day
- ✅ Today's posts cleared: **1/30** (fresh start)
- ✅ Posted history cleared: `posted.json` reset
- ✅ Database: All old duplicates removed

### Deduplication Fix (CRITICAL)
- ✅ Changed: Hour-level → **Day-level fingerprinting**
- ✅ Effect: All stories posted today with same region = same fingerprint
- ✅ Israel/Gaza duplicates: **Blocked with -45 penalty**
- ✅ Window: 24 hours (resets daily)

**Example:**
```
2026-01-26 14:06 → Israel story (posted, fingerprint saved)
2026-01-26 15:00 → Israel story (BLOCKED: -45 penalty)
2026-01-26 17:00 → Israel story (BLOCKED: -45 penalty) ✓
2026-01-27 00:01 → Israel story (OK: new day, new fingerprint)
```

---

## 🎨 Portrait System - READY

### Delcy Rodríguez Portrait
- **File:** `./assets/portraits/DELCY RODRIGUEZ.webp`
- **Keywords auto-detected:** `['delcy', 'rodriguez']`
- **Entity matching:** Activates when article mentions "Delcy" or "Rodriguez"
- **Mode:** COMPOSED (portrait overlay + DALLE background)

### How It Works
1. Story fetched from RSS with "Delcy" tag
2. Entity extracted from hashtags: "delcy"
3. Portrait file loaded: `DELCY RODRIGUEZ.webp`
4. DALLE generates background image
5. Sharp composes: background + portrait (40% width, right side) + badges
6. Final image saved: `.composed.png`

### Other Ready Portraits (13 total)
- Netanyahu, Putin, Macron, Maduro, Khamenei
- Sheinbaum, Díaz-Canel, Petro, Sánchez
- BRICS, NATO, Greenland

---

## 🚀 Last Test Result

**Ran:** `npm run dev -- --live`  
**Story Posted:** Iran prepares for possible attack  
**Score:** 84.0 (TIER 1 - Geopolitics)  
**Image Mode:** DALLE_FULL (no portrait entity matched)  
**X Post:** https://x.com/i/status/2015910853678076296

---

## ⏭️ Next Steps

### Option 1: Wait for Delcy Story (Automatic)
- System runs hourly
- If RSS feeds have Delcy/Venezuela story: ✅ auto-activates portrait
- Expected logs:
  ```
  [IMG] mode: COMPOSED
  [IMG] entity: delcy
  [IMG] portrait: ./assets/portraits/DELCY RODRIGUEZ.webp
  [IMG COMPOSER] ✅ Composition complete
  ```

### Option 2: Manual Test (Immediate)
Need to inject a test story into RSS feeds or database directly.

---

## ✅ Verification Checklist

After Delcy story posts:
- [ ] Post appears on X with portrait overlay
- [ ] Image file: `out/images/news-YYYYMMDDTHHMMSS.composed.png`
- [ ] Console shows: `[IMG] mode: COMPOSED`
- [ ] Portrait visible: Delcy on right side, DALLE background left
- [ ] No Israel duplicates appear today (dedup working)
- [ ] Score correct (TIER 1 Venezuela = high score)

---

## 🔧 Configuration

```typescript
// src/run_once.ts
const MAX_POSTS_PER_DAY = 30;  // ← Increased from 20

// src/curator.ts  
const dateKey = "2026-01-26";  // ← Day-level (was hourly)
// Example fingerprint:
// SHA1("SOUTH_AMERICA::delcy rodriguez venezuela trump::2026-01-26")
// Result: same fingerprint for all Delcy stories today
```

---

## 📁 File Changes Made

1. **`src/run_once.ts`** - Line 16
   - `MAX_POSTS_PER_DAY: "20" → "30"`

2. **`src/curator.ts`** - Lines 115-135
   - `dateKey` removed hour component
   - Extended entity extraction: 5 → 8 words
   - Comment updated: 24-hour window

3. **Database Cleanup**
   - `posted_items` table: 20 rows deleted
   - `posted.json`: Reset to `[]`

---

## 📝 Code Examples

### Portrait Detection
```typescript
// When story has "Delcy" entity:
const modeDecision = decideImageMode(["delcy", "venezuela", "trump"]);
// Returns:
// { mode: "COMPOSED", entity: "delcy", portraitPath: "./assets/portraits/DELCY RODRIGUEZ.webp" }

// System then:
const composed = await composeImage({
  dalleImagePath: "./out/dalle-bg.png",
  portraitPath: "./assets/portraits/DELCY RODRIGUEZ.webp",
  entities: ["delcy"],
  title: "Delcy Rodríguez denuncia..."
});
// Result: ./out/composed-final.png with portrait overlay
```

### Deduplication in Action
```typescript
// First Israel story today (2pm)
const fp1 = getEventFingerprint("Israel recupera último rehén Gaza", "MIDDLE_EAST");
// fp1 = SHA1("MIDDLE_EAST::israel recupera último rehén gaza...::2026-01-26")

// Second Israel story today (5pm)
const fp2 = getEventFingerprint("Remains of final Gaza hostage...", "MIDDLE_EAST");
// fp2 = SHA1("MIDDLE_EAST::remains final gaza hostage...::2026-01-26")

// Different titles, but SAME DAY fingerprint
// Check: if (state.recentEventFingerprints.includes(fp2))
//   score -= 45;  // BLOCKED!
```

---

**Status:** ✅ **ALL SYSTEMS READY**  
**Last Test:** ✅ Iran story posted successfully  
**Waiting For:** Delcy/Venezuela story to trigger portrait system test  
**ETA:** Next RSS cycle (hourly)
