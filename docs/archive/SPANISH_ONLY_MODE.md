# 🇪🇸 SPANISH-ONLY MODE - ACTIVE

## ✅ Configuration Complete

Your geopolitik-x-autopost system is now **100% Spanish-focused** for all posts.

---

## 📋 What Changed

### Post Writer (src/post_writer_maestro.ts)
- ✅ **Language:** Always "ES" (Spanish)
- ✅ **All 4 formats:** Generated in Spanish only
  - BREAKING_SINGLE: 🇪🇸 CLAVE | [noticia]
  - MINI_THREAD: 🇪🇸 ÚLTIMO | [4 tweets]
  - FULL_THREAD: 🇪🇸 THREAD | [7 tweets]
  - COMMUNITY_Q: 🇪🇸 [pregunta A/B]

### Spanish Terminology
| English | Spanish |
|---------|---------|
| Escalation or status quo? | ¿Escalada o status quo? |
| Watch: | Vigilar: |
| Context: | Contexto: |
| Scenarios: | Escenarios: |
| Why it matters: | Por qué importa: |
| More details: | Más: |
| Want updates? | ¿Quieres seguimiento? |

### Community Suggestions
- LATAM region → "Geopolítica Latinoamericana"
- Other regions → "Geopolítica Global"

---

## 🎯 Example Output

### Story: Venezuela interference
```
Input:
  region_bucket: LATAM
  entities: ["Venezuela", "USA"]
  topic_tags: ["sanctions"]

Output:
Format: BREAKING_SINGLE
Language: ES
Emoji: 🇻🇪

Tweet:
🇻🇪 CLAVE | USA: Interferencia en Venezuela es patrón histórico documentado...

Esto importa por: sanciones internacionales.

¿Escenario: escalada diplomática o status quo? Responde.

Más: https://...

Hashtags: #Venezuela #Sanciones
Suggested Community: Geopolítica Latinoamericana
```

---

## 🔧 Technical Details

### Language Detection (Removed)
- Previously auto-detected Spanish vs English
- Now: **Always returns "ES"**

### All 4 Format Generators
1. **generateBreakingSingle()** - Spanish only
2. **generateMiniThread()** - Spanish only (4 tweets)
3. **generateFullThread()** - Spanish only (7 tweets)
4. **generateCommunityQ()** - Spanish only (poll format)

### Conversation Starters (Spanish)
- BREAKING: "¿Escenario: escalada o status quo?"
- MINI_THREAD: "¿Cuál de los dos escenarios ves más probable?"
- FULL_THREAD: "¿Quieres seguimiento? Responde 'SEGUIMIENTO'"
- COMMUNITY_Q: "¿A o B y por qué?"

---

## 📊 System Verification

✅ 6 Spanish-only mode markers in code  
✅ 1 language default set to "ES"  
✅ All English branches removed from generators  
✅ Spanish terminology verified  
✅ TypeScript: 0 errors  
✅ Last dry-run: Detected Spanish text ("CLAVE")  

---

## 📁 Files Modified

**File:** `src/post_writer_maestro.ts`

**Changes:**
- `decideLanguage()` → Always returns "ES"
- `generateBreakingSingle()` → Spanish only
- `generateMiniThread()` → Spanish only
- `generateFullThread()` → Spanish only
- `generateCommunityQ()` → Spanish only
- All reply prompts in Spanish
- All community suggestions updated

---

## 🚀 Active Features

### Spanish Features
✅ Country emojis (🇻🇪 🇮🇷 🇺🇸 🪖 🌎 etc.)  
✅ Stop-scroll hooks in Spanish  
✅ Concrete questions in Spanish  
✅ Market analysis (mercado) with Spanish causalidad  
✅ Maximum 2 hashtags in Spanish  
✅ Neutral tone (no política)  
✅ Deduplication (day-level fingerprinting)  
✅ 13 portrait leaders (Delcy Rodriguez included)  

### Compliance
✅ 1 URL max per post  
✅ 2 hashtags max  
✅ No MAYÚSCULAS (neutral)  
✅ Spanish disclaimer: "NO es asesoría financiera"  
✅ Filters low-geopolitical content  

---

## 💬 Example Posts by Format (NOTICIAS ACTUALES - ENERO 2026)

### BREAKING_SINGLE (1 tweet)
```
🇻🇪 CLAVE | María Corina se posiciona como futura líder tras captura de Maduro.
La transición venezolana afecta dinámicas OTAN-LATAM y realineamientos energéticos.

Esto importa por: giro geopolítico regional y nuevas alianzas con Washington.

¿Escenario: María Corina alineada con EEUU o gobierno de transición autónomo?

Más: https://...
```

### MINI_THREAD (4 tweets)
```
Tweet 1:
🇻🇪 ÚLTIMO | Venezuela en punto de inflexión: captura de Maduro abre escenario de realineamiento.

¿Qué cambió hoy que importa para alianzas globales? Te lo explicamos en 4 tweets.

Tweet 2:
Contexto:
• Actor principal: María Corina Machado aspira liderazgo postmadurista
• Implicación: Washington reconoce nuevo gobierno; Rusia/China pierden influencia regional

Tweet 3:
Escenarios (próximas 48–72h):
A) Base: transición acelerada, María Corina + apoyo EEUU/OTAN
B) Riesgo: facciones militares resisten, caos transitorio

Tweet 4:
Vigilar:
• Posicionamiento de Marco Rubio (secretario de Estado - "nuevo Kissinger")
• Movimientos militares en frontera colombiana
• Precio del petróleo crudo (VZ pierde capacidad exportadora)
Más: https://...
```

### FULL_THREAD (7 tweets - Contexto: ¿Nueva Perestroika en Caribe?)
```
Tweet 1: 🇻🇪 THREAD: ¿Estamos ante una Perestroika caribeña?
         La captura de Maduro NO es solo Venezuela: afecta todo el eje Cuba-Nicaragua-Irán.
         7 análisis. Lee.

Tweet 2: QUÉ PASÓ (100% factual):
         • Maduro capturado; María Corina emerge como figura política viable
         • Marco Rubio (nuevo Henry Kissinger) ya condiciona reconocimiento
         • Washington acelera oferta de integración regional
         • Fuente: múltiples agencias, 26 ene 2026

Tweet 3: POR QUÉ IMPORTA (la escala es global, no local):
         🔴 Energía: pérdida de suministro venezolano = suba de crudo global
         🚫 Geopolítica: fin de bloque chavista abre competencia EEUU vs Rusia/China
         📦 Comercio: Venezuela retorna a órbita occidental post-Cuba
         ⚔️ Seguridad: frontera colombiana ahora sin "escudo" cubano

Tweet 4: INCENTIVOS DE ACTORES:
         Actor A (EEUU/Marco Rubio): integración rápida, bloqueo a influencia rusa
         Actor B (María Corina/élites): estabilidad económica, inversión EEUU
         Actor C (Rusia/Irán): evitar expulsión; mantienen presencia mínima en Cuba

Tweet 5: ESCENARIOS (probabilidades cualitativas):
         🟢 Más probable (65%): transición rápida pro-EEUU, María Corina reconocida, 
            acercamiento OTAN-Venezuela en 180 días
         🟡 Intermedio (25%): gobierno de transición neutral, retardo en reconocimiento
         🔴 Menos probable (10%): resistencia militar, caos interno prolongado

Tweet 6: MERCADO (NO es asesoría financiera):
         ORO: refugio ↑ (volatilidad geopolítica)
         SPX: volatilidad en energía y defensa
         CRUDO: presión al alza por capacidad venezolana perdida
         Causalidad: giro geopolítico → recalibración precios de riesgo regional

Tweet 7: QUÉ VIGILAR (próximos 7 días):
         1️⃣ Posición oficial de Cuba (¿rompe con Irán? ¿se alinea?)
         2️⃣ Reacción de Rusia: respuesta diplomática o expansión en Caribe
         3️⃣ Movimiento de capitales: diásporas retornan vs. fuga continúa
         
         ¿Ves esto como fin del ciclo chavista o transición inestable? 
         Responde "ANÁLISIS" para seguimiento diario.
         
         https://...
```

### COMMUNITY_Q (1 tweet - poll style)
```
🇻🇪 Marco Rubio como "nuevo Kissinger" + María Corina en poder = ¿fin del bloque bolivariano?

Dos caminos:
A) Perestroika caribeña: Venezuela retorna a Washington, fin de eje Havana-Teherán
B) Transición frágil: conflictividad interna, vacío de poder, intervenciones cruzadas

¿A o B? ¿Y por qué?
```

---

## 🎯 Spanish-Only Enforcement

All posts will ALWAYS be:
- ✅ Written in Spanish
- ✅ Include country emoji
- ✅ Use Spanish hashtags
- ✅ Reference Spanish-speaking regions primarily
- ✅ Address Spanish-speaking audiences
- ✅ No English fallback options

---

## 📝 Summary

**Your system is now 100% Spanish-focused:**
- Posts: Spanish only ✅
- Hashtags: Spanish only ✅
- Community suggestions: Spanish/LATAM focused ✅
- Conversation starters: Spanish only ✅
- All markets/assets discussed with Spanish context ✅

**Next hourly cycle:** All posts will be in perfect Spanish with engagement-focused questions and country emojis. 🚀
