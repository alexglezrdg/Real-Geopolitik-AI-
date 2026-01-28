# 📖 DOCUMENTACIÓN - Índice Completo

**Real Geopolitik X Autopost v1.1.0**  
**Fecha:** 25-01-2026  
**Status:** ✅ LISTO PARA PRODUCCIÓN

---

## 🚀 Quick Start (30 segundos)

```bash
# 1. Instalar
npm install

# 2. Configurar .env
cp .env.example .env
# (agregar tus API keys)

# 3. Correr
npm run dev                                    # Automático, sin postear
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live   # LIVE (publicar)
```

---

## 📚 Documentación por rol

### 👨‍💼 **Para Ejecutivos** (5 min read)
Entender qué es el sistema, cómo funciona, qué valida.

- **[README-ES.md](README-ES.md)** - Executive summary
- **[RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)** - Visión completa + arquitectura

### 👨‍💻 **Para Desarrolladores** (20 min read)
Código, arquitectura, integración, configuración.

- **[SETUP.md](SETUP.md)** - Instalación paso a paso
- **[FINAL-STATUS.md](FINAL-STATUS.md)** - Status del sistema (todo lo implementado)
- **[NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md)** - Guía del news picker automático
- **[PROMPTS-PRODUCCION.md](PROMPTS-PRODUCCION.md)** - Prompts maestros (Claude + OpenAI)
- **[CHANGELOG-NEWS-PICKER.md](CHANGELOG-NEWS-PICKER.md)** - Qué se implementó (detalles técnicos)

### 🧪 **Para QA / Testers** (15 min read)
Cómo validar, test cases, guardrails.

- **[EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md)** - Ejemplos de output real
- **[FINAL-STATUS.md](FINAL-STATUS.md#---2-problem-resolution)** - Problemas resueltos
- **[RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-próximas-fases-opcional)** - Validaciones

---

## 📄 Documentación por tema

### 🎯 **Visión General**
- [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md) - Arquitectura + flujo + comandos
- [README-ES.md](README-ES.md) - Qué es Real Geopolitik

### 🔧 **Instalación & Setup**
- [SETUP.md](SETUP.md) - Paso a paso (Node, npm, env vars, estructura)
- [SETUP.md#variables-de-entorno](SETUP.md#variables-de-entorno) - Qué env vars necesitas

### 🤖 **News Picker (automático)**
- [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md) - Cómo busca/elige noticias
- [CHANGELOG-NEWS-PICKER.md](CHANGELOG-NEWS-PICKER.md) - Implementación técnica
- [NEWS-PICKER-GUIDE.md#scoring-ejemplo](NEWS-PICKER-GUIDE.md#scoring-ejemplo) - Scoring formula

### 📝 **Prompts Maestros**
- [PROMPTS-PRODUCCION.md](PROMPTS-PRODUCCION.md) - Prompts Claude + OpenAI
- [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md#ejemplo-1-tweet-generado-single-mode) - Ejemplos de tweets

### 🎨 **Generación de Imágenes**
- [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md#ejemplo-2-imagen-generada-dalle-3) - Layout DALL-E 3
- [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-outputs-tweet--imagen) - Descripción visual

### 🚀 **Comandos & Ejecución**
- [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-comandos) - Todos los modos (auto, manual, dry-run, live)
- [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md#-modo-de-uso) - Modos de uso detallado

### 🔒 **Seguridad & Guardrails**
- [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-seguridad-guardrails) - Dual-key, dedup, daily limit
- [FINAL-STATUS.md](FINAL-STATUS.md#---4-problem-resolution) - Problemas resueltos

### 💾 **Database & Storage**
- [SETUP.md](SETUP.md#estructura-de-archivos) - Dónde se guardan images/DB
- [FINAL-STATUS.md](FINAL-STATUS.md) - Integración SQLite

### 🧩 **Arquitectura**
- [FINAL-STATUS.md](FINAL-STATUS.md#2-technical-foundation) - Tech stack
- [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-arquitectura) - Diagrama flujo

### ✅ **Validación & Testing**
- [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md#validaciones-automáticas) - Qué valida el sistema
- [CHANGELOG-NEWS-PICKER.md](CHANGELOG-NEWS-PICKER.md#-test-results) - Tests realizados

### 📊 **Status & Progress**
- [FINAL-STATUS.md](FINAL-STATUS.md#5-progress-tracking) - Checklist de features
- [CHANGELOG-NEWS-PICKER.md](CHANGELOG-NEWS-PICKER.md#-deliverables) - Qué se implementó

---

## 🎯 Tareas comunes

### "Quiero correr el sistema"
1. [SETUP.md](SETUP.md) - Instalación
2. [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-comandos) - Comandos

### "Quiero entender qué hace"
1. [README-ES.md](README-ES.md) - Qué es
2. [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-arquitectura) - Cómo funciona
3. [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md) - Ejemplos reales

### "Quiero configurarlo"
1. [SETUP.md](SETUP.md#variables-de-entorno) - Env vars
2. [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md#-configuración-env) - Opciones del picker
3. [PROMPTS-PRODUCCION.md](PROMPTS-PRODUCCION.md) - Tunear prompts

### "Quiero validar/testear"
1. [CHANGELOG-NEWS-PICKER.md](CHANGELOG-NEWS-PICKER.md#-test-results) - Tests hechos
2. [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-safety-checks-verificados) - Checklist validación
3. [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md) - Esperar este output

### "Algo no funciona"
1. [FINAL-STATUS.md](FINAL-STATUS.md#4-problem-resolution) - Problemas conocidos
2. [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-support--troubleshooting) - Troubleshooting
3. [SETUP.md](SETUP.md#troubleshooting) - Errores comunes

### "Quiero modificar prompts"
1. [PROMPTS-PRODUCCION.md](PROMPTS-PRODUCCION.md) - Prompts actuales
2. [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md) - Resultado esperado
3. Editar `src/claude.ts` o `src/openai_image.ts`

### "Quiero cambiar scoring de noticias"
1. [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md#-scoring-ejemplo) - Cómo se puntúan
2. Editar `src/news_picker.ts` (función `scoreStory()`)
3. Editar `src/news_sources.ts` (keywords)

---

## 🗂️ Estructura de archivos (docs)

```
/
├── README-ES.md                    ← Executive summary
├── SETUP.md                        ← Instalación
├── FINAL-STATUS.md                 ← Status sistema (todo implementado)
├── RESUMEN-EJECUTIVO.md            ← Visión completa + arquitectura
├── NEWS-PICKER-GUIDE.md            ← Guía news picker automático
├── PROMPTS-PRODUCCION.md           ← Prompts maestros
├── EXAMPLES-OUTPUT.md              ← Ejemplos de output
├── CHANGELOG-NEWS-PICKER.md        ← Qué se implementó
├── DOCUMENTATION-INDEX.md          ← Este archivo 👈
└── src/
    ├── run_once.ts                 ← Main orchestrator
    ├── news_sources.ts             ← Fuentes RSS
    ├── news_picker.ts              ← Scoring + picking
    ├── claude.ts                   ← NewsPack generator
    ├── openai_image.ts             ← DALL-E 3 + overlay
    ├── x.ts                        ← X API
    ├── rss.ts                      ← RSS parser
    ├── db.ts                       ← SQLite
    └── scheduler.ts                ← (opcional) Cron jobs
```

---

## 📋 Checklist para nuevos usuarios

- [ ] Leer [README-ES.md](README-ES.md) (qué es)
- [ ] Ejecutar [SETUP.md](SETUP.md) (instalar)
- [ ] Correr `npm run dev` (test)
- [ ] Leer [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md) (cómo funciona)
- [ ] Leer [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md) (automático)
- [ ] Revisar [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md) (qué esperar)
- [ ] Configurar `.env` (variables)
- [ ] Correr `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live` (LIVE)

---

## 🔗 Referencias cruzadas

### Claude NewsPack
- Definido en: [src/claude.ts](src/claude.ts)
- Descripción: [FINAL-STATUS.md](FINAL-STATUS.md#-src/claude.ts-final-version---production-mode)
- Ejemplo: [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md#ejemplo-1-tweet-generado-single-mode)

### DALL-E 3 Image Generation
- Definido en: [src/openai_image.ts](src/openai_image.ts)
- Descripción: [FINAL-STATUS.md](FINAL-STATUS.md#-src/openai_image.ts-final-version---production-mode)
- Ejemplo: [EXAMPLES-OUTPUT.md](EXAMPLES-OUTPUT.md#ejemplo-2-imagen-generada-dalle-3)

### News Picker Automático
- Definido en: [src/news_picker.ts](src/news_picker.ts)
- Guía: [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md)
- Implementación: [CHANGELOG-NEWS-PICKER.md](CHANGELOG-NEWS-PICKER.md)

### Database
- Definido en: [src/db.ts](src/db.ts)
- Ubicación: [data/bot.sqlite](data/bot.sqlite)
- Descrito en: [SETUP.md](SETUP.md#estructura-de-archivos)

### Comandos & Ejecución
- Todos: [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-comandos)
- Detailed: [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md#-modo-de-uso)

---

## 📞 Support

### Preguntas frecuentes

**P: ¿Cómo inicio el sistema?**  
R: [SETUP.md](SETUP.md) → `npm run dev`

**P: ¿Cómo publico en X?**  
R: `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live` (ver [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-comandos))

**P: ¿Cómo funciona el scoring de noticias?**  
R: [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md#-scoring-ejemplo)

**P: ¿Qué pasa si algo falla?**  
R: [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-support--troubleshooting)

**P: ¿Cómo modifico los prompts?**  
R: [PROMPTS-PRODUCCION.md](PROMPTS-PRODUCCION.md)

### Errores comunes
- "No suitable trending story" → [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-support--troubleshooting)
- "X API connection failed" → [SETUP.md](SETUP.md#troubleshooting)
- "Already posted" → Esperado (dedup funciona)

---

## 🎓 Learning Path

### Nivel 1: Usuario (entender qué hace)
1. [README-ES.md](README-ES.md)
2. [SETUP.md](SETUP.md)
3. Run: `npm run dev`

### Nivel 2: Operador (usar en producción)
1. [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md)
2. [NEWS-PICKER-GUIDE.md](NEWS-PICKER-GUIDE.md)
3. Run: `X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live`

### Nivel 3: Developer (modificar)
1. [FINAL-STATUS.md](FINAL-STATUS.md)
2. [CHANGELOG-NEWS-PICKER.md](CHANGELOG-NEWS-PICKER.md)
3. Edit: `src/news_picker.ts`, `src/claude.ts`, etc.

### Nivel 4: Architect (diseñar)
1. [RESUMEN-EJECUTIVO.md](RESUMEN-EJECUTIVO.md#-arquitectura)
2. [FINAL-STATUS.md](FINAL-STATUS.md#7-recent-operations)
3. Design: Clustering, Sentiment, Google Trends integration

---

## 📊 Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 22-01-2026 | Initial: Claude NewsPack + DALL-E 3 + X posting |
| 1.1.0 | 25-01-2026 | Added: News picker automático (11 RSS sources, scoring) |

---

## ✅ Documentación Checklist

- [x] README-ES.md (executive summary)
- [x] SETUP.md (instalación)
- [x] FINAL-STATUS.md (status sistema)
- [x] RESUMEN-EJECUTIVO.md (arquitectura)
- [x] NEWS-PICKER-GUIDE.md (news picker)
- [x] PROMPTS-PRODUCCION.md (prompts maestros)
- [x] EXAMPLES-OUTPUT.md (ejemplos)
- [x] CHANGELOG-NEWS-PICKER.md (implementación)
- [x] DOCUMENTATION-INDEX.md (este archivo)

---

## 🚀 Status

**Sistema:** ✅ LISTO PARA PRODUCCIÓN  
**Documentación:** ✅ COMPLETA  
**Testing:** ✅ PASSED  
**Deployment:** ✅ READY  

---

**Última actualización:** 25-01-2026  
**Mantenedor:** GitHub Copilot / Real Geopolitik Team  
**Licencia:** Privada
