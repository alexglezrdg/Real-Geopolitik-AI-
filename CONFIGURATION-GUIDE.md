# ⚙️ CONFIGURACIÓN RECOMENDADA

**Real Geopolitik X Autopost**  
**Guía de setup por caso de uso**

---

## 📋 Configuración Básica (.env)

```bash
# ============================================
# 🔑 APIS - REQUERIDAS
# ============================================

# X/Twitter
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_token_secret

# OpenAI (para DALL-E 3)
OPENAI_API_KEY=your_openai_key

# ============================================
# 🔧 NEWS PICKER - OPCIONALES (recomendados)
# ============================================

# Activar news picker automático
NEWS_AUTO=1

# Edad máxima de noticias a considerar
NEWS_MAX_AGE_HOURS=24

# Boost para noticias de LatAm (1=normal, 1.5=boost 50%)
NEWS_REGION_BOOST_LATAM=1

# Logging verbose (development)
NEWS_DEBUG=0

# ============================================
# 📊 SISTEMA - OPCIONALES
# ============================================

# Máximo de posts por día
MAX_POSTS_PER_DAY=5

# Custom RSS feeds (formato: "Name|URL,Name2|URL2")
# RSS_FEEDS="Mi Feed|https://..."

# ============================================
# 🚨 SAFETY - MUY IMPORTANTE
# ============================================

# NUNCA activar en desarrollo
X_LIVE=0

# Solo en producción + con --live flag
# X_LIVE=1  ← NO DESCOMENTAR A MENOS QUE ENTIENDAS LOS RIESGOS
```

---

## 🎯 Setup por caso de uso

### 1. Desarrollo local (DRY RUN)

```bash
# .env
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
OPENAI_API_KEY=...

NEWS_AUTO=1
NEWS_DEBUG=1        # Verbose logging

X_LIVE=0            # IMPORTANTE: DESACTIVADO

# Ejecutar
npm run dev
```

**Output esperado:**
```
🤖 Automatic mode: picking trending story...
✅ Picked: "..."
📊 Posts today: 1/5
[X] DRY RUN: posting disabled.
✅ Safe run completed (no posting).
```

---

### 2. Testing de imágenes (local)

```bash
# .env
(misma que arriba)

# Ejecutar
IMAGE_LIVE=1 npm run dev
```

**Output esperado:**
```
🤖 Automatic mode: picking trending story...
✅ Generated image: ./out/images/news-*.rg.png
[X] DRY RUN: posting disabled.
```

---

### 3. Staging (con URL manual)

```bash
# .env
(misma que desarrollo)

# Ejecutar
npm run dev -- --url https://example.com/noticia

# O con imagen
IMAGE_LIVE=1 npm run dev -- --url https://...
```

---

### 4. Producción (LIVE posting)

```bash
# .env
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
OPENAI_API_KEY=...

NEWS_AUTO=1
NEWS_DEBUG=0        # Sin verbose

X_LIVE=1            # ⚠️ ACTIVADO PARA PRODUCCIÓN

# Ejecutar
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

**Output esperado:**
```
🤖 Automatic mode: picking trending story...
✅ Generated: mode="single"...
✅ Thread posted successfully!
   View: https://x.com/i/status/...
```

---

## 📚 Variables por función

### News Picker

| Variable | Default | Rango | Propósito |
|----------|---------|-------|----------|
| `NEWS_AUTO` | 1 | 0/1 | Activar picker (0=manual only) |
| `NEWS_MAX_AGE_HOURS` | 24 | 1-72 | Edad máx noticias (horas) |
| `NEWS_REGION_BOOST_LATAM` | 1 | 0.5-2 | Multiplicador boost LatAm |
| `NEWS_DEBUG` | 0 | 0/1 | Logging detallado |

**Ejemplo: Favorecer noticias muy recientes**
```bash
NEWS_MAX_AGE_HOURS=6        # Solo últimas 6 horas
NEWS_REGION_BOOST_LATAM=1.5 # LatAm 50% más importante
NEWS_DEBUG=1                # Ver detalles
```

### Sistema

| Variable | Default | Propósito |
|----------|---------|----------|
| `MAX_POSTS_PER_DAY` | 5 | Máximo posts/día |
| `RSS_FEEDS` | (BBC, DW, etc.) | Custom feeds |

### Safety

| Variable | Default | Propósito |
|----------|---------|----------|
| `X_LIVE` | 0 | 0=safe, 1=arm for posting |

---

## 🎛️ Tuneable: Scoring de noticias

Edita `src/news_picker.ts` (función `scoreStory()`) para cambiar pesos:

```typescript
// Recencia (línea ~60)
if (ageHours < 2) score += 40;   // ← HOT (muy reciente)
else if (ageHours < 6) score += 30;
else if (ageHours < 12) score += 20;
else if (ageHours < 24) score += 10;
else score += 5;                 // ← COLD (vieja)

// LatAm boost (línea ~70)
if (hasLatAmMention(text)) score += 30;  // ← Cambiar a +50 para super boost

// Urgencia (línea ~76)
if (urgencyKeywords.some(...)) score += 15;

// Conflicto (línea ~81)
if (conflictKeywords.some(...)) score += 10;

// Fuente (línea ~87)
if (highReliability...) score += 5;
```

**Ejemplo: Muy agresivo con LatAm**
```typescript
// Si LatAm: +50 (en vez de +30)
// Si urgencia + LatAm: +15 + 50 = 65 solo por eso
```

---

## 🔄 Flujos recomendados

### Flujo de desarrollo

```bash
# 1. Setup inicial
npm install
cp .env.example .env
# (editar .env con tus APIs)

# 2. Test básico
npm run dev

# 3. Test con imagen
IMAGE_LIVE=1 npm run dev

# 4. Validar diferentes stories
npm run dev (múltiples veces)

# 5. Cuando esté listo
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

### Flujo de operación diaria (manual)

```bash
# Morning
npm run dev                # Ver qué noticia eligió

# Si te gusta
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live

# Si no, especifica URL
npm run dev -- --url https://mejor-noticia.com
```

### Flujo de producción (scheduler, futuro)

```bash
# En crontab (cada 15 min)
0 */15 * * * cd /path && X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live >> logs/autopost.log 2>&1

# O con node-schedule (dentro del código)
schedule.scheduleJob('*/15 * * * *', async () => {
  await runOnce(false, true); // armed=true
});
```

---

## 🧪 Checklists de validación

### Antes de producción

- [ ] `.env` tiene todas las APIs válidas
- [ ] `X_LIVE=1` en `.env`
- [ ] Testeé `npm run dev` (DRY RUN OK)
- [ ] Testeé `IMAGE_LIVE=1 npm run dev` (imagen OK)
- [ ] Testeé `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live` (posting OK)
- [ ] Verifiqué que solo postee 1 noticia (daily limit)
- [ ] Verifiqué que evite duplicados (segunda ejecución salta)
- [ ] Verifiqué que el tweet sea ≤270 chars
- [ ] Verifiqué que el tweet esté 100% en español
- [ ] Verifiqué que la imagen tenga logo RG

### Cada día (operación)

- [ ] Ejecuté `npm run dev`
- [ ] Revisé la noticia elegida (¿es relevante?)
- [ ] Si sí → `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live`
- [ ] Verifiqué que posteó en X
- [ ] Revisé el tweet en X.com

### Semanal (maintenance)

- [ ] Revisar `data/bot.sqlite` (posted URLs crecen)
- [ ] Revisar logs (errores, patterns)
- [ ] Ajustar scoring si es necesario (`NEWS_REGION_BOOST_LATAM`, etc.)

---

## 🛠️ Troubleshooting de configuración

### "No APIs keys"
```
❌ Error: "X_API_KEY is undefined"
✅ Solución: Agregar en .env y reiniciar terminal
```

### "Daily limit alcanzado"
```
❌ Output: "Daily limit reached"
✅ Solución: Cambiar en .env
   MAX_POSTS_PER_DAY=10  (o esperar mañana)
```

### "No trending stories"
```
❌ Output: "No suitable trending story"
✅ Solución: 
   1. Verificar RSS feeds online (BBC, DW, etc.)
   2. Reducir NEWS_MAX_AGE_HOURS
   3. Agregar custom feeds en RSS_FEEDS
```

### "Demasiadas imágenes"
```
❌ Problema: ./out/images/ crece rápido
✅ Solución: Agregar a .gitignore
   echo "out/images/*" >> .gitignore
```

### "X no postea"
```
❌ Error: "X API connection failed"
✅ Solución:
   1. Verificar API keys (copiar exacto)
   2. Verificar que account tenga permisos (no suspendida)
   3. Verificar que X_LIVE=1 + --live
```

---

## 📈 Recomendaciones por etapa

### Etapa 1: Exploración (primeros días)
```bash
NEWS_AUTO=1
NEWS_DEBUG=1           # Ver qué elige
NEWS_MAX_AGE_HOURS=24
MAX_POSTS_PER_DAY=5
X_LIVE=0               # SIEMPRE en exploración
```

**Actividad:** Correr `npm run dev` varias veces, ver qué noticias elige.

### Etapa 2: Refinamiento (primera semana)
```bash
NEWS_AUTO=1
NEWS_DEBUG=0
NEWS_MAX_AGE_HOURS=12  # Más agresivo (solo últimas 12h)
NEWS_REGION_BOOST_LATAM=1.5  # LatAm más importante
MAX_POSTS_PER_DAY=3    # Menos posts (más quality)
X_LIVE=0               # Aún sin postear
```

**Actividad:** Correr cada 30 min, ver si scoring es bueno. Manual post para las que te gusten.

### Etapa 3: Producción (después de 1 semana)
```bash
NEWS_AUTO=1
NEWS_DEBUG=0
NEWS_MAX_AGE_HOURS=24
NEWS_REGION_BOOST_LATAM=1.2
MAX_POSTS_PER_DAY=5
X_LIVE=1               # ACTIVADO
```

**Actividad:** Cron cada 15-30 min, automático. Monitor diario.

---

## 🚀 Command reference rápida

```bash
# Setup
npm install
npm run dev

# Desarrollo
npm run dev                                    # DRY RUN
IMAGE_LIVE=1 npm run dev                      # +imagen
npm run dev -- --url https://...              # Manual

# Producción
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live   # LIVE AUTO
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live --url https://... # LIVE MANUAL

# Debug
NEWS_DEBUG=1 npm run dev                      # Verbose
NODE_ENV=development npm run dev              # Extra logging
```

---

## 📊 Ejemplo: Configuración por "perfil"

### Perfil: Conservador (pocas noticias, muy validadas)
```bash
NEWS_AUTO=1
NEWS_MAX_AGE_HOURS=48         # Noticias viejas OK
NEWS_REGION_BOOST_LATAM=0.8   # No favorecer LatAm tanto
MAX_POSTS_PER_DAY=1           # Solo 1 post/día
X_LIVE=0                       # Manual post
```

### Perfil: Agresivo (trending ahora mismo)
```bash
NEWS_AUTO=1
NEWS_MAX_AGE_HOURS=3          # Solo últimas 3 horas
NEWS_REGION_BOOST_LATAM=2     # LatAm 2x importante
MAX_POSTS_PER_DAY=10          # Muchos posts
X_LIVE=1                      # Auto posting
```

### Perfil: LatAm-focused (solo América Latina)
```bash
NEWS_AUTO=1
NEWS_MAX_AGE_HOURS=24
NEWS_REGION_BOOST_LATAM=3     # 3x boost LatAm
MAX_POSTS_PER_DAY=5
RSS_FEEDS="BBC Mundo|https://www.bbc.com/mundo/index.xml,DW Español|https://www.dw.com/es/es/rss.xml,ElPais|https://feeds.elpais.com..."
X_LIVE=1
```

---

**Última actualización:** 25-01-2026  
**Status:** ✅ READY FOR PRODUCTION
