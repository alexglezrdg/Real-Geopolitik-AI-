# 📅 PLAN DE VERIFICACIÓN 24-48 HORAS

**Objetivo:** Confirmar que el sistema v2.0 funciona correctamente en ambiente real

**Periodo:** 27 de enero - 28 de enero, 2026

---

## ⏰ TIMELINE DE VERIFICACIÓN

### HOY (26 Enero, 04:00 UTC)

- [x] Código implementado
- [x] TypeScript compilado
- [x] LaunchD instalado
- [x] Test manual ejecutado
- [ ] **AHORA:** Esperar próxima hora en punto

### PRÓXIMA HORA EN PUNTO (27 Enero, 05:00 UTC)

**El sistema debe:**

```bash
1️⃣ LaunchD dispara autopost-hourly.sh
2️⃣ Script pickea noticia
3️⃣ Genera post con formato NUEVO
4️⃣ Publica en X/Twitter
5️⃣ Registra en logs
```

**Verificar:**
```bash
# Ver log de ejecución
tail -f logs/autopost-hourly.log

# Buscar línea de éxito
grep "\[SUCCESS\]" logs/autopost-hourly.log

# Ver post en https://twitter.com/@GeopolitikX
# Debe tener nuevo formato: emojis, contexto, impacto, escenarios
```

---

## 📊 CHECKLIST 24 HORAS

### Hora 0 (04:00 UTC 27 Enero)
- [ ] LaunchD confirmado activo
- [ ] Logs accesibles

### Hora +1 (05:00 UTC)
- [ ] ¿Se ejecutó autopost?
- [ ] ¿Hay post nuevo en X?
- [ ] ¿Post tiene formato NUEVO?
- [ ] Registrar: Sí/No en checklist

### Hora +2 (06:00 UTC)
- [ ] ¿Se ejecutó autopost?
- [ ] ¿Hay post nuevo en X?
- [ ] ¿Formato consistente?

### Hora +3, +4, +5... (07:00, 08:00, 09:00 UTC)
- [ ] ¿Patrón consistente cada hora?
- [ ] ¿Logs sin errores?

### Después de 24 horas
- [ ] ¿24 posts publicados (1 por hora)?
- [ ] ¿100% tasa de éxito?
- [ ] ¿Formato consistente en todos?
- [ ] ¿Engagement aumentó vs. v1?

---

## 🔍 INDICADORES DE ÉXITO

| Indicador | Meta | Cómo verificar |
|-----------|------|----------------|
| **Frecuencia** | 1 post/hora | Contar posts en timeline |
| **Formato** | Nuevo (emojis + contexto) | Verificar visuales |
| **Videos** | Si hay disponibles | Detectar links YouTube |
| **Logs** | Sin errores | `grep ERROR logs/` |
| **Uptime** | 24+ horas sin interrupciones | Ver logs continuos |
| **Engagement** | Comparar con v1 | Retweets, replies, likes |

---

## 🎬 COMANDOS PARA MONITOREAR

### En terminal, mantener abierto:

```bash
# Terminal 1: Logs de autopost
cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost"
tail -f logs/autopost-hourly.log

# Terminal 2: Logs de launchd
tail -f logs/launchd-stdout.log

# Terminal 3: Ver tweets en vivo
# En navegador: https://twitter.com/GeopolitikX
# Refresh cada 15 minutos
```

### Comandos de diagnóstico:

```bash
# ¿Está LaunchD activo?
launchctl list | grep geopolitik

# ¿Cuántos posts hoy?
grep "\[SUCCESS\]" logs/autopost-hourly.log | wc -l

# ¿Últimas ejecuciones?
tail -20 logs/autopost-hourly.log

# ¿Errores?
grep "ERROR\|FAIL" logs/autopost-hourly.log
```

---

## 📈 MÉTRICAS A REGISTRAR

### Cada hora, anotar:

```
HORA: 05:00 UTC
- ¿Post publicado? SÍ / NO
- ¿Formato nuevo? SÍ / NO
- ¿Video? SÍ / NO
- Tipo de post: BREAKING_SINGLE / MINI_THREAD / VIDEO_POST
- Tema: [país/región]
- Primeros likes en 30 min: [número]
- Primeros retweets en 30 min: [número]
- Errores: [ninguno / lista]
```

### Ejemplo:
```
HORA: 05:00 UTC
- Post publicado: SÍ
- Formato nuevo: SÍ ✅ (tenía emoji urgencia, contexto, escenarios)
- Video: NO
- Tipo: BREAKING_SINGLE
- Tema: 🇱🇧 Líbano - Ataque israelí
- Likes 30min: 47
- Retweets 30min: 12
- Errores: ninguno

HORA: 06:00 UTC
- Post publicado: SÍ
- Formato nuevo: SÍ ✅
- Video: SÍ ✅ YouTube de Reuters
- Tipo: VIDEO_POST
- Tema: 🇻🇪 Venezuela - Embargo PEMEX
- Likes 30min: 93 (↑ con video)
- Retweets 30min: 28 (↑ con video)
- Errores: ninguno
```

---

## ⚠️ PROBLEMAS ESPERADOS Y SOLUCIONES

### Problema: "No hay post en X a las 05:00"

**Verificar:**
```bash
# ¿Se ejecutó el script?
grep "05:00" logs/autopost-hourly.log

# ¿LaunchD está activo?
launchctl list | grep geopolitik

# ¿Hay error?
tail -50 logs/autopost-hourly.log | grep -i error
```

**Solucionar:**
```bash
# 1. Recargar LaunchD
launchctl unload ~/Library/LaunchAgents/com.geopolitik.autopost.plist
launchctl load ~/Library/LaunchAgents/com.geopolitik.autopost.plist

# 2. Ejecutar manualmente
X_LIVE=1 IMAGE_LIVE=1 bash scripts/autopost-hourly.sh

# 3. Ver output
tail -100 logs/autopost-hourly.log
```

---

### Problema: "Post publicado pero sin formato nuevo"

**Verificar:**
```bash
# ¿Se está usando nueva versión de post_writer_maestro.ts?
grep "VIDEO_POST" src/post_writer_maestro.ts

# ¿TypeScript compiló cambios?
npx tsc --noEmit
```

**Solucionar:**
```bash
# 1. Recompilar
npm run build

# 2. Reiniciar LaunchD
launchctl unload ~/Library/LaunchAgents/com.geopolitik.autopost.plist
launchctl load ~/Library/LaunchAgents/com.geopolitik.autopost.plist

# 3. Esperar próxima hora
```

---

### Problema: "LaunchD no se ejecuta cada hora"

**Verificar:**
```bash
# ¿Plist tiene StartInterval?
cat ~/Library/LaunchAgents/com.geopolitik.autopost.plist | grep StartInterval

# ¿Valor es 3600 (1 hora)?
# Debería ser: <integer>3600</integer>
```

**Solucionar:**
```bash
# 1. Editar plist
nano ~/Library/LaunchAgents/com.geopolitik.autopost.plist

# 2. Encontrar: <key>StartInterval</key>
# 3. Verificar: <integer>3600</integer>

# 4. Recargar
launchctl unload ~/Library/LaunchAgents/com.geopolitik.autopost.plist
launchctl load ~/Library/LaunchAgents/com.geopolitik.autopost.plist
```

---

## ✅ CRITERIOS DE ÉXITO

### Mínimo (Sistema funciona)
- [ ] Al menos 20 posts en 24 horas
- [ ] Formato nuevo en 100% de posts
- [ ] Sin errores críticos en logs

### Esperado (Sistema optimizado)
- [ ] 24 posts en 24 horas (1 por hora exacta)
- [ ] Formato nuevo + videos donde disponibles
- [ ] Engagement promedio > v1
- [ ] Cero downtime

### Excelente (Producción lista)
- [ ] 24+ posts
- [ ] Formato consistente profesional
- [ ] Videos detectados automáticamente
- [ ] Engagement +50% vs v1
- [ ] Logs limpios
- [ ] Sistema estable 48+ horas

---

## 📝 TEMPLATE PARA REGISTRAR RESULTADOS

```markdown
## RESULTADOS VERIFICACIÓN v2.0

**Periodo:** 27-28 Enero 2026
**Timezone:** UTC

### Resumen
- Posts publicados: [__/24]
- Tasa éxito: [__]%
- Formato nuevo: [__]%
- Videos: [__] detectados
- Engagement vs v1: [↑ __% / ↔ / ↓]
- Uptime: [__] horas

### Hora a hora

| Hora UTC | Post | Formato | Video | Likes | RT | Errores |
|----------|------|---------|-------|-------|----|---------| 
| 05:00 | ✅ | ✅ | ❌ | 47 | 12 | ninguno |
| 06:00 | ✅ | ✅ | ✅ | 93 | 28 | ninguno |
| ... | ... | ... | ... | ... | ... | ... |

### Issues encontrados
[Listar problemas si los hay]

### Recomendaciones
[Próximos pasos]
```

---

## 🎯 SIGUIENTE FASE

### Si todo funciona (criterio mínimo cumplido):
- ✅ Mantener sistema en producción
- ✅ Monitorear 7 días adicionales
- ✅ Recopilar métricas de engagement
- → Proceder a "Próximos pasos" en ESTADO-FINAL-v2.0.md

### Si hay problemas:
- 🔧 Diagnosticar según troubleshooting
- 🔧 Arreglar y recargar LaunchD
- 🔧 Re-testar durante 2-4 horas
- → Si persisten, contactar soporte

---

## 📞 CONTACTO SI HAY ISSUES

1. **Revisar logs primero**
   ```bash
   tail -100 logs/autopost-hourly.log
   tail -100 logs/launchd-stderr.log
   ```

2. **Buscar patrón de error**
   - ¿Cuándo falló?
   - ¿Qué error específico?
   - ¿Otro proceso interfiriendo?

3. **Documentar**
   - Timestamp exacto del error
   - Texto completo del error
   - Acciones tomadas
   - Resultado

---

**¡Buena suerte! Esperamos que en 24h tengas 24 posts nuevos y profesionales. 🚀**

---

*Próxima revisión: 28 Enero 2026, 04:00 UTC*
