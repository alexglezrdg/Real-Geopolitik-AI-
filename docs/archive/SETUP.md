# Real Geopolitik X Autopost - Setup Final & Checklist

## ✅ Estado Actual

- ✅ TypeScript compilando sin errores
- ✅ NewsPack JSON con visual metadata completo (brand, palette, layout_lock)
- ✅ Imágenes generadas via DALL-E 3 con prompt maestro RG
- ✅ Logo overlay automático con Sharp
- ✅ Variables `.env` configuradas
- ✅ Prompts maestros actualizados (Claude + OpenAI)

---

## 🚀 Quick Start

### 1. **Verificar Dependencias**

```bash
npm install
```

**Dependencias clave:**
- `tsx`: Transpile + execute TypeScript
- `sharp`: Manipulación PNG/logo overlay
- `better-sqlite3`: Base de datos SQLite
- `@anthropic-ai/sdk`: Claude API
- `dotenv`: Variables de entorno

### 2. **DRY RUN (sin posting, sin imágenes)**

```bash
npm run dev
```

**Salida esperada:**
```
============================================================
🌍 GEOPOLITIK X AUTOPOST
📅 [timestamp]
🔧 Mode: SAFE MODE / DRY RUN (default)
============================================================
📊 Posts today: X/5
📡 Fetching RSS feeds...
  ✓ BBC World: X items
  ...
📰 Selected: "..."
✅ Generated: mode="single" urgency="ÚLTIMA HORA"
📝 Thread preview:
   1. 🚨 ÚLTIMA HORA | ...
🧩 Visual meta: [ÚLTIMA HORA] "..." | #Tag1, Tag2
[X] DRY RUN: posting disabled.
✅ Safe run completed (no posting).
```

### 3. **TEST: Generar Imágenes (sin postear)**

```bash
IMAGE_LIVE=1 npm run dev
```

**Salida esperada adicional:**
```
🎨 Generating image: "TITULAR..."
✅ Base image saved: ./out/images/news-[timestamp].png
✅ Logo overlay applied: ./out/images/news-[timestamp].rg.png
```

**Archivos generados:**
```
./out/images/
  ├── news-[timestamp].png       # Base sin logo
  └── news-[timestamp].rg.png    # Con logo RG overlay
./assets/
  └── rg_logo.png                # Logo RG (400x400, rojo+blanco)
```

### 4. **LIVE MODE (postear + generar imágenes)**

```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

**Checks de seguridad:**
- Requiere `--live` (flag CLI)
- Requiere `X_LIVE=1` (env var)
- Requiere `X_*` credenciales (OAuth 1.0a)
- Max 5 posts/día (respeta `MAX_POSTS_PER_DAY`)
- Almacena URLs en DB para evitar duplicados

**Salida esperada:**
```
🔗 Testing X connection...
✅ Connected as @realgeopolitik
📡 Fetching RSS feeds...
...
📝 Thread preview:
   1. 🚨 ÚLTIMA HORA | ...
🎨 Generating image: "..."
✅ Base image saved: ./out/images/...
✅ Logo overlay applied: ./out/images/....rg.png
✅ Thread posted successfully!
   View: https://x.com/i/status/[tweet_id]
```

---

## 📋 Checklist: Variables `.env`

### Requeridas Siempre

```bash
# --- General ---
MAX_POSTS_PER_DAY=5

# --- Claude / Anthropic ---
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

# --- X (OAuth 1.0a) - Solo si vas a postear ---
X_LIVE=0  # Cambiar a 1 si posteas
X_CONSUMER_KEY=...
X_CONSUMER_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...

# --- OpenAI (imágenes) ---
OPENAI_API_KEY=sk-proj-...
IMAGE_LIVE=1  # Cambiar a 0 si NO generas imágenes

# --- Real Geopolitik Branding ---
RG_LOGO_PATH=./assets/rg_logo.png
IMAGE_OUTPUT_DIR=./out/images
```

### Flags para Cambiar Comportamiento

```bash
# Cambiar modelo Claude
export CLAUDE_MODEL=claude-opus-4-1

# Cambiar ruta de DB
export DATABASE_PATH=/path/to/custom.db

# Cambiar output de imágenes
export IMAGE_OUTPUT_DIR=/custom/out/path
```

---

## 🎨 Assets: Real Geopolitik Branding

### Logo RG

**Archivo:** `./assets/rg_logo.png`

**Especificaciones:**
- Formato: PNG transparente, 400x400px
- Diseño: Círculo rojo #E10600 con texto blanco "RG"
- Overlay: Centrado horizontalmente, ~58% hacia abajo en imagen 1024x1792
- Alpha: 95% opacidad (ligeramente translúcido)

**Generar logo:**
```bash
node scripts/generate-logo.js
```

**Usar logo personalizado:**
1. Reemplazar `./assets/rg_logo.png` con tu diseño
2. Asegurar formato PNG con canal alpha (transparencia)
3. Tamaño recomendado: 300-500px

---

## 📊 Base de Datos

### SQLite: `./data/bot.sqlite`

**Tablas:**
- `posted_urls`: Almacena URLs ya posteadas (evita duplicados)
- `logs`: (opcional) Historial de ejecuciones

**Consultas útiles:**
```bash
sqlite3 data/bot.sqlite "SELECT url, posted_at FROM posted_urls LIMIT 10;"
sqlite3 data/bot.sqlite "DELETE FROM posted_urls WHERE posted_at < date('now', '-7 days');"
```

---

## 🔧 Workflow Completo

### Desarrollo: Iterar Rápido

```bash
# 1. Editar prompts (src/claude.ts)
# 2. Compilar y testear
npm run build
npm run dev

# 3. Ver cambios en tiempo real
npm run watch
```

### Producción: Deploy Seguro

```bash
# 1. Verificar últimas imágenes generadas
ls -lh out/images/*.rg.png | tail -5

# 2. Ejecutar dry-run final
npm run dev

# 3. Ejecutar con imágenes (sin postear)
IMAGE_LIVE=1 npm run dev

# 4. Postear en vivo (con ambas flags)
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live

# 5. Monitorear
sqlite3 data/bot.sqlite "SELECT url, posted_at FROM posted_urls ORDER BY posted_at DESC LIMIT 5;"
```

---

## 📝 Prompts Maestros (Referencia)

### Claude: NewsPack JSON Generator

**Ubicación:** `src/claude.ts` (system prompt, líneas ~90-150)

**Responsabilidad:**
- Recibe: Título, fuente, URL de noticia
- Devuelve: JSON con tweet(s) + visual metadata (headline, palette, layout, etc.)

**Reglas clave:**
- 100% español (sin inglés)
- 1 tuit default, thread3 solo si contexto crítico
- ≤ 270 caracteres por tuit
- Nunca inventar cifras

### OpenAI DALL-E 3: Image Generator

**Ubicación:** `src/openai_image.ts` (IMAGE_PROMPT_TEMPLATE, líneas ~23-60)

**Responsabilidad:**
- Recibe: visual metadata (headline, subheadline, header, image_brief, etc.)
- Devuelve: Imagen 1024x1792 PNG con layout RG locked

**Reglas clave:**
- Paleta RG: #000000 (fondo), #FCFCFA (texto), #E10600 (acento)
- Layout lock: header_pill_top_left | hero_60pct | red_rule | lower_third_text | footer_source_date
- Sin logos de terceros
- Línea roja separadora 4-6px

---

## 🐛 Troubleshooting

### "No me genera imágenes"

```bash
# Verificar
echo $IMAGE_LIVE  # Debe ser "1"
echo $OPENAI_API_KEY  # Debe tener valor

# Test
IMAGE_LIVE=1 npm run dev  # Ver logs
```

### "No genera JSON válido de Claude"

```bash
# Ver el error en logs de generateNewsPack
npm run dev  # Debería fallar visiblemente con mensaje

# Verificar API key
echo $ANTHROPIC_API_KEY | wc -c  # Debe tener ~120+ chars

# Check: timeout?
# Aumentar en src/claude.ts línea ~136: setTimeout(..., 20000)
```

### "No me postea en X"

```bash
# Verificar flags
npm run dev -- --live  # Sin X_LIVE=1, bloqueará

# Full check
X_LIVE=1 npm run dev -- --live  # Ver logs

# Test connection solo
npm run test:x
```

### "Logo no se ve en imagen"

```bash
# Verificar archivo
ls -l assets/rg_logo.png  # Debe existir

# Regenerar
node scripts/generate-logo.js

# Custom logo: reemplazar PNG
# Asegurar: PNG con transparencia, tamaño ~400x400
```

---

## 📦 Estructura de Archivos

```
geopolitik-x-autopost/
├── package.json
├── tsconfig.json
├── .env                    # Variables (no commitear)
├── .gitignore
├── data/
│   └── bot.sqlite          # DB (evitar commitear)
├── src/
│   ├── claude.ts           # NewsPack generator
│   ├── openai_image.ts     # DALL-E 3 integration
│   ├── x.ts                # X/Twitter API (OAuth 1.0a)
│   ├── rss.ts              # RSS feed fetcher
│   ├── db.ts               # SQLite wrapper
│   ├── run_once.ts         # Main orchestrator
│   └── scheduler.ts        # (opcional) Scheduled runs
├── assets/
│   └── rg_logo.png         # Logo RG para overlay
├── scripts/
│   └── generate-logo.js    # Script para generar logo
├── out/
│   └── images/             # Imágenes generadas
└── dist/                   # Build output (gitignore)
```

---

## 🚦 Safety Mechanisms

### 1. Dry-Run (Default)

```bash
npm run dev  # ← No postea nada, solo simula
```

**Checks:**
- No llama a `postThread()` en X
- No guarda URLs en DB
- No genera imágenes reales (solo si IMAGE_LIVE=1)

### 2. Live Flag Required

```bash
npm run dev -- --live  # Activa modo "live"
# Pero aún requiere X_LIVE=1 en env
```

### 3. Double Opt-In for X Posting

```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
# ↑ 3 checks: env var + flag + conexión X
```

### 4. Daily Limit

```bash
MAX_POSTS_PER_DAY=5  # Máximo 5 posts/día
```

Verificar:
```bash
sqlite3 data/bot.sqlite "SELECT COUNT(*) FROM posted_urls WHERE posted_at > date('now');"
```

---

## 📈 Next Steps (Opcionales)

### 1. Scheduler Automático

```bash
npm run scheduler  # Ejecuta cada N horas (no implementado aún)
```

### 2. Integración con Media Upload (X)

Actualmente NO sube imágenes a X. Para hacerlo:

```typescript
// En x.ts:
export async function uploadMedia(filePath: string): Promise<string> {
  // 1. Leer archivo PNG
  // 2. POST a /2/tweets/manage?media.upload
  // 3. Retornar media_id
  // 4. En postThread(): incluir media_ids
}
```

### 3. Webhooks o API REST

Para que sistemas externos disparen posts:

```bash
npm run api  # (no implementado aún)
# POST /api/post { title, source, url }
```

---

## ✉️ Support

Si algo no funciona:

1. **Logs detallados:**
   ```bash
   DEBUG=1 npm run dev
   ```

2. **Verificar compilación:**
   ```bash
   npx tsc --noEmit
   ```

3. **Test individual:**
   ```bash
   npm run test  # (si hay test suite)
   ```

4. **Contacto:** Revisar `.env` y prompts en `src/*.ts`

---

**Fecha:** 25 de enero de 2026  
**Versión:** 1.0.0 (Sistema Cerrado - RG Branding Locked)
