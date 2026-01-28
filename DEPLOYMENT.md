# Geopolitik X Autopost - Deployment & Operations

**Status**: Production Ready
**Last Updated**: 2026-01-27
**Doc Version**: 2.0 (Phase 1 Optimized)

---

## Quick Start

### Prerequisites
```bash
Node.js 18+
npm 9+
SQLite3 (built-in via better-sqlite3)
X/Twitter API credentials
OpenAI API key (for image generation)
```

### Installation
```bash
npm install
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with:
X_API_KEY=xxx
X_API_SECRET=xxx
OPENAI_API_KEY=xxx
LLM_SCORE_THRESHOLD=85        # Gate expensive LLM calls (default 85)
DEDUPE_TTL_DAYS=14            # Keep dedup history (default 14d)
TOPIC_COOLDOWN_HOURS=72       # Prevent same topic within 72h (default 72h)
GDELT_ENABLED=0               # Disabled by default (API content-type issues)
MAX_POSTS_PER_DAY=30
```

### Deploy to Production
```bash
# Single run (dry-run mode for testing)
npm run dev -- --dry-run

# Single run (live posting to X/Twitter)
npm run dev -- --live

# Start hourly scheduler
npm run scheduler

# Autopost every hour (background)
./scripts/autopost-hourly.sh
```

---

## System Architecture

### Data Pipeline
```
RSS Feeds (25+ sources) 
  → Fetch + Parse 
  → Hard Geo Filter (HARD_GEO_KEYWORDS)
  → Score & Rank (geopolitics, region, reliability)
  → Dedup Check (4-layer: URL/FP/NEAR/TOPIC)
  → Topic Cooldown (72h TTL)
  → LLM Gate (if score ≥ 85 AND has hard-geo keywords)
    ├─ High-score + geo → LLM generation (~2000 tokens)
    └─ Low-score OR no geo → Deterministic template (~100 tokens)
  → URL Injection (single "Más detalles:" URL)
  → Image Generation (optional, DALL-E)
  → Post to X
  → Record in DB (dedup + cooldown)
```

### Core Modules

| Module | Purpose | Key Functions |
|--------|---------|----------------|
| `run_once.ts` | Main orchestrator | Main entry point, process lock, dedup checks |
| `news_picker.ts` | Ranking/selection | scoreStory(), pickTopStory(), hard-geo scoring |
| `dedupe_store.ts` | 4-layer dedup + cooldown | checkDuplicate(), isTopicOnCooldown(), recordTopicPosted() |
| `url_resolver.ts` | URL normalization | resolveFinalUrl(), normalizeUrl() |
| `claude.ts` | LLM thread generation | generateThreadWithClaude() (~2000 tokens) |
| `x.ts` | Twitter/X posting | postThread() |
| `process_lock.ts` | Anti-parallel execution | acquireLock(), releaseLock() |
| `db.ts` | SQLite persistence | posts table, topic_cooldown table |
| `scheduler.ts` | Cron orchestration | Hourly/daily scheduling |

---

## Deduplication System (NEW - Phase 1)

### 4-Layer Dedup (14d TTL)
1. **DUP_URL**: Exact canonical URL match
2. **DUP_FP**: Strong fingerprint (title + domain + snippet)
3. **DUP_NEAR**: SimHash near-duplicate (Hamming distance ≤ 3)
4. **DUP_TOPIC**: Topic hash (same country + actors + issue, despite URL changes)

### Topic Cooldown (NEW - 72h TTL)
Prevents same topic from being posted twice within 72 hours, even if URL is different.

**Example**: 
- Day 1: "Cuba embargo announced" posted (topic_hash = hash(cuba + embargo + usa))
- Day 1 (6h later): "Update: Cuba embargo details" appears (same topic_hash)
- **Result**: Skipped due to TOPIC_COOLDOWN

---

## Cost Optimization (Phase 1)

### Token Reduction Strategy
- **LLM Gate**: Only use Claude if `score ≥ 85 AND has hard-geo keywords`
  - High-signal stories (~20%): 2000 tokens + DALL-E (~$0.05)
  - Low-signal stories (~80%): 100 tokens template + DALL-E
  - **Expected savings**: 70-90% token reduction vs. always-LLM

### Monitoring Costs
```bash
# Check today's post count
sqlite3 data/bot.sqlite "SELECT COUNT(*) FROM posts WHERE DATE(posted_at) = DATE('now');"

# Check dedup effectiveness
DEDUPE_DEBUG=1 npm run dev -- --dry-run 2>&1 | grep -i "dup\|drop"
```

---

## Troubleshooting

### "Could not acquire lock" error
- Another instance running? `ps aux | grep node`
- Stale lock file? Check `.runlock` (>30min = stale)

### Bot posting duplicates
- Check dedup logs: `DEDUPE_DEBUG=1 npm run dev -- --dry-run`
- Verify topic_cooldown is working: `sqlite3 data/bot.sqlite "SELECT * FROM topic_cooldown ORDER BY posted_at DESC LIMIT 5;"`

### RSS sources failing (La Nación, Infobae, Reuters, AP)
- These sources return 404/DNS/XML errors intermittently
- Fallback: Use BBC, RFI, France24 (14/25 active)
- Todo: Replace broken sources with alternatives

### High token usage
- Reduce LLM_SCORE_THRESHOLD (default 85)
- Enable GDELT_ENABLED=1 if issues resolved

---

## Monitoring Checklist

Before scaling to production:
```bash
# 1. Compile check
npm run build 2>&1 | grep -i error

# 2. Integration tests
npm run test -- test-integration-zero-dup.ts 2>&1 | tail -5

# 3. Dry run test
npm run dev -- --dry-run 2>&1 | head -50

# 4. Verify single URL per post
sqlite3 data/bot.sqlite "SELECT COUNT(DISTINCT text) FROM posts LIMIT 5;"

# 5. Check dedup table
sqlite3 data/bot.sqlite "SELECT COUNT(*) FROM dedupe_entries; SELECT COUNT(*) FROM topic_cooldown;"

# 6. Monitor RSS sources
npm run dev -- --dry-run 2>&1 | grep "✓\|✗" | head -30
```

---

## Phase 2 Optimizations (Future)

- [ ] Story cache by topic_hash (reuse generated tweets within 72h)
- [ ] Structured JSON logging (reason codes: DUP_URL, TOPIC_COOLDOWN, etc.)
- [ ] Metrics dashboard (posts/day, dedup hits, token usage)
- [ ] Auto-fix failed RSS sources or replace with alternatives
- [ ] Consolidate curator.ts + curator-llm.ts code paths

---

## Files Structure

```
/
├── src/
│   ├── run_once.ts               # Main entry point
│   ├── news_picker.ts            # Story ranking
│   ├── dedupe_store.ts           # Dedup + cooldown
│   ├── url_resolver.ts           # URL normalization
│   ├── process_lock.ts           # Anti-parallel lock
│   ├── scheduler.ts              # Cron jobs
│   ├── claude.ts                 # LLM generation
│   ├── x.ts                      # X/Twitter posting
│   ├── db.ts                     # SQLite persistence
│   ├── curator-llm.ts            # Alternative ranking
│   └── (14 more modules)
├── scripts/
│   ├── autopost-hourly.sh        # Hourly automation
│   └── generate-logo.js
├── data/
│   ├── bot.sqlite                # Persistent DB (posts, dedup, cooldown)
│   ├── post_history.json         # Legacy 48h dedup (deprecated)
│   └── posted.json               # Legacy posts log (deprecated)
├── docs/
│   └── archive/                  # 81 archived docs (kept for reference)
├── DEPLOYMENT.md                 # This file
├── ARCHITECTURE.md               # Technical deep dive (to be created)
├── README-ES.md                  # Spanish version
└── 00-START-HERE.md              # Quick entry point
```

---

## Support & Debugging

For detailed technical information, see:
- **Architecture**: `docs/ARCHITECTURE.md` (Phase 2)
- **Dedup system**: See comments in [src/dedupe_store.ts](src/dedupe_store.ts#L1-L30)
- **Archived docs**: `docs/archive/` (81 docs, kept for historical reference)

---

*Last commit: Phase 1 - Consolidated dedup, added topic cooldown, optimized LLM gating, archived docs*
