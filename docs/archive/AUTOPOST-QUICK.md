# ⏰ AUTOPOST CADA HORA - Quick Reference

**Real Geopolitik X Autopost**

---

## 🚀 Comandos rápidos

### macOS / Linux

```bash
# 1. Dar permisos (primera vez)
chmod +x scripts/autopost-hourly.sh

# 2. Ejecutar en terminal
./scripts/autopost-hourly.sh

# 3. Ejecutar en background
nohup ./scripts/autopost-hourly.sh > logs/autopost.log 2>&1 &

# 4. Ver logs en tiempo real
tail -f logs/autopost-hourly.log
```

### Windows PowerShell

```powershell
# 1. Permitir scripts (primera vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 2. Ejecutar
.\scripts\autopost-hourly.ps1

# 3. Ejecutar en background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\scripts\autopost-hourly.ps1'"

# 4. Ver logs en tiempo real
Get-Content logs/autopost-hourly.log -Wait
```

---

## ✅ Qué hace

```
Loop infinito cada 3600 segundos (1 hora):
  1. Ejecuta: X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
  2. Genera tweet + imagen
  3. Postea en X
  4. Registra en logs/autopost-hourly.log
  5. Si falla: reintentra 3 veces (cada 120 seg)
  6. Espera 1 hora
  7. Repite desde paso 1
```

---

## 📊 Logs esperados

```
[2026-01-25 21:00:00] [START] Real Geopolitik Autopost Hourly Loop started
[2026-01-25 21:00:00] [CYCLE] === Cycle #1 ===
[2026-01-25 21:00:05] [SUCCESS] Autopost cycle completed successfully
[2026-01-25 21:00:05] [CYCLE] Cycle #1 completed. Waiting 3600s until next cycle...
[2026-01-25 22:00:05] [CYCLE] === Cycle #2 ===
...
```

---

## 🛑 Detener

```bash
# macOS/Linux
pkill -f autopost-hourly.sh

# Windows PowerShell (en la ventana)
Ctrl+C
```

---

## 📚 Documentación completa

[AUTOPOST-HOURLY-GUIDE.md](AUTOPOST-HOURLY-GUIDE.md) ← Ver aquí para:
- Instalación detallada
- Ejecutar en background (nohup, screen, tmux)
- Task Scheduler (Windows)
- Troubleshooting
- Monitoreo
- Ajustar intervalo

---

**Status:** ✅ **LISTO**

El sistema postea automáticamente cada hora. 🚀
