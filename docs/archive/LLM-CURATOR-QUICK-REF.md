# LLM Curator Quick Reference

## Environment Variables (Copy-Paste Ready)

```bash
# Enable LLM Curator
export CURATOR_LLM=1

# Timeout (increase if Claude API is slow)
export CURATOR_LLM_TIMEOUT_MS=15000

# Number of top candidates to rank
export CURATOR_LLM_K=5

# Debug logging
export CURATOR_DEBUG=1
```

## Quick Test Commands

### 1. DRY RUN (no posting)
```bash
CURATOR_LLM=1 CURATOR_DEBUG=1 npm run dev
```

### 2. LIVE TEST (with image & posting)
```bash
CURATOR_LLM=1 X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

### 3. WITHOUT LLM (deterministic only, for comparison)
```bash
npm run dev
```

### 4. DISABLE LLM TEMPORARILY
```bash
CURATOR_LLM=0 npm run dev
```

## What to Look For in Output

### ✅ LLM Curator Working
```
🧠 LLM curator enabled: refining candidate...
[CURATOR-LLM] Starting refinement...
[CURATOR-LLM] Parsed successfully
[CURATOR-LLM] ✅ Curation succeeded (best_pick score: 85)
✅ LLM best_pick accepted (score=85)
```

### ✅ Good Tweet Format
```
🚨 ÚLTIMA HORA | [Spanish title in all caps]

[Context sentence]

Más detalles: https://example.com

#Hashtag1 #Hashtag2
```

### ✅ Geopolitical Relevance Check
```
[GEO-GATE] geoScore=40 (positive signals detected)
```

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| Timeout | `CURATOR_LLM_TIMEOUT_MS=30000` (increase timeout) |
| Parse error | Check `ANTHROPIC_API_KEY` is set; retry |
| Falls back to deterministic | Normal - LLM score was < 70, deterministic pick used |
| Duplicate URL in tweet | Shouldn't happen, report if seen |
| Wrong language | Tweet should be Spanish, check Claude response |

## Performance Impact

- **Deterministic curator**: ~500ms (no LLM)
- **LLM curator**: +1–2 seconds
- **Total cycle**: ~6–7 seconds with LLM enabled
- **Hourly limit**: 20 posts/day = 1.2 posts/hour, no timing issues

## Files Changed

- ✅ **NEW**: `src/curator-llm.ts` (480 lines)
- ✅ **MODIFIED**: `src/run_once.ts` (+170 lines)
- ✅ TypeScript: `npx tsc --noEmit` → 0 errors

## Post-Deployment

1. Monitor first few cycles: `tail -f logs/autopost-hourly.log | grep CURATOR`
2. Check tweet quality: Visit @realgeopolitik_ X account
3. Verify geopolitical relevance: Should be 75%+ geo content
4. Check for Spanish: All headlines should be Spanish
5. URL dedupe: No double "Más detalles:" lines

## Rollback (if needed)

Remove LLM curator:
```bash
unset CURATOR_LLM
npm run dev    # Falls back to deterministic curator
```

Or edit `.env`:
```
CURATOR_LLM=0  # Disable without removing variable
```

---

**Last Tested:** 2026-01-26 17:24 UTC  
**Status:** ✅ PRODUCTION READY
