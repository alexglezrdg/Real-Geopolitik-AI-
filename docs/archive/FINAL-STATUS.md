# ✅ SISTEMA CERRADO: Real Geopolitik X Autopost v1.0.0

**Fecha:** 25 de enero de 2026  
**Estado:** PRODUCCIÓN  
**Últimas mejoras:** Prompts maestros + Logo overlay + Markdown fix  

---

## 🎯 Resumen Ejecutivo

Sistema **completamente funcional** para autoposting de noticias geopolíticas en X/Twitter con:

✅ **Generación de tweets** (1 o 3-tweet threads) en 100% español  
✅ **Metadata visual** con especificaciones Real Geopolitik locked  
✅ **Generación de imágenes** via DALL-E 3 (1024x1792, 9:16 mobile)  
✅ **Logo overlay** automático con Sharp (RG branding)  
✅ **Safety-by-default:** Requiere 3 checks para postear (`--live` + `X_LIVE=1` + conexión X)  
✅ **Daily limits:** 5 posts máximo/día  
✅ **Duplicate prevention:** SQLite DB almacena URLs ya posteadas  

---

## 🚀 Quick Commands

### DRY RUN (recomendado para testear)
```bash
npm run dev
```
**Salida:** Simulación completa sin postear nada.

### TEST: Generar Imágenes (sin postear)
```bash
IMAGE_LIVE=1 npm run dev
```
**Salida:** Genera imágenes en `./out/images/` pero no postea.

### LIVE MODE (postear + imágenes)
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```
**Precondiciones:**
- Archivo `.env` con credenciales X (OAuth 1.0a)
- `OPENAI_API_KEY` para generar imágenes
- Logo RG en `./assets/rg_logo.png` (ya incluido)

---

## 📁 Estructura de Archivos Clave

```
geopolitik-x-autopost/
├── .env                           # Variables (CONFIDENCIAL)
├── package.json
├── tsconfig.json
├── SETUP.md                       # Guía de setup detallada
├── src/
│   ├── claude.ts                  # ← NewsPack JSON generator
│   ├── openai_image.ts            # ← DALL-E 3 + logo overlay
│   ├── run_once.ts                # ← Main orchestrator
│   ├── x.ts                       # ← X API (OAuth 1.0a)
│   ├── rss.ts                     # ← Feed fetcher (BBC, Al Jazeera, etc.)
│   ├── db.ts                      # ← SQLite wrapper
│   └── scheduler.ts               # ← (opcional) Scheduled runs
├── assets/
│   └── rg_logo.png                # ✅ Logo RG (400x400, rojo #E10600)
├── scripts/
│   └── generate-logo.js           # Script para regenerar logo
├── out/
│   └── images/                    # Imágenes generadas (PNG con overlay)
└── data/
    └── bot.sqlite                 # DB local (no commitear)
```

---

## 🔑 Variables de Entorno Esenciales

```bash
# REQUERIDAS SIEMPRE
MAX_POSTS_PER_DAY=5
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

# PARA X (OAuth 1.0a)
X_LIVE=0                    # Cambiar a 1 si posteas
X_CONSUMER_KEY=...
X_CONSUMER_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...

# PARA IMÁGENES
OPENAI_API_KEY=sk-proj-...
IMAGE_LIVE=1                # Cambiar a 0 si NO generas imágenes

# REAL GEOPOLITIK BRANDING
RG_LOGO_PATH=./assets/rg_logo.png
IMAGE_OUTPUT_DIR=./out/images
```

**Verificar:**
```bash
grep -E "^(ANTHROPIC|OPENAI|X_|IMAGE|RG)" .env
```

---

## 📊 Workflow Completo

```
[RSS Feed] → [Claude API] → [NewsPack JSON] → [DALL-E 3] → [Logo Overlay] → [X Post]
    ↓            ↓               ↓                ↓              ↓              ↓
  BBC,Al J    System Prompt   Tweet+Meta    Image 1024x1792  Sharp Compose  OAuth 1.0a
  Guardian    Spanish 100%    Palette RG    (sin logo)       (con logo)     Dual-check
  NPR         ≤270 chars      Layout lock   Prompt maestro   PNG final      DB Store
```

### Step-by-Step

1. **RSS Fetch** (`rss.ts`)
   - Obtiene últimas noticias de 4 fuentes
   - Selecciona por antigüedad y prioridad

2. **NewsPack Generation** (`claude.ts`)
   - Claude devuelve JSON con:
     - `tweet`: Texto ≤270 caracteres, 100% español
     - `visual`: Headline, subheadline, image_brief, palette RG, etc.
   - Markdown cleanup automático (`` ```json `` → JSON puro)
   - Validación: no inglés, no cifras inventadas, layout_lock respetado

3. **Image Generation** (`openai_image.ts`)
   - DALL-E 3 crea imagen 1024x1792 (9:16 mobile)
   - Input: visual metadata (headline, subheadline, source, image_brief, palette)
   - Output: PNG sin logo (`./out/images/news-[timestamp].png`)

4. **Logo Overlay** (`overlayRGLogo()`)
   - Sharp redimensiona logo a 200px
   - Posiciona en centro, ~58% hacia abajo (entre hero y lower third)
   - Output: PNG final con branding (`./out/images/news-[timestamp].rg.png`)

5. **X Posting** (`x.ts`)
   - Valida dual-check: `--live` + `X_LIVE=1`
   - Conecta con OAuth 1.0a
   - Postea tweet + thread (si aplica)
   - Almacena URL en DB para evitar duplicados

---

## 🎨 Real Geopolitik Branding (LOCKED)

### Paleta
- **Fondo:** #000000 (negro puro)
- **Texto:** #FCFCFA (blanco casi puro)
- **Acento:** #E10600 (rojo vivo)

### Layout (9:16 mobile, 1024x1792)
```
┌─────────────────────────┐
│ 🔴 ÚLTIMA HORA  (header) │ ← Red pill, top-left
│                         │
│   HERO IMAGE (60%)      │ ← Foto principal + leve blur
│   Cinematográfico       │
│   Alto contraste        │
│                         │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ ← Línea roja 4-6px
│ TITULAR MAYÚSCULAS      │ ← Lower third (35%)
│ 12-16 palabras          │
│                         │
│ Subtítulo 18-22 palabras│ ← Gray claro
│                         │
│ Fuente: ... | Fecha: ...|  ← Footer discreto
└─────────────────────────┘
```

### Logo RG
- **Ubicación:** `./assets/rg_logo.png`
- **Dimensiones:** 400x400 PNG
- **Diseño:** Círculo rojo #E10600 con "RG" blanco
- **Overlay:** Centrado horizontalmente, ~58% hacia abajo
- **Opacidad:** 95% (ligeramente translúcido)

**Regenerar:**
```bash
node scripts/generate-logo.js
```

---

## 🧪 Testing Checklist

### ✅ Local (sin postear)
```bash
npm run dev
# Esperado:
# - Lee RSS feeds
# - Selecciona noticia
# - Genera JSON (Claude)
# - Valida Spanish + length
# - Muestra preview de thread
# - [X] DRY RUN: posting disabled.
```

### ✅ Imágenes (sin postear)
```bash
IMAGE_LIVE=1 npm run dev
# Esperado (adicional):
# - 🎨 Generating image: "..."
# - ✅ Base image saved: ./out/images/news-[timestamp].png
# - ✅ Logo overlay applied: ./out/images/news-[timestamp].rg.png
```

### ✅ Posting (con dual-check)
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
# Esperado:
# - 🔗 Testing X connection...
# - ✅ Connected as @realgeopolitik
# - [imagen y tweets como arriba]
# - ✅ Thread posted successfully!
# - View: https://x.com/i/status/[tweet_id]
```

---

## 🔐 Safety Mechanisms

### 1. Dry-Run (Default)
- `npm run dev` → **NO postea** (safe por defecto)
- Solo simula todo

### 2. Flag Required
- `npm run dev -- --live` → Activa "live mode"
- Pero aún requiere `X_LIVE=1` (env var)

### 3. Double Opt-In
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
# ↑ 3 checks: env var + CLI flag + X connection test
```

### 4. Daily Limit
```bash
MAX_POSTS_PER_DAY=5
# Si ya posteaste 5, sistema skippea (check en DB)
```

### 5. Duplicate Prevention
```bash
sqlite3 data/bot.sqlite "SELECT COUNT(*) FROM posted_urls WHERE posted_at > date('now');"
# Evita postear la misma URL 2 veces
```

---

## 🐛 Troubleshooting

### "No genera JSON"
```bash
# Ver respuesta de Claude
# En src/claude.ts se hace markdown cleanup automático
# Si aún falla, revisar ANTHROPIC_API_KEY
echo $ANTHROPIC_API_KEY | wc -c  # Debe ser ~120+ chars
```

### "No genera imágenes"
```bash
# Verificar
echo $IMAGE_LIVE        # Debe ser "1"
echo $OPENAI_API_KEY    # Debe tener valor

# Test
IMAGE_LIVE=1 npm run dev  # Ver logs
```

### "Logo no aparece"
```bash
# Verificar archivo
ls -lh assets/rg_logo.png

# Regenerar
node scripts/generate-logo.js

# Usar custom logo
# Reemplazar PNG, asegurar transparencia (canal alpha)
```

### "No postea en X"
```bash
# Verificar flags
npm run dev -- --live           # Falta X_LIVE=1
X_LIVE=1 npm run dev -- --live  # Full check

# Ver conexión
sqlite3 data/bot.sqlite "SELECT COUNT(*) FROM posted_urls;"
```

---

## 📈 Monitoring

### Imágenes Generadas
```bash
ls -lh out/images/*.rg.png | tail -10
# ← Ver 10 últimas imágenes con logo
```

### Posts de Hoy
```bash
sqlite3 data/bot.sqlite \
  "SELECT url, posted_at FROM posted_urls WHERE posted_at > date('now') ORDER BY posted_at DESC;"
```

### Limpiar DB (opcional)
```bash
# Eliminar URLs más viejas de 7 días
sqlite3 data/bot.sqlite \
  "DELETE FROM posted_urls WHERE posted_at < date('now', '-7 days');"
```

---

## 🚀 Deployment Tips

### Docker (opcional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
COPY tsconfig.json .
ENV NODE_ENV=production
CMD ["npm", "run", "dev"]
```

### Cron (Linux/Mac)
```bash
# Ejecutar cada 6 horas
0 */6 * * * cd /path/to/geopolitik-x-autopost && X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live >> logs/cron.log 2>&1
```

### Systemd (Linux)
```ini
[Unit]
Description=Real Geopolitik X Autopost
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/path/to/geopolitik-x-autopost
Environment="X_LIVE=1"
Environment="IMAGE_LIVE=1"
ExecStart=/usr/bin/npm run dev -- --live

[Install]
WantedBy=multi-user.target
```

---

## 📝 Prompts Maestros (Referencia)

### Claude: NewsPack Generator
```
Eres editor de breaking news para "Real Geopolitik". Devuelves ÚNICAMENTE JSON válido.

[ESQUEMA + REGLAS...]
- 100% ESPAÑOL
- tweet.text ≤ 270 caracteres
- Nada antes/después del JSON
```

Ubicación: [src/claude.ts](src/claude.ts#L90-L120)

### OpenAI: Image Generator
```
Actúa como Director de Arte de Real Geopolitik.
Crea UNA imagen tipo plantilla NOTICIA para móvil.

[FORMATO + PALETA + ELEMENTOS...]
- 1024x1792 (9:16 vertical)
- Paleta RG: #000000, #FCFCFA, #E10600
- Layout lock: header_pill | hero_60pct | red_rule | lower_third | footer
```

Ubicación: [src/openai_image.ts](src/openai_image.ts#L23-L60)

---

## ✉️ Support

Si algo no funciona:

1. **Logs:**
   ```bash
   npm run dev 2>&1 | tee debug.log
   ```

2. **Compilación:**
   ```bash
   npx tsc --noEmit
   ```

3. **DB:**
   ```bash
   sqlite3 data/bot.sqlite ".schema"
   ```

4. **Código:**
   - Revisar `.env` (todas las claves presentes)
   - Revisar prompts en `src/claude.ts` y `src/openai_image.ts`
   - Revisar OAuth keys en X Developer Console

---

## 📄 Archivos Relacionados

- **Guía completa:** [SETUP.md](SETUP.md)
- **Tipos TypeScript:** [src/claude.ts](src/claude.ts#L1-L50)
- **Scripts:** [scripts/generate-logo.js](scripts/generate-logo.js)

---

**Sistema: LISTO PARA PRODUCCIÓN** ✅  
**Versión:** 1.0.0  
**Última actualización:** 25-01-2026 20:30 UTC

---
