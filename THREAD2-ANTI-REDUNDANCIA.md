# 🎯 Thread2 + Validación Anti-Redundancia

**Fecha**: 27 de enero 2026  
**Estado**: ✅ Implementado y testeado

---

## 🔧 Problema Resuelto

**Síntoma**: Cuando se generaba un thread, el tweet #2 a veces repetía el contenido del tweet #1, causando sensación de "bug".

**Ejemplo del problema**:
- T1: "Trump afirma que Irán busca acuerdo con EEUU."
- T2: "El presidente Trump dijo que Irán busca un acuerdo." ← Repetitivo

---

## ✨ Solución Implementada

### 1. **Longitud Dinámica del Hilo** (single / thread2 / thread3)

Antes solo había `single` y `thread3`. Ahora:

- **single**: 1 tweet (cuando title lo dice todo)
- **thread2**: 2 tweets (cuando hay 1 dato extra útil)
- **thread3**: 3 tweets (cuando hay ≥2 hechos distintos)

### 2. **Reglas Anti-Redundancia en el Prompt**

El prompt ahora incluye:

```
7) LONGITUD DINÁMICA - NO REPETICIÓN (CRÍTICO):
   
   - thread2: 2 tuits cuando hay 1 dato extra útil:
     T1: Qué pasó + por qué importa (1 frase clara).
     T2: SOLO información NUEVA que NO esté en T1 
         (dato específico: cifra, contexto inmediato, 
          actor secundario, consecuencia verificable).
     Si no puedes escribir T2 sin repetir T1, usa "single".
   
   PROHIBIDO que T2 sea paráfrasis de T1. 
   Cada tweet debe aportar información distinta.

8) SELF-CHECK ANTI-DUPLICACIÓN:
   - Define "key_points" de cada tweet (3-6 palabras clave).
   - Si overlap de key_points entre T1 y T2 > 35% 
     => reescribe T2 o reduce a thread2/single.
```

### 3. **Validación Automática de Similitud (Jaccard)**

Código agregado en `src/claude.ts`:

```typescript
function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function validateThreadUniqueness(tweets: string[]): boolean {
  if (tweets.length < 2) return true;
  
  const similarity = jaccardSimilarity(tweets[0], tweets[1]);
  console.log(`📊 Thread similarity T1↔T2: ${(similarity * 100).toFixed(1)}%`);
  
  // Si similitud > 35%, tweets son muy similares
  return similarity <= 0.35;
}
```

Si la similitud supera 35%, el sistema **automáticamente degrada** el thread a `single`.

---

## 📊 Resultados del Test

### Test 1: Noticia de Irán/Trump (contenido suficiente)
```
✅ Mode: thread2
📊 Similitud T1↔T2: 5.0%

Tweet 1: Trump afirma que Irán busca acuerdo con Estados Unidos 
         mientras despliega gran armada naval en la región...

Tweet 2: Según reportes desde Dubái, la armada iraní desplegada 
         es 'más grande que la de Venezuela', creando paradoja...
```
✅ **T2 agrega información nueva** (comparación Venezuela, paradoja)

### Test 2: Noticia simple Francia/Alemania
```
✅ Mode: single
Reason: Baja señal geopolítica, rechazado correctamente
```

---

## 🔍 Archivos Modificados

1. **src/claude.ts**
   - Tipo `NewsPack.mode`: agregado `"thread2"`
   - Funciones `jaccardSimilarity()` y `validateThreadUniqueness()`
   - Prompt actualizado con reglas anti-redundancia
   - Validación automática post-generación

2. **src/run_once.ts**
   - `extractTweetsFromPack()`: soporte para `thread2`

3. **test-thread2.ts** (nuevo)
   - Suite de tests para validar la funcionalidad

---

## 🚀 Uso

El sistema ahora funciona automáticamente:

1. Claude genera el thread basándose en contenido disponible
2. Si detecta que T2 repetiría T1, usa `thread2` o `single`
3. El código valida similitud post-generación
4. Si similitud > 35%, degrada automáticamente a `single`

**No requiere configuración adicional** - funciona out-of-the-box.

---

## 📈 Mejoras Adicionales Futuras (Opcional)

1. **SimHash**: Si Jaccard no es suficiente, implementar SimHash para detección más robusta
2. **Umbral configurable**: Permitir ajustar el 35% vía env var
3. **Métricas**: Trackear % de threads degradados para optimizar prompts

---

## 🎯 Conclusión

El problema de tweets redundantes está **resuelto** mediante:
- ✅ Prompt explícito con ejemplos de qué NO hacer
- ✅ Longitud dinámica (thread2 nuevo)
- ✅ Validación automática de similitud
- ✅ Degradación automática si hay overlap

**Resultado**: Threads más informativos, sin sensación de "bug" por repetición.
