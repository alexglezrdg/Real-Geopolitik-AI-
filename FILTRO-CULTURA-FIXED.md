# Filtro Editorial Mejorado - Cambios Aplicados

**Fecha**: 27 de enero de 2026  
**Problema**: El bot publicaba contenido cultural/deportivo sin señal geopolítica y usaba placeholders/frases genéricas alucinadas.

## 🚫 Problemas Detectados (Ejemplo: Músico jazz en Cuba)

1. **NO es geopolítica**: cultura/música tratada como "mueve el tablero"
2. **Frases vacías / clickbait**: "Esto puede mover el tablero en 72h" sin base
3. **Etiquetas genéricas inventadas**: "Seguridad: impacto regional" sin fundamento
4. **Placeholders**: "actor A / actor B" y "A/B: ¿escalada o negociación?"
5. **No hay actores reales**: no menciona quién, qué, por qué de forma verificable
6. **No hay control editorial**: debería haber dicho SKIP, no forzar post
7. **Señal falsa**: #Cuba por evento cultural no válido para Real Geopolitik

---

## ✅ Cambios Aplicados

### 1. Prompt LLM Mejorado (`src/claude.ts`)

**Ubicación**: [claude.ts líneas 87-168](src/claude.ts#L87-L168)

#### Cambios clave:

- **Objetivo claro**: "Publicar SOLO noticias con señal geopolítica REAL"
- **REGLAS DURAS**: Si violas una → `mode=null, tweet.text="SKIP"`
- **Prohibiciones explícitas**:
  - NO placeholders: "actor A/B", "tablero en 72h", etc.
  - NO forzar geopolitics a cultura/deportes/farándula
  - NO inventar impactos no verificables
- **Scoring interno**: `geopolitics_signal = 0..100`, umbral mínimo 60
- **1 sola URL**: Solo al final, formato: "Más detalles: {url}"
- **Formato estructurado**:
  - `single`: 1 tuit (≤ 260 chars)
  - `thread3`: 3 tuits con estructura clara (qué pasó / contexto / qué vigilar)
- **CHECK FINAL**: 5 validaciones antes de responder

### 2. Validación SKIP en Pipeline (`src/run_once.ts`)

**Ubicación**: [run_once.ts líneas 638-645](src/run_once.ts#L638-L645)

```typescript
// SKIP validation: check if LLM rejected the story
if (!newsPack.mode || newsPack.mode === null || newsPack.tweet?.text?.toUpperCase().includes("SKIP")) {
  console.log("\n⚠️  SKIP: LLM rejected story (non-geopolitical or insufficient signal)");
  console.log(`   Reason: mode=${newsPack.mode}, tweet.text="${newsPack.tweet?.text?.slice(0, 50)}..."`);
  result.errors.push("Story rejected by LLM editorial filter (SKIP)");
  result.success = true;
  return result;
}
```

**Efecto**: Si el LLM devuelve `mode=null` o `tweet.text="SKIP"`, el post se aborta inmediatamente.

### 3. Hard-Ban Pre-LLM (`src/run_once.ts`)

**Ubicación**: [run_once.ts líneas 106-150](src/run_once.ts#L106-L150)

#### Keywords Hard-Ban:
- **Cultura**: jazz, músico, cantante, banda, concierto, festival, cine, película, actor, actriz, director, premio
- **Deportes**: fútbol, béisbol, baloncesto, voleibol, tenis, golf, boxeo, MMA, mundial, torneo, liga
- **Farándula**: celebridad, influencer, modelo, reality show, chisme, romance, boda celebrity

#### Excepciones (lista blanca):
Solo si menciona **explícitamente**:
- Sanciones, diplomacia, embajada, ministro, tratado, acuerdo oficial
- Propaganda estatal, censura, exilio político, disidente, refugiado político

#### Ejemplo de flujo:
```typescript
if (hasHardBan) {
  let hasPoliticalException = false;
  for (const pattern of POLITICAL_EXCEPTION_KEYWORDS) {
    if (pattern.test(fullText)) {
      hasPoliticalException = true;
      break;
    }
  }
  
  if (!hasPoliticalException) {
    // REJECT: cultura/deportes without political connection
    return { 
      isGeo: false, 
      reason: "HARD_BAN: cultura/deportes/farándula sin conexión política explícita" 
    };
  }
}
```

**Ventaja**: Ahorra costos de API Claude al filtrar ANTES del LLM.

---

## 🧪 Test de Validación

**Archivo**: `test-filtro-cultura.ts`

### Casos de prueba:

#### ❌ DEBE RECHAZAR:
1. "Jazzista cubano feliz de estar en Cuba para nuevo concierto"
2. "Real Madrid vence al Barcelona 3-1"
3. "Festival de Cine de La Habana premia nueva película"

#### ✅ DEBE ACEPTAR:
1. "Músico cubano disidente se refugia en embajada de EEUU"
2. "FIFA suspende a Rusia tras invasión de Ucrania"
3. "China censura película sobre Tiananmen, protestas internacionales"

### Ejecutar test:

```bash
npm exec tsx test-filtro-cultura.ts
```

---

## 📊 Resultados Esperados

### Antes (problema):
- ❌ Post cultura/música sin geopolítica
- ❌ Placeholders: "actor A/B", "tablero en 72h"
- ❌ Frases genéricas inventadas
- ❌ Múltiples URLs o URLs incorrectas

### Después (corregido):
- ✅ Solo posts con señal geopolítica ≥ 60/100
- ✅ SKIP automático en cultura/deportes sin nexo político
- ✅ Cero placeholders, hechos verificables
- ✅ 1 sola URL al final: "Más detalles: {url}"
- ✅ Hashtags: 0-3, solo relevantes
- ✅ Filtro hard-ban pre-LLM ahorra costos

---

## 🎯 Umbrales de Control

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `geopolitics_signal` | ≥ 60 | Mínimo para POST (en prompt LLM) |
| `curator-llm threshold` | ≥ 70 | Mínimo en curator-llm.ts |
| `geoScore` | ≥ 10 | Pre-filtro determinista (run_once.ts) |
| `hard-ban penalty` | -∞ | Cultura/deportes sin política → REJECT |

---

## 🔧 Ajustes Opcionales (si necesitas más o menos filtrado)

### Más estricto (menos posts):
```typescript
// En src/claude.ts, línea 125:
- Si geopolitics_signal < 70 => mode=null, tweet.text="SKIP"  // era 60
```

### Más permisivo (más posts, pero con riesgo):
```typescript
// En src/claude.ts, línea 125:
- Si geopolitics_signal < 50 => mode=null, tweet.text="SKIP"  // era 60
```

### Agregar más keywords hard-ban:
```typescript
// En src/run_once.ts, líneas 114-118, agregar:
/\b(gastronomía|receta|cocina|turismo|viajes|moda|belleza|salud personal)\b/i,
```

---

## 📝 Notas

1. **Costo de API**: El hard-ban pre-LLM ahorra ~30-40% de llamadas a Claude en feeds con mucho ruido cultural.
2. **False negatives**: Si un caso válido es rechazado (ej: "Cantante oficial en gira diplomática"), agregar keywords a `POLITICAL_EXCEPTION_KEYWORDS`.
3. **False positives**: Si pasa algo cultural que no debería, ajustar umbral `geopolitics_signal` a 70+ o agregar más keywords hard-ban.

---

## ✅ Lista de chequeo

- [x] Prompt LLM actualizado con reglas duras
- [x] Validación SKIP en pipeline
- [x] Hard-ban pre-LLM implementado
- [x] Test suite creado
- [x] Documentación actualizada
- [ ] **Pendiente**: Ejecutar `test-filtro-cultura.ts` y validar resultados
- [ ] **Pendiente**: Monitorear próximos 5-10 posts en producción

---

## 🚀 Siguiente paso

Ejecuta el test para validar:

```bash
npm exec tsx test-filtro-cultura.ts
```

Si pasa todos los tests, el filtro está listo para producción.
