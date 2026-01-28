# Implementación: Sistema de Producción Anti-Duplicado + GeoGate

**Estado:** ✅ COMPLETADO (0 errores TypeScript)  
**Fecha:** 26 de enero 2025

## Cambios Implementados

### 1. **`src/post_history.ts`** - Reescrito (async/await)

**Cambios principales:**
- Estructura TypeScript mejorada con tipos explícitos: `PostHistoryEntry`, `DuplicateReason`
- Funciones ahora **async** usando `fs/promises`:
  - `hasRecentDuplicate(url, title): Promise<{isDuplicate, reason?, canonical_url}>`
  - `recordPosted(params): Promise<void>`
- **Canonicalización de URLs** mejorada:
  - Detecta y elimina tracking params: `utm_*`, `fbclid`, `gclid`, `igshid`, `mc_*`, etc.
  - Normaliza dominios: `www.` → removido
  - Ordena parámetros alfabéticamente para consistency
  - Almacena como `canonical_url` en historial
- **Fingerprinting de títulos**:
  - Elimina tildes y caracteres especiales
  - Filtra stopwords (ES/EN)
  - Genera SHA1 determinístico para deduplicación
- **Ventana de 48h** configurable por `POST_HISTORY_WINDOW_HOURS`
- **Poda automática**: Mantiene últimos 2000 entries (configurable por `POST_HISTORY_MAX_ENTRIES`)
- **Escritura atómica** con temp files para evitar corrupción
- Debug logging con `POST_HISTORY_DEBUG=1`

**Schema de archivo `data/posted.json`:**
```json
[
  {
    "canonical_url": "https://example.com/article",
    "url_hash": "sha1_del_url",
    "title_fingerprint": "sha1_del_titulo",
    "title": "Título original",
    "source": "BBC News",
    "posted_at": "2025-01-26T12:00:00.000Z",
    "tweet_id": "123456789"
  }
]
```

---

### 2. **`src/geo_gate.ts`** - Nuevo módulo

**Función principal:**
```ts
geoGate(params: {
  region_bucket?: RegionBucket | null;
  score?: number | null;
}): { ok: boolean; reason: string | null; region: string; score: number }
```

**Regiones permitidas por defecto:**
- ✅ `US` - Estados Unidos
- ✅ `LATAM` - América Latina
- ✅ `CARIBBEAN` - Caribe
- ✅ `MIDDLE_EAST` - Oriente Medio
- ✅ `GLOBAL_GEO` - Geopolítica global
- ❌ `OTHER` - Rechazado a menos que score >= 85

**Lógica:**
- Si región está en whitelist → `ok: true`
- Si región = OTHER pero score >= 85 → `ok: true, reason: "non_geo_high_confidence"`
- Si región = OTHER y score < 85 → `ok: false, reason: "low_geopolitics"`

---

### 3. **`src/run_once.ts`** - Integración total

**Imports nuevos:**
```ts
import { hasRecentDuplicate, recordPosted, canonicalizeUrl as phCanonicalizeUrl } from "./post_history.js";
import { geoGate, type RegionBucket } from "./geo_gate.js";
```

**Funciones actualizadas:**

#### a) `pickFirstNotDuplicate()` - Ahora async
```ts
async function pickFirstNotDuplicate(candidates: any[], debug = false): 
  Promise<{picked: any; reason: string} | null>
```
- Itera sobre candidatos ranked
- Para cada uno:
  1. Verifica que tenga `url` (o `link`) y `title`
  2. Llama `await hasRecentDuplicate(url, title)` → salta si es dup
  3. Usa `geoGate({region_bucket, score})` → salta si falla geo
  4. Retorna el primero que pase todos los checks
- Log: `[DROP] <reason> :: <title>`
- Log: `[DEDUP] ✅ Candidate N selected`

#### b) `recordPosted()` - Ahora await
```ts
await recordPosted({
  url: selected.url,
  title: selected.title,
  source: selected.source ?? undefined,
  tweet_id: postResult.tweetIds[0],
});
```
- **Crítico:** Solo se llama DESPUÉS de que X post tenga éxito (`actuallyPosted === true`)
- Parámetro `filePath` opcional (default: `data/posted.json`)

#### c) `hasRecentDuplicate()` - Ahora await
```ts
const dupCheck = await hasRecentDuplicate(bestItem.link, bestItem.title);
```

**Flujo de selección de candidato:**
```
1. Curate determinístico → best_pick
2. Si CURATOR_LLM=1: refinar con LLM → best_pick (score >= 70)
3. Anti-duplicate check: await hasRecentDuplicate(url, title)
   ├─ Si no es dup → ✅ safe to post
   └─ Si es dup → buscar fallback:
       └─ await pickFirstNotDuplicate(ranked_candidates)
           ├─ Checks: !dup && geoGate.ok
           └─ Retorna primer válido o null
4. Si no hay candidato válido → SKIP POST
5. Generate tweet + image
6. Post to X (armed)
7. Si post exitoso → await recordPosted(...) 
```

**Logs esperados:**
```
[DROP] duplicate_url_recent :: "Story title..."
[DROP] duplicate_title_recent :: "Story title..."
[DROP] low_geopolitics (region=OTHER score=79) :: "Story title..."
[DEDUP] ✅ Candidate 2 selected: Reuters | score=82 | region=LATAM
```

---

### 4. **`scripts/autopost-hourly.sh`** - Simplificado con flock

**Cambios:**
- Eliminada lógica de retry compleja
- Agregado `flock -n` (non-blocking) para evitar overlaps
- Lock file: `/tmp/rg_autopost.lock`

**Comportamiento:**
```bash
flock -n "$LOCK_FILE" bash -c '
  # Ejecuta ciclo
'  || {
  # Si lock está ocupado, SKIP sin esperar
}
```

- Si anterior ciclo ya está corriendo → salta gracefully (`[SKIP] locked...`)
- No hay double-posts aunque haya overlaps en el cron

**Logs:**
```
[CYCLE] start
[SUCCESS] cycle executed
[ERROR] cycle failed
[SKIP] locked (another run in progress)
```

---

## Verificación Rápida

```bash
# 1) TypeScript compilation
cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
./node_modules/.bin/tsc --noEmit  # ✅ 0 errors

# 2) Bash syntax
bash -n scripts/autopost-hourly.sh  # ✅ OK

# 3) Create directories
mkdir -p data logs

# 4) Test run (dry-run por defecto)
POST_HISTORY_DEBUG=1 npm run dev

# 5) Check history file
cat data/posted.json | jq '.[0]'

# 6) Test live (con X_LIVE=1)
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live

# 7) Verify post in history
cat data/posted.json | jq '.[] | select(.tweet_id != null) | length'
```

---

## Deployment Checklist

- [x] TypeScript: 0 errors
- [x] Bash syntax: valid
- [x] post_history.ts: async/await implementation
- [x] geo_gate.ts: hard filtering logic
- [x] run_once.ts: full integration
- [x] autopost-hourly.sh: flock non-blocking
- [x] Imports: corrected (phCanonicalizeUrl alias)
- [x] Types: PostHistoryEntry, DuplicateReason, RegionBucket

---

## Environment Variables

**Post History:**
- `POST_HISTORY_PATH` (default: `data/posted.json`)
- `POST_HISTORY_WINDOW_HOURS` (default: `48`)
- `POST_HISTORY_MAX_ENTRIES` (default: `2000`)
- `POST_HISTORY_DEBUG` (set to `1` for verbose logs)

**Curator:**
- `CURATOR_LLM` (set to `1` to enable LLM curator)
- `CURATOR_LLM_TIMEOUT_MS` (default: `15000`)
- `CURATOR_LLM_K` (default: `5`)
- `CURATOR_DEBUG` (set to `1` for scoring details)

**Posting:**
- `X_LIVE` (set to `1` to enable live X posting)
- `IMAGE_LIVE` (set to `1` to enable image generation)

---

## Notas Importantes

1. **`recordPosted()` SOLO se llama después de éxito de X post** → evita registrar posts que fallaron
2. **`geoGate` es estricto** → solo regiones whitelisted o score >= 85
3. **`flock -n` es non-blocking** → never waits, skip if locked
4. **URL canonicalization es determinística** → mismo URL siempre produce mismo hash
5. **48h window** → después de 48h una historia puede repostearse si aparece de nuevo

---

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| `[DROP] duplicate_url_recent` | URL ya posteada en últimas 48h | Normal, esperado. Intenta siguiente candidato |
| `[DROP] low_geopolitics` | Region=OTHER y score<85 | Normal, geo-filtering. Cura mejor con LLM |
| `[SKIP] locked` | Anterior ciclo aún ejecutándose | Normal. Espera próxima hora |
| No se crea `data/posted.json` | Permisos de escritura | Verificar `chmod 755 data/` |
| `recordPosted()` nunca se llama | X post fallando | Check X_LIVE, API keys, rate limits |

