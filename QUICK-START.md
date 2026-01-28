# ⚡ QUICK START - 5 minutos

**Real Geopolitik X Autopost v1.1.0**

---

## 1️⃣ Setup (2 min)

```bash
# Clone / navigate to project
cd geopolitik-x-autopost

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# (edit .env, add your API keys)
```

---

## 2️⃣ Test (1 min)

```bash
# Run automatic news picker (DRY RUN)
npm run dev

# Expected output:
# ✅ Picked: "trending story..."
# 📊 Score: 75.0
# [X] DRY RUN: posting disabled.
# ✅ Safe run completed (no posting).
```

---

## 3️⃣ Commands (remember these)

```bash
# Development (safe, no posting)
npm run dev                                    # Automatic + DRY RUN
IMAGE_LIVE=1 npm run dev                      # + images (DALL-E 3)

# Production (posts in X)
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live   # LIVE: full auto posting

# Manual URL (backward compat)
npm run dev -- --url https://example.com      # Use custom URL
```

---

## 4️⃣ Understanding (2 min)

### What it does
1. Scans 11 RSS feeds (BBC, DW, France24, Reuters, etc.)
2. Filters by geopolitical relevance
3. Scores by recency + region + urgency
4. Picks TOP 1 story
5. Generates tweet (≤270 chars, 100% Spanish)
6. Generates image (DALL-E 3, 9:16, RG logo)
7. Posts to X (if --live + X_LIVE=1)

### Safety
- **Default:** DRY RUN (never posts)
- **Required to post:** `--live` flag + `X_LIVE=1` env var
- **Daily limit:** 5 posts max
- **Deduplication:** No repeated URLs

---

## 🎯 Common scenarios

### "I want to test locally"
```bash
npm run dev
# ✅ Picks trending story, shows tweet, NO posting
```

### "I want to see images too"
```bash
IMAGE_LIVE=1 npm run dev
# ✅ Also generates DALL-E image + RG logo overlay
```

### "I'm ready for LIVE posting"
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
# ⚠️ REAL POSTING IN X
```

### "I want to post a specific URL"
```bash
npm run dev -- --url https://my-article.com
# Posts that specific URL (manual mode)
```

---

## 📊 Example output

```
🌍 GEOPOLITIK X AUTOPOST
📅 2026-01-25T20:52:30.610Z

📊 Posts today: 1/5

🤖 Automatic mode: picking trending story...
✅ Picked: "Informe desde Caracas: continúan las excarcelaciones..."
📊 Score: 75.0
Why: score=75.0 | France 24 Español

✅ Generated: mode="single" urgency="CLAVE" hashtags=[Venezuela]

📝 Thread preview:
   1. ⚠️ CLAVE | Continúan las excarcelaciones de opositores 
      en Venezuela tras semanas de tensión política...

[X] DRY RUN: posting disabled.
✅ Safe run completed (no posting).
```

---

## ❓ FAQ

**Q: Will it post automatically?**  
A: No, by default it's DRY RUN. Need `--live` + `X_LIVE=1` to post.

**Q: Can I use manual URLs?**  
A: Yes! `npm run dev -- --url https://...` uses that URL.

**Q: How does it choose stories?**  
A: Scores by recency (40), LatAm mention (30), urgency (15), etc.

**Q: Is it safe?**  
A: Very. Dual-key protection, dedup, daily limits, DRY RUN default.

**Q: What if something breaks?**  
A: See [RESUMEN-EJECUTIVO.md#support](RESUMEN-EJECUTIVO.md) or [CONFIGURATION-GUIDE.md](CONFIGURATION-GUIDE.md)

---

## 📚 Learn more

- **What is it?** → [README-ES.md](README-ES.md)
- **How to install?** → [SETUP.md](SETUP.md)
- **How to configure?** → [CONFIGURATION-GUIDE.md](CONFIGURATION-GUIDE.md)
- **How does news picker work?** → [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md)
- **Everything?** → [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md)

---

## ✅ Checklist

- [ ] Installed with `npm install`
- [ ] Created .env file with API keys
- [ ] Ran `npm run dev` successfully
- [ ] Saw "✅ Picked: ..." in output
- [ ] Ready for production: `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live`

---

**You're all set! 🚀**

Start with: `npm run dev`

Ask later: `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live`
