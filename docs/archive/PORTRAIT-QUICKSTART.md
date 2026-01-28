# Quick Start: Enable Portrait for Trump

## Step 1: Add Portrait Image

```bash
# Place your Trump portrait in:
assets/portraits/trump.png

# Requirements:
# - PNG format (transparent background recommended)
# - High resolution (at least 800px width)
# - Portrait orientation (taller than wide)
```

## Step 2: Test

```bash
# Run system (will auto-detect if Trump story appears)
npm run dev -- --live

# Look for these logs:
# [IMG] mode: COMPOSED
# [IMG] entity: trump
# [IMG] portrait: trump.png
# [IMG COMPOSER] ✅ Composition complete
```

## Step 3: Verify Output

Check the composed image:
```bash
# Look for files ending in .composed.png
ls -lah out/images/*composed.png

# Example output:
# out/images/news-20260126T210045.composed.png
```

## Already Configured Entities

The system is ready to use portraits for these entities once you add the PNG files:

- **trump.png** → Aliases: "trump", "donald trump"
- **putin.png** → Aliases: "putin", "vladimir putin"
- **xi_jinping.png** → Aliases: "xi", "xi jinping"
- **petro.png** → Aliases: "petro", "gustavo petro"
- **lula_da_silva.png** → Aliases: "lula", "lula da silva"
- **marco_rubio.png** → Aliases: "rubio", "marco rubio"
- **nato.png** → Aliases: "nato", "otan"

## How It Works

1. System generates DALL·E image (always, as before)
2. Detects entities from tags and title
3. If portrait exists → composes (DALL·E bg + portrait + overlays)
4. If portrait missing → uses DALL·E as-is
5. If composition fails → falls back to DALL·E (guaranteed post)

## Zero Risk

- No portraits? → System works exactly as before (DALL·E FULL)
- Composition fails? → Auto-fallback to DALL·E FULL
- No code changes needed to add/remove portraits

---

See [HYBRID-IMAGE-SETUP.md](HYBRID-IMAGE-SETUP.md) for full documentation.
