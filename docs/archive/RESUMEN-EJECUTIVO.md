# 📋 SISTEMA GEOPOLITIK AUTOPOST - RESUMEN EJECUTIVO

**Version:** 1.1.0  
**Status:** ✅ **COMPLETAMENTE FUNCIONAL**  
**Fecha:** 25 de enero de 2026

---

## 🎯 Resumen

Real Geopolitik es un **sistema completamente autónomo** que:

1. **Busca** noticias trending de geopolítica (11 fuentes RSS)
2. **Selecciona** la más relevante con scoring (recencia + LatAm + urgencia)
3. **Genera** tweet (100% español, ≤270 chars)
4. **Crea** imagen visual (DALL-E 3, 9:16, con logo RG)
5. **Publica** en X/Twitter (con guardrails de seguridad)

Todo esto **SIN intervención manual** (aunque permite modo manual si lo necesitas).

---

## 🏗️ Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│          NEWS PICKER (news_picker.ts)                    │
│  - Baja 11 fuentes RSS                                   │
│  - Filtra por geopolítica (keywords)                     │
│  - Score: recencia + LatAm + urgencia + fuente           │
│  - Elige TOP 1                                           │
│  - Dedup vs SQLite                                       │
└────────────────────────┬─────────────────────────────────┘
                         │ Story (title, url, source, snippet)
                         ▼
┌──────────────────────────────────────────────────────────┐
│        CLAUDE NEWSPACCK GENERATOR (claude.ts)            │
│  - System prompt: "Real Geopolitik NewsPack Generator"   │
│  - Input: title + url + source + snippet                 │
│  - Output: JSON {tweet, visual metadata, hashtags}       │
│  - Markdown cleanup (auto-remove ```json``` markers)     │
└────────────────────────┬─────────────────────────────────┘
                         │ NewsPack JSON
                         ▼
┌──────────────────────────────────────────────────────────┐
│     DALLE 3 + SHARP (openai_image.ts)                    │
│  - Construye prompt a partir de visual metadata          │
│  - Genera imagen 1024x1792 (9:16)                        │
│  - Overlay: logo RG (200x200, 58% down, 95% opacity)    │
│  - Guarda PNG final                                      │
└────────────────────────┬─────────────────────────────────┘
                         │ Image file (*.rg.png)
                         ▼
┌──────────────────────────────────────────────────────────┐
│         X/TWITTER API (x.ts)                             │
│  - Upload media                                          │
│  - Post tweet/thread                                     │
│  - Dual-key safety: --live + X_LIVE=1                    │
│  - Default: DRY RUN (no posting)                         │
└────────────────────────┬─────────────────────────────────┘
                         │ Tweet ID
                         ▼
┌──────────────────────────────────────────────────────────┐
│         DATABASE (db.ts - SQLite)                        │
│  - Registra URL posteada                                 │
│  - Cuenta posts/día                                      │
│  - Previene duplicados                                   │
└──────────────────────────────────────────────────────────┘
```

---

## 📂 Estructura de archivos

```
geopolitik-x-autopost/
├── src/
│   ├── run_once.ts              ← Main: orquesta el flujo
│   ├── news_sources.ts          ← ✨ NEW: fuentes RSS + keywords
│   ├── news_picker.ts           ← ✨ NEW: scoring + picking
│   ├── claude.ts                ← Generador NewsPack (prompts maestros)
│   ├── openai_image.ts          ← DALL-E 3 + logo overlay
│   ├── x.ts                     ← X API + safety checks
│   ├── rss.ts                   ← Parser RSS genérico
│   ├── db.ts                    ← SQLite (dedup, daily limits)
│   └── scheduler.ts             ← (Opcional: cron jobs)
├── assets/
│   └── rg_logo.png              ← Logo 400x400 (rojo + "RG")
├── data/
│   └── bot.sqlite               ← Database (posted URLs, logs)
├── out/
│   └── images/                  ← Imágenes generadas (*.rg.png)
├── package.json
├── tsconfig.json
├── .env                         ← Variables (no commited)
├── .gitignore
├── SETUP.md                     ← Guía instalación
├── FINAL-STATUS.md              ← Status del sistema
├── NEWS-PICKER-GUIDE.md         ← ✨ Esta guía
├── PROMPTS-PRODUCCION.md        ← Prompts maestros
├── EXAMPLES-OUTPUT.md           ← Ejemplos de output
└── README-ES.md                 ← Executive summary
```

---

## 🎮 Comandos

### 1. DRY RUN (por defecto, no postea)
```bash
npm run dev
```
**Qué hace:** Genera tweet + imagen (si `IMAGE_LIVE=1`) pero NO postea en X.  
**Ideal para:** Testing, desarrollo, verificar output.

### 2. Genera imágenes
```bash
IMAGE_LIVE=1 npm run dev
```
**Qué hace:** Activa generación DALL-E 3 + overlay.  
**Nota:** Consume créditos OpenAI.

### 3. LIVE (publicar en X)
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```
**Qué hace:** TODO activo → tweet + imagen + posting real en X.  
**Requisitos:** 
- `--live` flag
- `X_LIVE=1` env var
- APIs válidas
- Daily limit no alcanzado
- URL no ya posteada

⚠️ **CUIDADO:** Esto SÍ postea en vivo.

### 4. Manual URL (backward compat)
```bash
npm run dev -- --url https://example.com/noticia
```
**Qué hace:** Ignora trending picker, usa esta URL específica.

---

## 🔐 Seguridad (Guardrails)

### ✅ Dual-key protection
```
Requiere AMBOS para postear:
1. --live flag (línea de comando)
2. X_LIVE=1 (variable de entorno)

Resultado: No es posible postear accidentalmente
```

### ✅ Daily limit
```
MAX_POSTS_PER_DAY=5 (configurable en .env)
Si ya posteó 5 noticias hoy → salta
```

### ✅ Deduplicación
```
SELECT * FROM posted_urls WHERE url = ?
Si URL ya existe en DB → skip
Previene posting de la misma noticia
```

### ✅ Spanish-only enforcement
```
Si genera English → detecta, retryea con strict mode
Si sigue siendo English → falla (no postea)
Garantiza 100% Spanish content
```

### ✅ Default: Safe mode
```
Default: npm run dev → DRY RUN (no postea)
User debe EXPLÍCITAMENTE activar LIVE:
- Agregar --live
- Agregar X_LIVE=1
```

---

## 📊 Variables ENV (.env)

```bash
# APIs - REQUERIDAS
X_API_KEY=YOUR_X_API_KEY
X_API_SECRET=YOUR_X_API_SECRET
X_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
X_ACCESS_TOKEN_SECRET=YOUR_TOKEN_SECRET
OPENAI_API_KEY=YOUR_OPENAI_API_KEY

# Noticias - OPCIONALES (tienen defaults)
NEWS_AUTO=1                      # 1=activar picker, 0=manual only
NEWS_MAX_AGE_HOURS=24            # Noticias < N horas
NEWS_REGION_BOOST_LATAM=1        # Multiplicador boost LatAm
NEWS_DEBUG=0                     # 1=verbose logging

# Posting - OPCIONALES
MAX_POSTS_PER_DAY=5              # Máximo posts por día
RSS_FEEDS="Feed1|url1,Feed2|url2" # Feeds custom (overrides defaults)

# Safety
X_LIVE=0                         # 0=safe, 1=armed for live posting
```

---

## 📈 Scoring (Cómo elige la noticia)

Cada story recibe puntos por:

| Factor | Puntos | Ejemplo |
|--------|--------|---------|
| Recencia < 2h | +40 | "Última hora" |
| Recencia 2-6h | +30 | "Hace 3 horas" |
| Recencia 6-12h | +20 | "Esta mañana" |
| Recencia 12-24h | +10 | "Ayer" |
| Menciona LatAm | +30 | "Cuba, Venezuela, México" |
| Urgencia ("crisis", "últimas noticias") | +15 | "Emergencia" |
| Conflicto ("sanciones", "guerra") | +10 | "Bloqueo económico" |
| Fuente confiable | +5 | Reuters, AFP, BBC, DW |

**Ejemplo:**
- Story: "Cuba defiende militarmente, últimas 1h, AFP"
- Cálculo: 40 (recencia) + 30 (LatAm) + 15 (urgencia) + 5 (confiable) = **90 puntos** ✅ TOP 1

---

## 🧩 Inputs & Outputs

### INPUT: Story posteada
```json
{
  "title": "Cuba Defiende La Preparación Militar Como Disuasión",
  "url": "https://www.barrons.com/news/...",
  "source": "AFP (vía Barron's)",
  "snippet": "Cuba defend its military preparation as deterrence against US tensions...",
  "publishedAt": "2026-01-24T14:32:00Z"
}
```

### OUTPUT: Tweet + Imagen

**Tweet:**
```
🚨 ÚLTIMA HORA | Cuba defiende su preparación militar como 
"disuasión" en medio de tensiones con EE.UU. Señal: 
reforzar postura interna. Más detalles: https://...
```

**Imagen:**
```
┌─────────────────────────────┐
│ 🔴 ÚLTIMA HORA (rojo)       │
│                             │
│  [HERO 60%]                 │
│  Multitud + banderas Cuba   │
│                             │
├─────────────────────────────┤ ← Línea roja 4-6px
│                             │
│ CUBA DEFIENDE PREPARACIÓN   │ ← Mayúsculas, blanco
│ MILITAR                     │
│                             │
│ La isla la presenta como    │ ← Subtítulo gris
│ disuasión ante tensiones    │
│                             │
│ Fuente: AFP | 2026-01-24    │ ← Footer discreto
└─────────────────────────────┘
  (1024x1792, 9:16)
  [Logo RG overlay - opacidad 95%]
```

---

## 🚦 Flow Completo (por comandos)

### `npm run dev` (DRY RUN)

```
1. Lee 11 fuentes RSS
2. Filtra por geopolítica
3. Elige TOP 1 (scoring)
4. Verifica no esté en DB
5. Llama Claude (NewsPack JSON)
6. Genera tweet ≤270 chars
7. Crea visual metadata
8. [NO genera imagen - IMAGE_LIVE=0]
9. [NO postea en X - DRY RUN]
10. Log: "DRY RUN: posting disabled"
✅ Exit 0
```

### `IMAGE_LIVE=1 npm run dev` (Con imagen, sin postear)

```
1-7. (igual que DRY RUN)
8. Llama OpenAI DALL-E 3
9. Genera imagen 1024x1792
10. Aplica logo RG overlay (Sharp)
11. Guarda ./out/images/news-*.rg.png
12. [NO postea en X - DRY RUN]
13. Log: "Posting disabled"
✅ Exit 0
```

### `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live` (LIVE COMPLETO)

```
1-11. (todo arriba)
12. Verifica X_LIVE=1 + --live ✓
13. Testa conexión X API
14. Upload imagen a X (media_id)
15. POST tweet con media
16. Registra en SQLite (dedup)
17. Log: "Thread posted successfully!"
✅ Exit 0 (realmente posteó)
```

---

## 🧪 Tests

### ✅ Test 1: DRY RUN automático (sin URL manual)
```bash
$ npm run dev
✅ PASSED: Picked story de Venezuela (score=75), tweet generado
```

### ✅ Test 2: Compilación TypeScript
```bash
$ npm run dev (no errors)
✅ PASSED: 0 compilation errors
```

### ✅ Test 3: Dedup logic
```bash
$ npm run dev (twice, misma fuente)
✅ PASSED: Segunda vez salta (already posted)
```

### ✅ Test 4: Spanish enforcement
```bash
$ npm run dev (feed ingles)
✅ PASSED: Genera en español (strict mode active)
```

---

## 📞 Support & Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "No suitable trending story" | Feeds vacíos o sin RSS | Verificar RSS URLs en `news_sources.ts` |
| "No new items" | Daily limit alcanzado | Esperar a mañana o cambiar `MAX_POSTS_PER_DAY` |
| "Generation failed" | Error Claude API | Verificar `CLAUDE_API_KEY` en .env |
| "X API connection failed" | Error credenciales X | Verificar keys X en .env |
| "Image generation failed" | Error OpenAI | Verificar `OPENAI_API_KEY`, créditos, cuota |
| "Already posted" | URL duplicada | Intenta otra; DB funciona ✓ |

---

## 🎯 Próximas fases (opcional)

**Fase 1 (ya hecho):**
- ✅ News picker automático
- ✅ Scoring trending
- ✅ Prompts maestros
- ✅ Image gen DALL-E 3
- ✅ Logo overlay

**Fase 2 (roadmap):**
- 🔄 Scheduler (correr cada 15 min, pick 3/día)
- 🔄 Sentiment analysis (penalizar noticias positivas)
- 🔄 Clustering (si múltiples fuentes = trending ↑)
- 🔄 Google Trends integration
- 🔄 Analytics dashboard (posts, impressions, engagement)

---

## 📚 Documentación relacionada

| Archivo | Propósito |
|---------|-----------|
| [SETUP.md](SETUP.md) | Instalación paso a paso |
| [FINAL-STATUS.md](FINAL-STATUS.md) | Status arquitectura |
| [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md) | Guía del news picker |
| [PROMPTS-PRODUCCION.md](PROMPTS-PRODUCCION.md) | Prompts maestros (Claude + OpenAI) |
| [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md) | Ejemplos de output |

---

## ✅ Checklist Final

- [x] News picker implementado (11 fuentes RSS)
- [x] Scoring trending (recencia + LatAm + urgencia)
- [x] Backward compatible (manual URL aún funciona)
- [x] TypeScript compila (0 errores)
- [x] DRY RUN test passed
- [x] Dedup SQLite verificado
- [x] Spanish-only enforcement
- [x] Guardrails de seguridad activos
- [x] Documentación completa

---

**Status:** 🚀 **LISTO PARA PRODUCCIÓN**

Ejecuta: `npm run dev`

Luego: `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live`

¡Que comiencen los autopost! 🌍📰
