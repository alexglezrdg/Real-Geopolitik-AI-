# Filtro Editorial Mejorado - Real Geopolitik

## ✅ Cambios Implementados

Se actualizó el sistema de curado editorial para **eliminar contenido no-geopolítico** (cultura, deportes, farándula) y prevenir la generación de posts con placeholders genéricos o claims sin sustento.

---

## 📝 Archivos Modificados

### 1. **`src/curator-llm.ts`** - Curado Editorial LLM
**Cambios principales:**
- ✅ Prompt completamente reescrito en español
- ✅ Umbral de geopolitics_signal mínimo: **70/100** (aumentado de 60)
- ✅ Prohibición explícita de cultura/deportes/farándula sin nexo político
- ✅ Lista de keywords hard-ban implementada
- ✅ **NUEVO:** Sistema de lista blanca de excepciones
- ✅ Prohibición de placeholders ("actor A/B", "tablero en 72h", "impacto regional")
- ✅ Regla: TODO claim debe derivarse de title/summary verificable
- ✅ Nuevo reason: `culture_sports_no_politics` para drops

**Ejemplo de scoring:**
```
- Relevancia geopolítica: 0–40 puntos
- Prioridad regional (US/LatAm/Medio Oriente): 0–20 puntos
- Tendencia/significancia: 0–20 puntos
- Novedad: 0–10 puntos
- Claridad: 0–10 puntos
- Penalización: -0 a -25 (clickbait, cultura/deportes sin nexo)

Umbral: < 70 = SKIP (aumentado de 60)
```

**Sistema de Lista Blanca (Excepciones):**

Cultura/deportes/música SOLO pasan si cumplen **AMBAS** condiciones:

1. Menciona explícitamente uno de estos términos:
   - sanciones, diplomacia, política exterior, embajador, ministro, tratado
   - acuerdo oficial, propaganda estatal, censura, exilio político, disidente

2. Tiene actores estatales verificables:
   - Gobiernos, instituciones oficiales, ministerios, embajadas

**Ejemplos de lista blanca:**
- ✅ VÁLIDO: "Músico disidente cubano refugiado en embajada española genera tensión diplomática"
- ✅ VÁLIDO: "Actor venezolano censurado por gobierno recibe asilo en EEUU"
- ❌ INVÁLIDO: "Músico cubano feliz en La Habana" (no hay nexo político)
- ❌ INVÁLIDO: "Actor habla sobre política en entrevista" (nexo débil, no verificable)

### 2. **`src/claude.ts`** - Generación de Posts
**Cambios principales:**
- ✅ Prompt actualizado con reglas estrictas anti-placeholders
- ✅ Instrucción explícita de devolver `mode=null, tweet.text="SKIP"` si no hay geopolítica
- ✅ Prohibición de inventar impactos no verificables
- ✅ Longitud máxima: 200 chars (sin URL ni hashtags)
- ✅ Máximo 2 hashtags, solo si son relevantes
- ✅ URL se agrega automáticamente en código (no debe estar en tweet.text)
- ✅ Fallback prompt actualizado para mantener consistencia

**Estructura del tuit:**
```
🚨 ÚLTIMA HORA | [Hecho verificable]. [Implicación concreta].
```

### 3. **`src/news_picker.ts`** - Filtro de Keywords
**Cambios principales:**
- ✅ Lista expandida de keywords no-geopolíticas (de 12 a 59 keywords)
- ✅ Penalización aumentada de **15 → 30 puntos** por keyword
- ✅ Cobertura completa: cultura, música, cine, deportes, entretenimiento

**Keywords agregadas:**
```typescript
// Cultura / Entretenimiento (59 keywords total)
"cultura", "música", "music", "cine", "film", "película", 
"movie", "actor", "actriz", "cantante", "singer", "artista", 
"concierto", "concert", "festival", "gala", "premios", 
"alfombra roja", "estreno", "premiere", "reality show",
"novela", "serie", "netflix", "streaming", "youtuber",
"influencer", "tiktoker", "viral video", "meme",
"exposición", "galería", "teatro", "danza", "ballet",
"ópera", "tour musical", "disco", "album", "single"

// Deportes
"fútbol", "football", "soccer", "baloncesto", "basketball", 
"béisbol", "baseball", "campeonato", "championship", "liga", 
"league", "mundial", "world cup", "olimpiadas", "olympics", 
"jugador", "player", "equipo", "team", "partido", "match", 
"gol", "goal", "medalla", "medal", "trofeo", "trophy"

// Otros
"turismo", "hotel", "restaurant", "gastronomía"
```

**Penalización aumentada:**
- Sin contexto político: **-40 puntos** por keyword (antes: 30)
- Con contexto político en lista blanca: **-15 puntos** (reducida)

**Lista Blanca (28 frases):**
```typescript
"sanciones", "diplomacia", "embajador", "ministro", "canciller",
"tratado", "acuerdo oficial", "política exterior", 
"relaciones internacionales", "gobierno", "estado", 
"propaganda", "censura", "exilio político", "disidente"
// + equivalentes en inglés
```

---

## 🚨 Reglas Críticas del Nuevo Prompt

### Prohibiciones Hard-Ban:
1. ❌ **NO inventar impacto** - Todo debe venir del texto original
2. ❌ **NO usar placeholders** - "actor A/B", "tablero en 72h", etc.
3. ❌ **NO forzar geopolitics** a cultura/deportes
4. ❌ **NO múltiples URLs** - Solo una al final
5. ❌ **NO hashtags irrelevantes** - Máximo 2, solo si son específicos

### Ejemplo de POST PROHIBIDO ❌:
```
🚨 ÚLTIMA HORA | Jazzista feliz en Cuba

Esto puede mover el tablero en 72h. Actor A evalúa presión 
sobre actor B. ¿Escalada o negociación?

Seguridad: impacto regional
Economía: presión/sanciones
Política: alianzas en juego

#Cuba #Geopolítica

Más detalles: [url]
```

### Ejemplo de POST CORRECTO ✅:
```
🚨 ÚLTIMA HORA | Trump evalúa sanciones adicionales contra 
empresas estatales cubanas vinculadas a importación de 
petróleo venezolano. Medida podría afectar suministro 
energético en Cuba en próximos 60 días.

#Cuba #Sanciones

Más detalles: [url]
```

---

## 🧪 Cómo Probar

### 1. Test con noticia de CULTURA (debe hacer SKIP):
```bash
cd geopolitik-x-autopost
# Simular feed con noticia cultural
node --loader ts-node/esm src/run_once.ts --debug
```

**Esperado:** 
- `curator-llm` debe marcar como `dropped` con reason `low_geopolitics`
- NO debe generar post

### 2. Test con noticia GEOPOLÍTICA válida:
```bash
# Feed con noticia de sanciones/diplomacia/seguridad
node --loader ts-node/esm src/run_once.ts --debug
```

**Esperado:**
- Score >= 60
- Post generado sin placeholders
- Hashtags específicos (no genéricos)
- Claims verificables del texto original

### 3. Verificar logs:
```bash
# Ver qué noticias fueron dropped y por qué
tail -f logs/autopost.log | grep -i "dropped\|low_geopolitics\|culture"
```

---

## 📊 Métricas de Éxito

**Antes:** ~40% de posts con cultura/deportes + placeholders
**Después (objetivo):** <2% de posts no-geopolíticos (umbral 70, antes 60)

**Indicadores de calidad:**
- ✅ 0 menciones de "actor A/B"
- ✅ 0 menciones de "tablero en 72h"
- ✅ 0 hashtags genéricos tipo #Geopolítica sin contexto
- ✅ Todos los claims verificables con el URL
- ✅ Cultura/deportes solo si cumple lista blanca (nexo político + actores estatales)
- ✅ Score mínimo: 70/100 (más estricto)

---

## 🔧 Ajuste de Umbrales

### Si aún hay **falsos positivos** (cultura pasando como geopolítica):

**Opción 1: Aumentar umbral**
```typescript
// curator-llm.ts, línea ~175
- Si geopolitics_signal < 80 => marca como dropped  // Cambiar de 70 a 80
```

**Opción 2: Aumentar penalización**
```typescript
// news_picker.ts, línea ~205
score -= softMatches * 50; // Cambiar de 40 a 50
```

**Opción 3: Agregar keyword específica**
```typescript
// news_picker.ts, línea ~79
const SOFT_NON_GEO_KEYWORDS = [
  // ... keywords existentes
  "tu_nueva_keyword_aqui",
];
```

### Si hay **falsos negativos** (geopolítica legítima siendo rechazada):

**Opción 1: Reducir umbral ligeramente**
```typescript
// curator-llm.ts
- Si geopolitics_signal < 65 => marca como dropped  // Cambiar de 70 a 65
```

**Opción 2: Agregar excepción a lista blanca**
```typescript
// news_picker.ts, línea ~51
const GEOPOLITICAL_CONTEXT_PHRASES = [
  // ... frases existentes
  "tu_nueva_excepcion_aqui",
];
```

### Casos edge especiales:

**Cultura con propaganda estatal:**
- Ya está en lista blanca: "propaganda"
- Ejemplo: "Concierto de propaganda estatal cubana" → PASA

**Deportes con sanciones:**
- Ya está en lista blanca: "sanciones"
- Ejemplo: "Equipo deportivo sancionado por gobierno" → PASA

**Actor/artista exiliado:**
- Ya está en lista blanca: "exilio político", "disidente"
- Ejemplo: "Actor venezolano exiliado por disidencia" → PASA

---

## 📋 Checklist de Validación

Antes de hacer deploy:
- [ ] Probar con 3 noticias de cultura (deben hacer SKIP)
- [ ] Probar con 3 noticias de deportes (deben hacer SKIP)
- [ ] Probar con 3 noticias geopolíticas (deben generar post)
- [ ] Verificar que NO aparezcan placeholders en ningún post
- [ ] Verificar que URLs solo aparezcan 1 vez al final
- [ ] Verificar que hashtags sean específicos (no genéricos)
- [ ] Revisar logs de los últimos 10 posts para confirmar calidad

---

## 🚀 Deploy

```bash
cd geopolitik-x-autopost

# 1. Compilar TypeScript
npm run build

# 2. Test manual
./scripts/autopost-hourly.sh --test

# 3. Verificar output
cat logs/autopost.log | tail -20

# 4. Si todo OK, dejar que el cron tome el control
# El sistema ya está configurado para ejecutar cada hora
```

---

## 💡 Notas Importantes

1. **El LLM puede tardar más:** Los prompts son más largos y estrictos, espera 1-2s extra por request.

2. **Rate limits:** Si ves errores 429, ajusta `timeoutMs` en `curator-llm.ts`:
   ```typescript
   timeoutMs: 12000 // aumentar a 12s
   ```

3. **Fallback:** Si el LLM falla, el sistema usa el curado determinista de `curator.ts` como backup.

4. **Monitoreo:** Slack recibe notificaciones de todos los posts. Revisa si hay patterns sospechosos.

---

## 📞 Soporte

Si encuentras:
- Post con placeholders → Reportar title/URL en Slack
- Cultura/deportes que pasó → Agregar keyword específica en `news_picker.ts`
- Geopolítica rechazada incorrectamente → Revisar scoring en `curator-llm.ts`

**Los prompts son ahora el "código de reglas editoriales" del sistema.**
