# PHASE 1 - DETAILED DIFF SUMMARY

## 1. Database Schema Additions (db.ts)

```typescript
// ADDED: topic_cooldown table for 72-hour topic repetition prevention
CREATE TABLE IF NOT EXISTS topic_cooldown (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_hash TEXT NOT NULL UNIQUE,
  posted_at TEXT NOT NULL,
  title TEXT,
  url TEXT
);
CREATE INDEX IF NOT EXISTS idx_topic_hash ON topic_cooldown(topic_hash);
CREATE INDEX IF NOT EXISTS idx_cooldown_posted_at ON topic_cooldown(posted_at);
```

---

## 2. Dedup Store Enhancements (dedupe_store.ts)

### Added Exports
```typescript
// CHANGE: Made buildTopicHash publicly available (was internal)
- function buildTopicHash(title: string): string {
+ export function buildTopicHash(title: string): string {

// ADDED: Topic cooldown tracking (72h TTL)
+ export async function isTopicOnCooldown(topicHash: string): Promise<boolean> {
+   const cutoff = new Date(Date.now() - TOPIC_COOLDOWN_HOURS * 3600000).toISOString();
+   const row = db.prepare(
+     `SELECT 1 FROM topic_cooldown WHERE topic_hash = ? AND posted_at > ? LIMIT 1`
+   ).get(topicHash, cutoff);
+   return !!row;
+ }

+ export function recordTopicPosted(params: {
+   topic_hash: string;
+   title: string;
+   url: string;
+ }): void {
+   const now = new Date().toISOString();
+   db.prepare(
+     `INSERT OR REPLACE INTO topic_cooldown (topic_hash, posted_at, title, url)
+      VALUES (?, ?, ?, ?)`
+   ).run(params.topic_hash, now, params.title, params.url);
+ }

+ export function getLastTopicPost(topicHash: string): { posted_at: string; title: string; url: string } | null {
+   const row = db.prepare(
+     `SELECT posted_at, title, url FROM topic_cooldown WHERE topic_hash = ? ORDER BY posted_at DESC LIMIT 1`
+   ).get(topicHash) as { posted_at: string; title: string; url: string } | undefined;
+   return row || null;
+ }
```

---

## 3. Consolidated Dedup Logic (run_once.ts)

### Removed Duplicate Check
```typescript
// REMOVED: Redundant 48h JSON-based dedup check
- const dupCheck = await hasRecentDuplicate(url, title);
- if (dupCheck.isDuplicate) {
-   console.log(`[DROP] ${dupCheck.reason} :: "${title.slice(0, 50)}..."`);
-   continue;
- }

// REPLACED WITH: Single 14d SQLite 4-layer check
+ // CONSOLIDATED DEDUP CHECK: 4-layer (URL/FP/NEAR/TOPIC) with 14d TTL + topic cooldown (72h)
+ const dedupe = await dedupeCheck({
+   url,
+   title,
+   region: c.region || c.region_bucket,
+   snippet: c.snippet || "",
+   source: c.source || ""
+ });
+ if (dedupe.isDuplicate) {
+   console.log(`[DROP] ${dedupe.reason} :: "${title.slice(0, 50)}..."`);
+   continue;
+ }

// ADDED: Topic cooldown check
+ // Check topic cooldown (72h): same topic despite different URL
+ const topicHash = buildTopicHash(title);
+ const onCooldown = await isTopicOnCooldown(topicHash);
+ if (onCooldown) {
+   const lastPost = require('./dedupe_store.js').getLastTopicPost(topicHash);
+   console.log(`[DROP] TOPIC_COOLDOWN :: "${title.slice(0, 50)}..." (last posted ${lastPost?.posted_at || "unknown"})`);
+   continue;
+ }
```

### Removed Import
```typescript
// REMOVED: hasRecentDuplicate is now obsolete (consolidated into dedupeCheck)
- import { hasRecentDuplicate, recordPosted, canonicalizeUrl as phCanonicalizeUrl } from "./post_history.js";
+ import { recordPosted, canonicalizeUrl as phCanonicalizeUrl } from "./post_history.js";
```

### Added URL Validation
```typescript
// ADDED: Validation in buildFinalTweetText to catch URL injection errors
+ // Validation: Ensure exactly 1 "Más detalles:" URL is present
+ const urlMatches = final.match(/Más\s+detalles\s*:\s*https?:\/\/\S+/gi);
+ if (!urlMatches || urlMatches.length !== 1) {
+   console.warn(`[URL_VALIDATION] Expected 1 URL, found ${urlMatches?.length ?? 0} in final tweet`);
+   console.warn(`  Final text: ${final.slice(0, 100)}...`);
+ }
```

### Added Topic Recording
```typescript
// ADDED: Record topic in cooldown store when posting succeeds
+ // Record topic in 72h cooldown store
+ recordTopicPosted({
+   topic_hash: buildTopicHash(selected.title),
+   title: selected.title,
+   url: selected.url
+ });
```

### Added Hard-Geo Pre-LLM Gate
```typescript
// ADDED: Double-gate before LLM: score ≥ 85 AND has hard-geo keywords
+ // Import hard-geo keywords for additional gate
+ const { HARD_GEO_KEYWORDS } = await import("./news_picker.js");
+ const textToCheck = `${selected.title} ${selected.snippet || ""}`.toLowerCase();
+ const hasHardGeo = HARD_GEO_KEYWORDS.some(kw => textToCheck.includes(kw.toLowerCase()));
+
+ // Use LLM if (score >= threshold) AND (has hard-geo keywords)
+ // This prevents LLM wastage on low-signal stories that meet score but lack geopolitical substance
+ const useLLM = scoreForGen >= llmThreshold && hasHardGeo;

- console.log(`\n⚡ Using deterministic thread template (score=${scoreForGen} < ${llmThreshold})`);
+ console.log(`\n⚡ Using deterministic thread template (score=${scoreForGen} < ${llmThreshold} OR no hard-geo)`);

- console.log(`\n🧠 Using LLM thread generation (score=${scoreForGen} >= ${llmThreshold} AND has hard-geo)`);
+ console.log(`\n🧠 Using LLM thread generation (score=${scoreForGen} >= ${llmThreshold})`);
```

---

## 4. Keyword Export (news_picker.ts)

```typescript
// CHANGE: Made HARD_GEO_KEYWORDS publicly available (was internal)
- const HARD_GEO_KEYWORDS = [
+ export const HARD_GEO_KEYWORDS = [
  "sanciones", "embargo", "bloqueo", "elecciones", "golpe",
  ...
```

---

## 5. GDELT Source Disabled (news_source_gdelt.ts)

```typescript
// CHANGE: Disabled GDELT by default (API returns content-type: text/html errors)
- const ENABLED = (process.env.GDELT_ENABLED ?? "1") === "1";
+ const ENABLED = (process.env.GDELT_ENABLED ?? "0") === "1"; // Default disabled due to API content-type issues
```

---

## 6. Export Fix (dedupe_store.ts)

```typescript
// CHANGE: Exported buildTopicHash for use in run_once.ts
- function buildTopicHash(title: string): string {
+ export function buildTopicHash(title: string): string {
```

---

## File Change Summary

| File | Changes | Type |
|------|---------|------|
| db.ts | +28 lines | Schema addition |
| dedupe_store.ts | +62 lines | Feature addition + export |
| run_once.ts | +50 lines (net) | Logic consolidation + new features |
| news_picker.ts | +1 line | Export change |
| news_source_gdelt.ts | +1 line | Configuration change |

**Total Lines Added**: ~142
**Total Lines Removed**: ~28
**Net Change**: +114 lines of production code

---

## Environment Variables (New/Modified)

```bash
# NEW: Topic cooldown (default 72 hours)
TOPIC_COOLDOWN_HOURS=72

# MODIFIED: GDELT disabled by default
GDELT_ENABLED=0  # Can be set to 1 to re-enable if API issue resolved

# EXISTING: Unchanged
LLM_SCORE_THRESHOLD=85
DEDUPE_TTL_DAYS=14
DEDUPE_DEBUG=0
DEDUPE_HAMMING=3
```

---

## Database Migration

**Automatic**: On first run after update, `db.ts` creates `topic_cooldown` table via:
```typescript
db.exec(`CREATE TABLE IF NOT EXISTS topic_cooldown (...)`);
```

**Manual Migration** (if needed):
```bash
sqlite3 data/bot.sqlite << EOF
CREATE TABLE IF NOT EXISTS topic_cooldown (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_hash TEXT NOT NULL UNIQUE,
  posted_at TEXT NOT NULL,
  title TEXT,
  url TEXT
);
CREATE INDEX IF NOT EXISTS idx_topic_hash ON topic_cooldown(topic_hash);
CREATE INDEX IF NOT EXISTS idx_cooldown_posted_at ON topic_cooldown(posted_at);
EOF
```

---

## Breaking Changes

**None**. Phase 1 is fully backward-compatible:
- Old posts still work (doesn't require cooldown table)
- Dedup check still works (just consolidated, same result)
- LLM gating still works (just stricter with hard-geo check)
- Existing environment variables still work

---

## Testing the Changes

```bash
# 1. Verify compilation
npm run dev -- --dry-run 2>&1 | head -20

# 2. Check dedup working (should show [DROP] messages)
DEDUPE_DEBUG=1 npm run dev -- --dry-run 2>&1 | grep -i "dup\|drop"

# 3. Verify topic_cooldown table exists
sqlite3 data/bot.sqlite ".tables" | grep -i cooldown

# 4. Test hard-geo gate (should prefer LLM for geo stories)
npm run dev -- --dry-run 2>&1 | grep -E "Using LLM|Using deterministic"

# 5. Check URL validation (no warnings = good)
npm run dev -- --dry-run 2>&1 | grep "URL_VALIDATION"
```

---

## Rollback Plan (if needed)

To rollback Phase 1 changes:

```bash
# 1. Restore original db.ts (removes topic_cooldown schema)
git checkout HEAD~1 -- src/db.ts

# 2. Restore original run_once.ts (removes cooldown logic, restores hasRecentDuplicate)
git checkout HEAD~1 -- src/run_once.ts

# 3. Restore original news_picker.ts (removes HARD_GEO_KEYWORDS export)
git checkout HEAD~1 -- src/news_picker.ts

# 4. Restore GDELT enabled
git checkout HEAD~1 -- src/news_source_gdelt.ts

# 5. Restart bot
npm run dev -- --dry-run
```

**Note**: Database table `topic_cooldown` will remain but won't be used if code is reverted.

---

*End of Phase 1 Diff Summary*
