# ✅ BUGS CLÁSICOS CORREGIDOS: Placeholders + Frases Cortadas + Portraits

**Fecha**: 27 enero 2026  
**Status**: ✅ DEPLOYED & TESTED  
**Tests**: 2/2 exitosos

---

## 🐛 Bugs Detectados (del screenshot)

### 1. **Frase cortada/incompleta** ❌
Tweet termina en "en" → Se ve cortado, mata credibilidad

### 2. **Plantilla genérica** ❌
```
Seguridad: impacto regional
Economía: presión/sanciones
Política: alianzas en juego
```
→ No aporta nada, puro template leak

### 3. **Placeholders prohibidos** ❌
- "actor A / actor B"
- "A/B: ¿Escalada o negociación?"
→ Template leak obvio

### 4. **"Qué vigilar" inventado** ❌
No basado en hechos reales del input

### 5. **No usó portrait disponible** ❌
Noticia de Trump/Petro/Maduro pero no usó fotos del folder `assets/portraits/`

---

## ✅ Soluciones Implementadas

### 1. **Prompt Mejorado** ([src/claude.ts](src/claude.ts))

#### Reglas nuevas añadidas:

```typescript
2) PROHIBIDO placeholders y plantillas vacías:
   - Prohibido: "actor A/B", "impacto regional", "alianzas en juego", 
     "presión/sanciones" genérico, "mueve el tablero", "A/B: …".
   - Prohibido: "Seguridad: impacto regional / Economía: presión/sanciones / 
     Política: alianzas en juego".
   - Cada frase debe referirse a un HECHO del title/snippet.

3) NO TWEETS INCOMPLETOS:
   - Ningún tweet puede terminar con: "en", "y", "con", "de", "para", 
     ":" o comas.
   - CRÍTICO: Verifica que cada tweet termine con punto ANTES de responder.
```

#### CHECK FINAL actualizado:

```typescript
- ¿Hay placeholders ("actor A/B", "impacto regional")? → REESCRIBE
- ¿Algún tweet termina con "en", "y", "con", ":"? → REESCRIBE
- ¿Hay plantillas genéricas ("Seguridad: / Economía:")? → REESCRIBE
- ¿"Qué vigilar" sin base en input? → ELIMÍNALO
```

---

### 2. **Validación Post-Proceso Automática**

Código nuevo en [src/claude.ts](src/claude.ts):

```typescript
// VALIDACIÓN POST-PROCESO: Frases cortadas y placeholders
const allTweetsToValidate = [output.tweet.text, ...output.thread.map(t => t.text)];
let hasErrors = false;

for (const tweetText of allTweetsToValidate) {
  // Check 1: Frases cortadas (termina en preposición/conjunción)
  if (/(\s+(en|y|con|de|para|a|o|e|u|ni|pero|si)\s*|[:,]\s*)$/.test(tweetText)) {
    console.error(`❌ TWEET INCOMPLETO detectado: "${tweetText.slice(-30)}"`);
    hasErrors = true;
  }
  
  // Check 2: Placeholders prohibidos
  const forbiddenPatterns = [
    /actor\s+[AB]/i,
    /impacto\s+regional(?!\s+específico)/i,
    /alianzas\s+en\s+juego/i,
    /mueve\s+el\s+tablero/i,
    /A\/B:/,
    /Seguridad:\s*impacto/i,
    /Economía:\s*presión/i,
    /Política:\s*alianzas/i,
  ];
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(tweetText)) {
      console.error(`❌ PLACEHOLDER prohibido: ${pattern.source}`);
      hasErrors = true;
    }
  }
}

// Si hay errores críticos, usar fallback
if (hasErrors) {
  return buildFallbackNewsPack(params.title, params.url, params.source);
}
```

**Comportamiento**: Si detecta errores → usa fallback (tweet simple y limpio)

---

### 3. **Portrait Detection Mejorado** ([src/image_mode.ts](src/image_mode.ts))

#### Keywords expandidos:

```typescript
"petro": [..., "gobierno petro", "bogotá", "mandatario colombiano"],
"maduro": [..., "caracas", "chavismo", "régimen venezolano"],
"trump": [..., "administración trump", "gobierno trump"],
```

#### Mapeo especial para archivos existentes:

```typescript
// En getAvailablePortraits():
if (fileLower.includes("maduro")) {
  portraits.set("maduro", path.join(PORTRAITS_DIR, file));
  portraits.set("nicolás maduro", path.join(PORTRAITS_DIR, file));
  portraits.set("venezuela", path.join(PORTRAITS_DIR, file));
}
if (fileLower.includes("petro") || fileLower.includes("gpetro")) {
  portraits.set("petro", path.join(PORTRAITS_DIR, file));
  portraits.set("gustavo petro", path.join(PORTRAITS_DIR, file));
  portraits.set("colombia", path.join(PORTRAITS_DIR, file));
}
```

**Resultado**: Ahora detecta correctamente:
- `MADURO.jpg` → mapea a "maduro", "venezuela"
- `gpetro-3.jpg` → mapea a "petro", "colombia"

---

## 📊 Resultados de Tests

### Test 1: Petro/Maduro
```
✅ Mode: thread2
✅ Portrait: MADURO.jpg detectado
✅ Sin placeholders
✅ Sin frases cortadas
✅ Similitud T1↔T2: 2.7%

T1: Gustavo Petro exige a Estados Unidos devolver a Nicolás Maduro...
T2: Maduro agradeció públicamente el apoyo de Petro...
```

### Test 2: Genérico
```
✅ Correctamente rechazado (mode=null, SKIP)
```

---

## 🔍 Qué Detecta la Validación

| Error | Patrón Regex | Acción |
|-------|--------------|--------|
| **Frase cortada** | `/(\s+(en\|y\|con\|de\|para)\s*\|[:,]\s*)$/` | Rechazar → Fallback |
| **"actor A/B"** | `/actor\s+[AB]/i` | Rechazar → Fallback |
| **"impacto regional"** | `/impacto\s+regional(?!\s+específico)/i` | Rechazar → Fallback |
| **"alianzas en juego"** | `/alianzas\s+en\s+juego/i` | Rechazar → Fallback |
| **"A/B:"** | `/A\/B:/` | Rechazar → Fallback |
| **Plantilla "Seguridad:/Economía:"** | `/Seguridad:\s*impacto\|Economía:\s*presión/i` | Rechazar → Fallback |

---

## 🎯 Antes vs Después

### ANTES (con bugs)
```
Tweet 1: "Contexto: Gustavo Petro afirmó que Estados Unidos debe 
devolver a Nicolás Maduro a Venezuela y criticó el ataque militar 
del pasado 3 de enero en Caracas, en"  ← ❌ CORTADO

Tweet 2: "• Seguridad: impacto regional
• Economía: presión/sanciones
• Política: alianzas en juego"  ← ❌ PLANTILLA GENÉRICA

Tweet 3: "Vigilar: si actor A confirma, escalada; si actor B modera, 
negociación. A/B: ¿Escalada o negociación?"  ← ❌ PLACEHOLDERS

Imagen: DALL·E genérico (sin portrait)  ← ❌ NO USÓ FOTO DE MADURO
```

### DESPUÉS (corregido)
```
Tweet 1: "Gustavo Petro exige a Estados Unidos devolver a Nicolás 
Maduro a Venezuela y critica ataque militar del 3 de enero en Caracas. 
El presidente colombiano demanda respeto a la soberanía venezolana."  
← ✅ COMPLETO, SIN PLACEHOLDERS

Tweet 2: "Maduro agradeció públicamente el apoyo de Petro. Las 
declaraciones ocurren en medio de crecientes tensiones entre Caracas 
y Washington por sanciones económicas."  
← ✅ INFORMACIÓN NUEVA, VERIFICABLE

Imagen: DALL·E + Portrait de Maduro  ← ✅ USÓ FOTO DEL FOLDER
```

---

## 📁 Archivos Modificados

### 1. [src/claude.ts](src/claude.ts)
- ✅ Prompt actualizado con reglas anti-placeholders
- ✅ CHECK FINAL mejorado
- ✅ Validación post-proceso automática
- ✅ Aplicado a ambas funciones: `generateThreadWithClaude()` y `generateCubaTrumpBlockadeNewsPack()`

### 2. [src/image_mode.ts](src/image_mode.ts)
- ✅ Keywords expandidos (petro, maduro, trump, etc.)
- ✅ Mapeo especial para archivos existentes
- ✅ `getAvailablePortraits()` mejorado

### 3. [test-validacion-post-proceso.ts](test-validacion-post-proceso.ts)
- ✅ Test completo de validación
- ✅ Test de portrait detection

---

## 🚀 Uso

**No requiere configuración** - Funciona automáticamente:

1. **Prompt mejorado** instruye a Claude explícitamente
2. **Validación post-proceso** detecta errores
3. **Fallback automático** si hay problemas
4. **Portrait detection** mejorado para archivos existentes

### Monitoreo en logs:

```bash
# Busca estas líneas:
✅ Generated: mode="thread2" urgency="CLAVE" hashtags=[#Colombia,#Venezuela]
[IMG] mode: COMPOSED
[IMG] portrait: MADURO.jpg

# O errores (triggerea fallback):
❌ TWEET INCOMPLETO detectado: "...en "
❌ PLACEHOLDER prohibido detectado: /actor\s+[AB]/
```

---

## 🎓 Próximos Pasos (Opcional)

1. **Métricas**: Trackear % de posts que usan fallback por errores
2. **A/B Testing**: Comparar engagement con/sin portraits
3. **Fine-tuning**: Si Claude sigue generando placeholders, agregar más ejemplos negativos al prompt

---

## ✅ Checklist Final

- [x] Prompt actualizado con reglas duras
- [x] Validación post-proceso implementada
- [x] Portrait detection mejorado
- [x] Tests pasando (2/2)
- [x] Backward compatible (no breaking changes)
- [x] Logs informativos
- [x] Fallback automático funcional

---

**🎉 Bugs corregidos con validación automática fail-safe**
