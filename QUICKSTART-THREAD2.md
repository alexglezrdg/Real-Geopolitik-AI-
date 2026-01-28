# 🚀 Quick Start: Thread2 + Anti-Redundancia

## ✅ Ya está funcionando

No necesitas hacer nada. El sistema ahora:

1. **Detecta automáticamente** cuánto contenido único tienes
2. **Elige el formato óptimo**: `single`, `thread2`, o `thread3`
3. **Valida similitud** entre tweets
4. **Se autocorrige** si detecta redundancia

## 📊 Cómo verificar que funciona

### Opción 1: Revisa los logs
Busca estas líneas al generar posts:
```
📊 Thread similarity T1↔T2: 5.0%
✅ Generated: mode="thread2" urgency="ÚLTIMA HORA" hashtags=[#Iran,#EEUU]
```

Si ves **similitud < 35%** → Todo bien ✅  
Si ves **"Downgrading to single"** → Sistema se autocorrigió ✅

### Opción 2: Ejecuta los tests
```bash
# Test básico
npx tsx test-thread2.ts

# Test realista (caso Irán)
npx tsx test-real-iran.ts

# Casos edge
npx tsx test-edge-cases.ts
```

## 🎯 Qué cambió en la práctica

### Antes
- Solo `single` (1 tweet) o `thread3` (3 tweets)
- A veces T2 repetía T1 → sensación de bug

### Ahora
- `single` (1 tweet): Cuando title lo dice todo
- `thread2` (2 tweets): Cuando hay 1 dato extra útil
- `thread3` (3 tweets): Cuando hay múltiples ángulos

**Validación**: Si T2 repite T1 (similitud >35%) → degrada a `single`

## 📝 Ejemplos

### Thread2 exitoso (5% similitud)
```
T1: Trump afirma que Irán busca acuerdo mientras despliega armada.
T2: Según Dubái, armada iraní es 'más grande que Venezuela'.
```
✅ T2 agrega info nueva

### Degradado a single (100% similitud)
```
Entrada: "Trump dice que Irán busca acuerdo"
Sistema intenta T2: "Trump afirma que Irán busca un acuerdo"
                     ↓ (100% similitud detectada)
Output final: Single conciso
```
✅ Sistema se autocorrigió

## 🔧 Configuración (opcional)

Si quieres ajustar el umbral de similitud:

1. Abre [src/claude.ts](src/claude.ts)
2. Busca `validateThreadUniqueness()`
3. Cambia `return similarity <= 0.35;` a otro valor

Recomendado: Mantener entre **0.30 - 0.40** (30% - 40%)

## 🐛 Troubleshooting

### "Veo threads con alta similitud"
→ Revisa los logs, busca `Thread similarity`  
→ Si ves >35% y NO se degradó, reporta el caso

### "Todos mis threads son single ahora"
→ Posible: Umbral muy estricto  
→ Revisa si el contenido realmente tiene info distinta  
→ Ejecuta `test-edge-cases.ts` para verificar

### "Claude sigue generando thread3"
→ Normal si hay contenido suficiente  
→ Solo degrada cuando detecta redundancia real

## 📚 Más info

- [THREAD2-ANTI-REDUNDANCIA.md](THREAD2-ANTI-REDUNDANCIA.md) - Documentación técnica completa
- [RESUMEN-THREAD2.md](RESUMEN-THREAD2.md) - Resumen ejecutivo con tests

---

**🎉 Listo para usar** - Sistema funcionando automáticamente
