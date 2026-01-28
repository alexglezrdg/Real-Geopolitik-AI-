# 🎨 Agregar Portraits: Trump & Lula

## 📋 Guía Rápida

Para que el sistema use fotos reales de Trump y Lula en los posts, necesitas agregar sus portraits a la carpeta `assets/portraits/`.

---

## 🔍 Paso 1: Buscar Imágenes

### Trump
- **Búsqueda Google**: `"Donald Trump official portrait 2025 PNG"`
- **Fuentes recomendadas**:
  - Wikimedia Commons: https://commons.wikimedia.org/wiki/Donald_Trump
  - Official White House photos
  - Reuters/AP photo archives
- **Requisitos**:
  - Fondo transparente (PNG) o fondo neutro
  - Resolución mínima: 800px de ancho
  - Orientación vertical (portrait 9:16 ideal)
  - Expresión seria/profesional (no memes)

### Lula
- **Búsqueda Google**: `"Lula da Silva official portrait 2025 PNG"`
- **Fuentes recomendadas**:
  - Wikimedia Commons: https://commons.wikimedia.org/wiki/Luiz_Inácio_Lula_da_Silva
  - Presidência da República (Brasil)
  - Reuters/AP photo archives
- **Requisitos**:
  - Mismos que Trump (PNG, 800px+, vertical)

---

## 📁 Paso 2: Guardar Archivos

Guarda las imágenes en `assets/portraits/` con estos nombres:

```
assets/portraits/
  ├── trump.png         ← Foto de Donald Trump
  ├── lula.png          ← Foto de Lula da Silva
  └── (otros existentes: MADURO.jpg, putin.jpg, etc.)
```

**Nombres aceptados** (el sistema detecta automáticamente):
- Trump: `trump.png`, `donald_trump.png`, `Trump2025.png`
- Lula: `lula.png`, `lula_da_silva.png`, `LulaBrasil.png`

---

## ✅ Paso 3: Verificar Funcionamiento

Después de agregar los portraits:

```bash
cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

**Buscar en logs:**

```
[IMG] mode: COMPOSED           ← Significa que encontró portrait
[IMG] entity: trump            ← Detectó a Trump
[IMG] portrait: trump.png      ← Usando su foto
```

Si ves esto:
```
[IMG] mode: DALLE_FULL
[IMG] entity: NONE
[IMG] reason: Entities detected (Trump) but no matching portraits found
```
→ El archivo no está en la carpeta o el nombre no coincide.

---

## 🎯 Ejemplos de Posts que Usarán Portraits

Con portraits agregados:

### Noticia sobre Trump
**Antes (DALL·E FULL):**
- Sistema genera imagen artística de "Trump genérico"

**Después (COMPOSED):**
- Sistema usa `trump.png` + background generado
- Post se ve más profesional y legítimo ✅

### Noticia sobre Lula + Trump
**Sistema elegirá:**
- Trump tiene prioridad más alta (líder US)
- Usará `trump.png` como portrait principal
- Background mostrará banderas US/Brasil

---

## 📊 Prioridad de Portraits

Si una noticia menciona varios líderes, el sistema elige según esta prioridad (mayor = más prioridad):

1. **Trump** (US president)
2. **Putin** (Russia)
3. **Xi Jinping** (China)
4. **Netanyahu** (Israel)
5. **Khamenei** (Iran)
6. **Maduro** (Venezuela)
7. **Lula** (Brasil)
8. **Petro** (Colombia)
9. Otros líderes regionales

---

## 🚨 IMPORTANTE

**NO uses imágenes con copyright restrictivo**. Fuentes recomendadas:
- ✅ Wikimedia Commons (Creative Commons)
- ✅ Official government photos (public domain)
- ✅ Reuters/AP (con licencia)
- ❌ Google Images random
- ❌ Fotos de redes sociales

---

## 📝 Notas Técnicas

El sistema detecta entities automáticamente desde:
1. **Tags del curator**: `["Trump", "USA", "Cuba"]`
2. **Título de noticia**: "Trump anuncia sanciones a Venezuela..."
3. **Keywords hardcoded**: Si el título contiene "trump", "lula", "maduro", etc.

Detección actual en `src/image_mode.ts`:

```typescript
const ENTITY_KEYWORDS = {
  "trump": ["trump", "donald"],
  "lula": ["lula", "silva", "da silva"],
  "maduro": ["maduro", "nicolás", "nicolas"],
  // ... más
};
```

---

## ✅ Status Actual

| Líder | Portrait Disponible | Archivo |
|-------|---------------------|---------|
| Trump | ❌ FALTAN | `trump.png` (agregar) |
| Lula | ❌ FALTAN | `lula.png` (agregar) |
| Maduro | ✅ SÍ | `MADURO.jpg` |
| Putin | ✅ SÍ | `putin.jpg` |
| Delcy Rodríguez | ✅ SÍ | `DELCY RODRIGUEZ.webp` |
| Díaz-Canel | ✅ SÍ | `MIGUEL DIAZ CANEL.avif` |
| Netanyahu | ✅ SÍ | `29int-israel-netanyahu-1-mpzt-articleLarge.webp` |
| Khamenei | ✅ SÍ | `Khamenei.webp` |
| Sheinbaum | ✅ SÍ | `Claudia-Sheinbaum-head-of-government-of-Mexico-City-2022-pardo.webp` |
| Petro | ✅ SÍ | `gpetro-3.jpg` |
| Macron | ✅ SÍ | `Emmanuel_Macron_(cropped).jpg` |
| Sánchez | ✅ SÍ | `Pedro Sanchez.jpg` |

---

## 🔗 Links Útiles

- Wikimedia Commons Trump: https://commons.wikimedia.org/wiki/Category:Donald_Trump_in_2025
- Wikimedia Commons Lula: https://commons.wikimedia.org/wiki/Category:Luiz_Inácio_Lula_da_Silva_in_2025
- PNG backgrounds remover (si necesitas): https://www.remove.bg/

---

## 📞 Soporte

Si después de agregar los portraits NO funcionan:
1. Verificar nombres de archivo: `trump.png`, `lula.png` (minúsculas)
2. Verificar ubicación: `assets/portraits/`
3. Verificar formato: PNG, JPG, WEBP (no GIF)
4. Revisar logs: buscar `[IMG] mode: COMPOSED`

Si sigue fallando, el sistema automáticamente usa DALL·E FULL (funciona igual, solo sin portrait real).
