# Portrait Images - Save Guide

Save each attached image with the following filenames:

## Americas

**Image 1 (Trump - Blue suit, red tie, US flag pin):**
→ Save as: `trump.png`

**Image 3 (Marco Rubio - Navy suit, burgundy tie):**
→ Save as: `marco_rubio.png`

**Image 4 (Maduro - Grainy photo, headphones, mustache):**
→ Save as: `maduro.png`

**Image 5 (Delcy Rodríguez - Woman with glasses, smiling):**
→ Save as: `delcy.png`

**Image 6 (Petro - Man with glasses, blue tie):**
→ Save as: `petro.png`

**Image 7 (Díaz-Canel - Gray hair, formal setting):**
→ Save as: `diaz_canel.png`

**Image 11 (Sheinbaum - Woman in white coat, smiling):**
→ Save as: `sheinbaum.png`

## Asia

**Image 2 (Xi Jinping - Green military jacket, with troops):**
→ Save as: `xi_jinping.png`

## Europe

**Image 9 (Macron - Dark suit, French flag):**
→ Save as: `macron.png`

**Image 10 (Sánchez - Spanish PM, striped tie):**
→ Save as: `sanchez.png`

**Image 15 (Putin - Dark suit, pointing finger):**
→ Save as: `putin.png`

## Middle East

**Image 13 (Khamenei - Black turban, brown robe, Iranian flag):**
→ Save as: `khamenei.png`

**Image 14 (Netanyahu - Gray hair, red tie, Israeli flag):**
→ Save as: `netanyahu.png`

## Africa

**Image 12 (Traoré - Military uniform, red beret, raised fist):**
→ Save as: `traore.png`

## Organizations & Symbols

**Image 8 (NATO logo - Blue compass star with text):**
→ Save as: `nato.png`

**Image 16 (BRICS - Group photo with 5 leaders holding hands):**
→ Save as: `brics.png`

**Image 17 (Greenland flag - Red and white circle):**
→ Save as: `greenland_flag.png`

---

## Quick Command (macOS/Linux)

If images are in your Downloads folder with default names:

```bash
# Navigate to project
cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost/assets/portraits"

# Rename and move (adjust source paths as needed)
# mv ~/Downloads/image1.jpg trump.png
# mv ~/Downloads/image2.jpg xi_jinping.png
# ... etc
```

---

## Verification

After saving, verify with:
```bash
ls -1 assets/portraits/*.png | wc -l
# Should show 17 (or 18 with Lula when added)
```

## Test Entity Detection

```bash
npm run dev -- --live
# Check logs for: [IMG] mode: COMPOSED
# When Trump/Putin/Xi story appears
```
