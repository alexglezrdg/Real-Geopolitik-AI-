# HYBRID IMAGE SYSTEM - Portrait Setup Guide

## Overview

The system now supports **HYBRID IMAGE GENERATION**:
- **MODO A (DEFAULT)**: DALL·E FULL - Uses DALL·E image as-is
- **MODO B (DETERMINÍSTICO)**: COMPOSED - DALL·E background + local portrait + overlays

The decision is automatic based on entity detection and portrait availability.

---

## How It Works

### Pipeline Flow

1. **DALL·E generates image** (always, as before)
2. **System detects entities** from tags and title (Trump, Putin, etc.)
3. **Check for local portrait**:
   - If portrait exists → **MODO B** (compose)
   - If NOT exists → **MODO A** (use DALL·E as-is)
4. **Fallback**: If composition fails, always use DALL·E FULL

### Decision Logic

```typescript
// Example: Trump story
Entities detected: ["Trump", "US"]
Portrait check: /assets/portraits/trump.png → EXISTS
Result: MODO B (COMPOSED)

// Example: Generic conflict story
Entities detected: ["Gaza", "Israel"]
Portrait check: No matching portrait files
Result: MODO A (DALLE_FULL)
```

---

## Adding New Portraits

### Step 1: Prepare Portrait Image

- **Format**: PNG or JPG (PNG recommended for transparency)
- **Size**: Any size (will be auto-resized to 40% of image width)
- **Aspect ratio**: Portrait orientation works best (9:16 or similar)
- **Background**: Transparent PNG ideal; solid color also works
- **Quality**: High resolution (at least 800px width)

### Step 2: Save to Portraits Folder

```bash
cp your_portrait.png assets/portraits/trump.png
```

**Naming convention**:
- Use lowercase
- Replace spaces with underscores
- Example: `marco_rubio.png`, `xi_jinping.png`

### Step 3: Register in Mapping

Edit `src/image_mode.ts` → `ENTITY_PORTRAIT_MAP`:

```typescript
const ENTITY_PORTRAIT_MAP: Record<string, string> = {
  // Add your entry:
  "new leader": "new_leader.png",
  "full name": "new_leader.png",  // Multiple aliases OK
  
  // Existing entries...
  "trump": "trump.png",
  "donald trump": "trump.png",
  // ...
};
```

### Step 4: Set Priority (Optional)

If multiple entities detected, system picks highest priority.

Edit `ENTITY_PRIORITY` in `src/image_mode.ts`:

```typescript
const ENTITY_PRIORITY = [
  "nato", "otan",           // Lowest priority
  "marco rubio", "rubio",
  "petro", "lula",
  "xi", "xi jinping",
  "putin",
  "trump", "donald trump",  // Highest priority
  "your_new_leader",        // Add here
];
```

**Higher in list = higher priority when multiple portraits available.**

---

## Current Portraits

### Supported Entities (as of deployment)

**Status: NONE INSTALLED YET**

To enable deterministic mode, add portrait files:

| Entity | Expected Filename | Aliases |
|--------|------------------|---------|
| Trump | `trump.png` | "trump", "donald trump" |
| Putin | `putin.png` | "putin", "vladimir putin" |
| Xi Jinping | `xi_jinping.png` | "xi", "xi jinping" |
| Petro | `petro.png` | "petro", "gustavo petro" |
| Lula | `lula_da_silva.png` | "lula", "lula da silva" |
| Marco Rubio | `marco_rubio.png` | "rubio", "marco rubio" |
| NATO | `nato.png` | "nato", "otan" |
| Generic Leader | `generic_leader.png` | "leader", "president" |

**To activate**: Just drop the PNG file in `/assets/portraits/` with matching filename.

---

## Composition Layout (MODO B)

When COMPOSED mode is used:

```
┌────────────────────────────────┐
│ [BADGE]              [LOGO]    │  ← Top overlays
│  ÚLTIMA HORA           RG      │
│                                │
│                                │
│   DALL·E Background            │
│   (1024x1024)        ┌────┐   │
│                      │    │   │  ← Portrait (40% width)
│                      │ POR│   │     Right side, centered
│                      │TRAIT│   │
│                      │    │   │
│                      └────┘   │
│                                │
└────────────────────────────────┘
```

**Key specs**:
- Portrait: 40% of image width
- Position: Right side, vertically centered, 40px margin
- Badge: Top-left (40px margin)
- Logo: Top-right (40px margin)

---

## Logs

### Example: MODO A (DALL·E FULL)

```
🎨 Generating image...
✅ Base image saved: out/images/news-20260126T203817.png
✅ SVG badge and logo overlay applied: out/images/news-20260126T203817.rg.png
[IMG] mode: DALLE_FULL
[IMG] entity: NONE
[IMG] portrait: none
[IMG] reason: No entities detected
✅ Image ready (DALL·E FULL): out/images/news-20260126T203817.rg.png
```

### Example: MODO B (COMPOSED)

```
🎨 Generating image...
✅ Base image saved: out/images/news-20260126T210045.png
[IMG] mode: COMPOSED
[IMG] entity: trump
[IMG] portrait: trump.png
[IMG] reason: Portrait available for entity: trump
[IMG COMPOSER] Starting composition...
[IMG COMPOSER]   BG: news-20260126T210045.png
[IMG COMPOSER]   Portrait: trump.png
[IMG COMPOSER] ✅ Composition complete: out/images/news-20260126T210045.composed.png
✅ Image ready (COMPOSED): out/images/news-20260126T210045.composed.png
[IMG] output: out/images/news-20260126T210045.composed.png
```

### Example: Fallback (Composition Failed)

```
🎨 Generating image...
✅ Base image saved: out/images/news-20260126T210545.png
[IMG] mode: COMPOSED
[IMG] entity: trump
[IMG] portrait: trump.png
[IMG COMPOSER] Starting composition...
[IMG COMPOSER] ❌ Composition failed: Portrait not found
⚠️  Composition failed: Portrait not found
✅ Fallback to DALL·E FULL: out/images/news-20260126T210545.png
```

---

## Files Modified

### New Files
- `src/image_mode.ts` - Decision logic (mode A vs B)
- `src/image_composer.ts` - Composition engine (Sharp-based)
- `assets/portraits/` - Portrait storage (empty by default)
- `assets/overlays/` - Overlay assets (optional)
- `assets/backgrounds/` - Background fallbacks (optional)

### Modified Files
- `src/run_once.ts` - Integrated hybrid pipeline after DALL·E generation

### Unchanged Files
- `src/openai_image.ts` - DALL·E generation unchanged (still runs first)
- `src/claude.ts` - NewsPack generation unchanged
- `src/x.ts` - X posting unchanged

---

## Testing

### Test MODO A (no portrait)

```bash
npm run dev -- --live
# Should see: [IMG] mode: DALLE_FULL
```

### Test MODO B (with portrait)

1. Add portrait:
   ```bash
   cp sample_portrait.png assets/portraits/trump.png
   ```

2. Ensure story has "Trump" in tags or title

3. Run:
   ```bash
   npm run dev -- --live
   ```

4. Check logs:
   ```
   [IMG] mode: COMPOSED
   [IMG] entity: trump
   [IMG] portrait: trump.png
   ```

### Verify Fallback

1. Remove portrait file temporarily
2. Run system
3. Should fallback to DALL·E FULL with warning

---

## Production Considerations

### Performance
- Composition adds ~200-500ms per image
- Negligible impact on overall cycle time
- DALL·E generation (10-15s) remains bottleneck

### Reliability
- **Fallback guaranteed**: If anything fails, uses DALL·E FULL
- No breaking changes to existing pipeline
- Zero risk of blocking posts

### Quality
- Portrait quality depends on source image
- Transparent PNGs recommended for clean overlays
- Test each portrait before deploying

---

## Quick Start

**To enable Trump portraits:**

```bash
# 1. Get portrait image (high-res, transparent PNG ideal)
cp trump_official.png assets/portraits/trump.png

# 2. Test immediately (no code changes needed)
npm run dev -- --live

# 3. Verify logs
# Should see: [IMG] mode: COMPOSED when Trump story is picked
```

**To disable deterministic mode:**

```bash
# Just remove portrait files
rm assets/portraits/*.png

# System automatically falls back to DALL·E FULL
```

---

## Troubleshooting

### Portrait not being used

**Check:**
1. File exists: `ls assets/portraits/trump.png`
2. Entity detected: Check `[IMG] entity:` in logs
3. Mapping correct: See `ENTITY_PORTRAIT_MAP` in `src/image_mode.ts`

### Composition fails

**Common causes:**
1. Portrait file corrupted or wrong format
2. Sharp library not installed: `npm install sharp`
3. Insufficient memory (rare)

**Solution**: System auto-falls back to DALL·E FULL

### Wrong portrait selected

**Cause**: Multiple entities detected, priority wrong

**Solution**: Adjust `ENTITY_PRIORITY` in `src/image_mode.ts`

---

## Future Enhancements

- [ ] Auto-download portraits from Wikipedia/official sources
- [ ] Multiple portrait layouts (left/right/center)
- [ ] Dynamic sizing based on portrait aspect ratio
- [ ] A/B testing: MODO A vs MODO B engagement metrics
- [ ] Portrait caching with LRU eviction
- [ ] GPU-accelerated composition (Sharp + libvips)

---

**System Ready**: Portrait pipeline is LIVE. Add portrait files to enable deterministic mode per entity.
