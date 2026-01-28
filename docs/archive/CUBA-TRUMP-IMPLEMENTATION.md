# Cuba + Trump Naval Blockade — Implementation Guide

## Overview

Sistema autónomo para generar noticias sobre **Cuba + posible cerco/bloqueo naval de Trump** con **máxima verificabilidad** y uso de **lenguaje condicional** cuando la fuente NO confirma explícitamente.

---

## ✅ Cambios Implementados

### 1. Google News RSS Feed (news_sources.ts)

**Agregado:** Nueva fuente RSS de Google News con query específica.

```typescript
{
  id: "google-news-cuba-trump",
  name: "Google News - Cuba Trump",
  url: "https://news.google.com/rss/search?q=Trump%20bloqueo%20naval%20Cuba&hl=es-419&gl=US&ceid=US:es-419",
  region: "latam",
  priority: 1,
  reliability: "high"
}
```

**Ventajas:**
- ✅ RSS real verificable (Google News)
- ✅ Query en español: "Trump bloqueo naval Cuba"
- ✅ Prioridad 1 (seleccionará historias top sobre este tema)
- ✅ Región LatAm (alineado con estrategia RG)

---

### 2. Specialized Prompt Template (claude.ts)

**Nueva función:** `generateCubaTrumpBlockadeNewsPack()`

```typescript
export async function generateCubaTrumpBlockadeNewsPack(params: {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  date?: string;
}): Promise<NewsPack>
```

**Características críticas:**

#### ✅ Detección Automática de Confirmación

```typescript
const explicitBlockade = text.includes("bloqueo naval") 
  || text.includes("bloqueo marítimo") 
  || text.includes("cerco naval");
```

- Si la fuente DICE explícitamente "bloqueo naval" → `urgency_tag = "ÚLTIMA HORA"`
- Si NO lo confirma → `urgency_tag = "EN DESARROLLO"`

#### ✅ Lenguaje Condicional Automático

Prompt fuerza condicionales si no hay confirmación:

```text
"IMPORTANTE: Si la fuente NO confirma explícitamente 'bloqueo naval', 
usa CONDICIONAL: 'evalúa', 'considera', 'según reportes', 'plantea'."
```

#### ✅ JSON Salida Estructurada

```json
{
  "mode": "single|thread3",
  "language": "es",
  "urgency_tag": "ÚLTIMA HORA|EN DESARROLLO",
  "topic_hashtags": ["Cuba", "EEUU"],
  "tweet": {
    "text": "🚨 ÚLTIMA HORA | ... | Más detalles: https://...",
    "url": "https://..."
  },
  "visual": {
    "format": "9:16",
    "header": "ÚLTIMA HORA|EN DESARROLLO",
    "headline": "CUBA: TITULAR EN MAYÚSCULAS",
    "subheadline": "Subtítulo verificado",
    "source_line": "Fuente: Reuters / Google News / etc.",
    "date_line": "Fecha: 2026-01-25",
    "image_brief": "Mapa Caribe, banderas Cuba/EEUU",
    "style_rules": ["alto contraste", "paleta RG: #000000 fondo, #E10600 acento"]
  }
}
```

---

## 🚀 Cómo Usarlo

### Opción A: Automática (Recomendada)

El sistema selecciona automáticamente si detecta una noticia sobre "Cuba + Trump" en el picker:

```bash
npm run dev
# → Picks story from Google News RSS feed
# → Calls generateCubaTrumpBlockadeNewsPack() if detected
# → Output: JSON con urgency_tag ajustado según fuente
```

### Opción B: Manual con URL

```bash
npm run dev -- --url "https://news.google.com/articles/..."
# → Si es sobre Cuba+Trump, usa specialized prompt
# → Validación de "bloqueo naval" automática
```

### Opción C: Directo desde código

```typescript
import { generateCubaTrumpBlockadeNewsPack } from "./src/claude";

const newsPack = await generateCubaTrumpBlockadeNewsPack({
  title: "Trump anuncia bloqueo naval a Cuba",
  url: "https://...",
  source: "Reuters Americas",
  snippet: "El presidente Trump anunció hoy un bloqueo...",
  date: "2026-01-25"
});

// Output: 
// - urgency_tag: "ÚLTIMA HORA" (porque "bloqueo naval" está explícito)
// - Tweet con emoji 🚨
// - Hashtags: #Cuba #EEUU
```

---

## 🛡️ Validaciones de Seguridad

### 1. **Verificación de Fuente Real**
- ✅ URL debe ser verificable (Google News RSS es real)
- ❌ Sin URL → no se genera NewsPack

### 2. **Lenguaje Condicional Forzado**
- Si snippet NO menciona "bloqueo naval" explícitamente:
  - Usa: "evalúa", "considera", "según reportes", "plantea"
  - Nunca: "anuncia", "confirma" (sin prueba)

### 3. **Urgency Tag Automático**
```
Bloqueo naval CONFIRMADO → 🚨 ÚLTIMA HORA
Bloqueo naval EVALUADO   → ⚠️ EN DESARROLLO
```

### 4. **Prohibición de Inglés**
- Valida que NO tenga: "breaking", "reported", "thread", "account"
- Si detecta → Reintenta con prompt estricto

### 5. **Longitud Tweets**
- Máx 270 caracteres
- Auto-trim si excede

---

## 📊 Ejemplos de Output

### Ejemplo 1: Bloqueo CONFIRMADO

**Entrada:**
```
Title: Trump anuncia bloqueo naval a Cuba
Source: Reuters Americas
Snippet: El presidente Trump anunció hoy un bloqueo naval para aumentar presión...
```

**Salida JSON:**
```json
{
  "urgency_tag": "ÚLTIMA HORA",
  "tweet": {
    "text": "🚨 ÚLTIMA HORA | Trump anuncia bloqueo naval a Cuba. La medida intensifica la presión económica. Más detalles: https://...",
    "url": "https://..."
  },
  "visual": {
    "header": "ÚLTIMA HORA",
    "headline": "TRUMP ANUNCIA BLOQUEO NAVAL A CUBA"
  }
}
```

---

### Ejemplo 2: Bloqueo EVALUADO (EN DESARROLLO)

**Entrada:**
```
Title: Trump evalúa medidas adicionales contra Cuba
Source: Google News - Cuba Trump
Snippet: Fuentes cercanas al gobierno sugieren que Trump estudia posibles opciones...
```

**Salida JSON:**
```json
{
  "urgency_tag": "EN DESARROLLO",
  "tweet": {
    "text": "⚠️ EN DESARROLLO | Trump evalúa posibles medidas contra Cuba. Según reportes, considera opciones económicas. Más detalles: https://...",
    "url": "https://..."
  },
  "visual": {
    "header": "EN DESARROLLO",
    "headline": "TRUMP EVALÚA MEDIDAS CONTRA CUBA"
  }
}
```

---

## 🔧 Configuración de Variables

En `.env`:

```env
# Ya debería estar:
ANTHROPIC_API_KEY=sk-...
CLAUDE_MODEL=claude-sonnet-4-20250514

# Opcional (para testing):
CUBA_BLOCKADE_MODE=development  # o "production"
```

---

## 📋 Checklist de Implementación

- [x] Google News RSS feed agregado a `news_sources.ts`
- [x] Función `generateCubaTrumpBlockadeNewsPack()` creada en `claude.ts`
- [x] Validación de "bloqueo naval" automática
- [x] Lenguaje condicional forzado en prompt
- [x] `urgency_tag` dinámico según fuente
- [x] TypeScript compilation: ✅ 0 errors
- [x] Sistema compatible con `npm run dev` existente
- [x] Sistema compatible con `--url` manual
- [x] Sistema compatible con `--live` (autopost)

---

## 🚀 Próximos Pasos (Opcionales)

1. **Database logging:** Trackear qué historias fueron pickeadas/descartadas
2. **Alert system:** Slack/Discord cuando detecte "bloqueo naval" confirmado
3. **Multi-language:** Ampliar a Portugal/Brasil (português)
4. **Visual generation:** Integrar DALL-E 3 con mapa Caribe custom

---

## 📞 Support

Si surge duda sobre:
- ✅ Lenguaje condicional → Check prompt en `claude.ts` (línea ~344)
- ✅ URL verificabilidad → Check Google News RSS feed en `news_sources.ts`
- ✅ JSON output → Check `NewsPack` interface en `claude.ts` (línea ~26)

