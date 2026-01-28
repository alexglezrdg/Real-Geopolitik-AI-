# DEDUP RULES v2 (TTL=14 días + Simhash)

## Overview
Anti-duplicate system que previene:
1. **Repetición de la misma historia** (diferentes fuentes, URLs variadas)
2. **Duplicado de "Más detalles:" + múltiples links** en tweets
3. **Google News redirects** (detecta story vs redirect)

---

## Estrategia de Deduplication

### 3 Niveles de Detección

#### Nivel 1: **DUP_URL** (URL Exacta)
- **Check**: SHA1(canonicalUrl) en store con TTL=14d
- **Acción**: SKIP si URL exacta ya existe
- **Ejemplo**: Si ya posteastе `news.google.com/rss/articles/CBMi...`, saltea si vuelve a aparecer
- **Tolerancia**: Canonicalización standard (remove utm_, fbclid, anchors)

#### Nivel 2: **DUP_FP** (Fingerprint = Título normalizado + Región + Fecha)
- **Check**: SHA1(dateIso + region + topTokens(title)) en store con TTL=14d
- **Acción**: SKIP si fingerprint idéntico
- **Ejemplo**: 
  - Story 1: "Kremlin advierte sobre posible bloqueo naval a Cuba" (27-01-2025, LATAM)
  - Story 2: "Kremlin alerta de un posible bloqueo naval a Cuba" (27-01-2025, LATAM)
  - → SAME FINGERPRINT → DUP_FP
- **Normalización titulo**:
  ```
  lowercase
  remove accents
  remove punctuation (keep spaces)
  tokenize (min 3 chars)
  take top 12 tokens sorted
  ```

#### Nivel 3: **DUP_NEAR** (Simhash con Hamming Distance ≤ 3)
- **Check**: simhash(title + snippet) vs stored simhash, Hamming ≤ 3 = near-duplicate
- **Acción**: SKIP si similitud texto muy alta
- **Ejemplo**:
  - Story 1: "Venezuela Maduro anuncia nuevas sanciones contra opositores" (signature A)
  - Story 2: "Venezuela - Maduro anuncia nuevas sanciones contra opositores." (signature B)
  - → Hamming(A, B) = 2 ≤ 3 → DUP_NEAR
- **Simhash**: 64-bit hash, detecta typos, puntuación, reordenes menores
- **TTL**: 14 días

---

## Reglas de Precedencia

```
1. Check URL exacta → DUP_URL? → SKIP
2. Check fingerprint → DUP_FP? → SKIP  
3. Check simhash → DUP_NEAR? → SKIP
4. OK → PICK
```

---

## TTL (Time-To-Live)

**`DEDUPE_TTL_DAYS=14`** (configurablevia env)

Meaning:
- Una story posted hoy NO PUEDE re-postear en los próximos **14 días** incluso si:
  - Viene de otra fuente RSS
  - Está en Google News redirect
  - Alguien reescribió el titular ligeramente

---

## Parámetros Ajustables

```env
# En .env o .env.local
DEDUPE_TTL_DAYS=14              # Default 14, puede ser 7-21
DEDUPE_HAMMING=3                # Hamming distance threshold (2-4 típicamente)
DEDUPE_SIG_SCAN=300             # Cuántos recientes comparar contra (300 = ~2 semanas)
```

---

## URL Cleanup (Prevenir "Más detalles:" Duplicado)

### Función `stripUrlsAndMoreDetails(text)`
Limpia texto antes de agregar URL final:
1. Split por líneas
2. Remove líneas con regex `más detalles:` (case-insensitive)
3. Remove líneas con URLs (`https?://`)
4. Join

### Flujo de Posting
```
1. LLM/template genera tweet TEXT (sin URL)
2. stripUrlsAndMoreDetails(TEXT) → clean
3. buildFinalTweetText(clean, finalURL, hashtags)
4. Append: "\n\nMás detalles: {URL}\n{hashtags}"
5. Enforce max 280 chars
6. Post
```

**Garantía**: Solo 1 "Más detalles:" + 1 URL por tuit final.

---

## Datos Persistidos en SQLite

### Tabla: `dedupe_entries`
```sql
CREATE TABLE dedupe_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash TEXT,              -- SHA1(canonicalUrl)
  fingerprint TEXT,           -- SHA1(date|region|topTokens)
  signature TEXT,             -- simhash(title+snippet)
  region TEXT,                -- LATAM, US, GLOBAL, etc.
  source TEXT,                -- Reuters, Infobae, etc.
  title TEXT,                 -- Original title
  created_at TEXT             -- ISO datetime (pruned if > 14d)
);
```

---

## Logging en Dry-Run / Live

Cuando se detecta duplicate, se log:

```
[DROP] DUP_URL :: "Kremlin advierte bloqueo..."
[DROP] DUP_FP :: "Venezuela Maduro sanciones..."
[DROP] DUP_NEAR(h=2) :: "Cuba denuncia amenaza bloqueo..."
```

Formato: `[DROP] {REASON}(info) :: "{título}"`

---

## Test Cases (test-dedupe-final.ts)

Validar:
1. ✅ Same story, different source URLs (Google News vs Infobae)
2. ✅ Nearly identical title with variation (typo, punctuation)
3. ✅ Different stories (should NOT dedupe)
4. ✅ Exact URL dedup only
5. ✅ Single URL cleanup (no double "Más detalles:")
6. ✅ Remove embedded URLs

---

## FAQ

**Q: ¿Se puede postear la misma noticia con diferentes ángulos?**
A: No con este sistema. Si quieres matices, cambia significativamente el titular (>3 palabras diferentes).

**Q: ¿14 días es mucho?**
A: Es por design. Cuba/Venezuela/Rusia movidas que se prolongan semanas; evita fatiga. Ajustable con `DEDUPE_TTL_DAYS`.

**Q: ¿Y si viene de GDELT + RSS diferentes?**
A: Ambos pasan por dedupe ANTES de ranking/LLM. Si duplicados, solo uno sobrevive.

**Q: ¿URL canonical muy estricto?**
A: Hace 80% del trabajo. Simhash (hamming) agarra el resto (typos, rewrites).

---

## Checklist Pre-Deploy

- [ ] TTL set to 14d en dedupe_store.ts
- [ ] stripUrlsAndMoreDetails export en run_once.ts
- [ ] buildFallbackNewsPack NO tiene "Más detalles:" en prompt
- [ ] test-dedupe-final.ts corre sin errores
- [ ] Dry-run 10 posts, check logs para DUP_* patterns
- [ ] Postear 1 live, esperar 5 min, hacer dry-run misma URL → debe saltar

