# 🤖 AUTOPOST HOURLY - Scripts de Automatización

**Real Geopolitik X Autopost v1.1.0**

Ejecutar el sistema automáticamente cada hora (LIVE mode).

---

## 📋 Archivos

### macOS / Linux
```bash
scripts/autopost-hourly.sh
```

### Windows PowerShell
```powershell
scripts/autopost-hourly.ps1
```

---

## 🚀 Instalación & uso

### macOS / Linux

#### 1. Permiso de ejecución
```bash
chmod +x scripts/autopost-hourly.sh
```

#### 2. Ejecutar directamente
```bash
./scripts/autopost-hourly.sh
```

#### 3. Ejecutar en background (recomendado)
```bash
nohup ./scripts/autopost-hourly.sh > logs/autopost.log 2>&1 &
```

#### 4. Ejecutar con `screen` (persistente)
```bash
screen -S geopolitik
./scripts/autopost-hourly.sh
# Detach: Ctrl+A, D
# Reattach: screen -r geopolitik
```

#### 5. Ejecutar con `tmux` (persistente)
```bash
tmux new-session -d -s geopolitik -c ~/Youtube\ WorkSpace/geopolitik-x-autopost "./scripts/autopost-hourly.sh"
# Ver: tmux list-sessions
# Attach: tmux attach-session -t geopolitik
```

---

### Windows PowerShell

#### 1. Permitir scripts (primera vez)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. Ejecutar
```powershell
.\scripts\autopost-hourly.ps1
```

#### 3. Ejecutar en ventana nueva (background)
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\scripts\autopost-hourly.ps1'"
```

#### 4. Ejecutar como Task Scheduler (persistente)
```powershell
# Crear task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoExit -Command `& '$(Get-Location)\scripts\autopost-hourly.ps1'"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "GeopolitikAutopost" -Description "Real Geopolitik Autopost Hourly"

# Ver tasks
Get-ScheduledTask | Where-Object {$_.TaskName -like "*Geopol*"}

# Eliminar task
Unregister-ScheduledTask -TaskName "GeopolitikAutopost" -Confirm:$false
```

---

## 📊 Características

### ✅ Loop infinito
Ejecuta indefinidamente, cada hora (3600 segundos).

### ✅ Logging con timestamp
```
[2026-01-25 21:00:00] [INFO] Starting autopost cycle...
[2026-01-25 21:00:05] [SUCCESS] Autopost cycle completed successfully
[2026-01-25 21:01:00] [CYCLE] Cycle #1 completed. Waiting 3600s...
```

### ✅ Retry automático
Si falla:
1. Intenta nuevamente (máx 3 intentos)
2. Espera 120 segundos entre intentos
3. Log de errores

### ✅ Graceful shutdown
- Ctrl+C para detener limpiamente
- No mata procesos a mitad de ejecución

### ✅ No expone keys
- Lee `.env` desde el proyecto
- Usa variables de entorno `X_LIVE=1`, `IMAGE_LIVE=1`

---

## 📁 Logs

Todos los logs se guardan en:
```
logs/autopost-hourly.log
```

**Ver logs en tiempo real:**
```bash
# macOS/Linux
tail -f logs/autopost-hourly.log

# Windows PowerShell
Get-Content logs/autopost-hourly.log -Wait
```

---

## 🔧 Configuración

Para cambiar el intervalo (no cada hora), edita el script:

### macOS/Linux
```bash
# En scripts/autopost-hourly.sh
INTERVAL=3600  # cambiar a 1800 (30 min), 7200 (2h), etc.
```

### Windows PowerShell
```powershell
# En scripts/autopost-hourly.ps1
$Interval = 3600  # cambiar a 1800 (30 min), 7200 (2h), etc.
```

---

## ⚠️ Requisitos

1. **`.env` configurado** con:
   ```bash
   X_API_KEY=...
   X_API_SECRET=...
   X_ACCESS_TOKEN=...
   X_ACCESS_TOKEN_SECRET=...
   OPENAI_API_KEY=...
   ```

2. **npm instalado** y proyecto en directorio

3. **Node.js** funcionando

4. **5 posts/día máximo** (por defecto)
   - Si límite alcanzado, salta ejecución
   - Sigue intentando a la hora siguiente

---

## 📊 Ejemplo de ejecución

```
$ ./scripts/autopost-hourly.sh

[2026-01-25 21:00:00] [START] Real Geopolitik Autopost Hourly Loop started
[2026-01-25 21:00:00] [INFO] Project directory: /Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost
[2026-01-25 21:00:00] [INFO] Log file: /Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost/logs/autopost-hourly.log
[2026-01-25 21:00:00] [CYCLE] === Cycle #1 ===
[2026-01-25 21:00:02] [INFO] Starting autopost cycle...

🌍 GEOPOLITIK X AUTOPOST
📅 2026-01-25T21:00:05.000Z
🔧 Mode: LIVE (explicit --live)
📊 Posts today: 1/5
🤖 Automatic mode: picking trending story...
✅ Picked: "Informe desde Caracas..."
📊 Score: 75.0
✅ Generated: mode="single"...
✅ Thread posted successfully!

[2026-01-25 21:00:15] [SUCCESS] Autopost cycle completed successfully
[2026-01-25 21:00:15] [CYCLE] Cycle #1 completed. Waiting 3600s until next cycle...
[2026-01-25 22:00:15] [CYCLE] === Cycle #2 ===
...
```

---

## 🆘 Troubleshooting

### "npm: command not found"
```bash
# Agregar npm al PATH (macOS)
export PATH="/usr/local/bin:$PATH"
# O usar:
/usr/local/bin/npm run dev -- --live
```

### ".env file not found"
```bash
# Asegurate de ejecutar desde la raíz del proyecto
cd ~/Youtube\ WorkSpace/geopolitik-x-autopost
./scripts/autopost-hourly.sh
```

### "Permission denied"
```bash
# macOS/Linux
chmod +x scripts/autopost-hourly.sh
```

### PowerShell execution policy error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

---

## 🎯 Casos de uso

### Local development
```bash
./scripts/autopost-hourly.sh  # Corre en terminal actual
# Ver logs en tiempo real
```

### Server (AWS, Digital Ocean, VPS)
```bash
nohup ./scripts/autopost-hourly.sh > logs/autopost.log 2>&1 &
# Ver logs después
tail -f logs/autopost-hourly.log
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["./scripts/autopost-hourly.sh"]
```

### Supervisor (persistent daemon)
```ini
[program:geopolitik]
command=/bin/bash /path/to/scripts/autopost-hourly.sh
directory=/path/to/project
autostart=true
autorestart=true
stdout_logfile=/path/to/logs/autopost.log
```

---

## 📈 Monitoreo

### Ver procesos activos
```bash
# macOS/Linux
ps aux | grep autopost

# Windows PowerShell
Get-Process | Where-Object {$_.Name -like "*node*"}
```

### Ver uso de memoria
```bash
# macOS/Linux
top -p <PID>

# Windows PowerShell
Get-Process -Name node | Format-Table Name, WorkingSet
```

---

## 🛑 Detener

### macOS/Linux
```bash
# Si en background
pkill -f autopost-hourly.sh

# O si en screen/tmux
screen -S geopolitik -X quit
tmux kill-session -t geopolitik
```

### Windows PowerShell
```powershell
# En la ventana: Ctrl+C

# O matar proceso
Stop-Process -Name powershell -Force
```

---

**Status:** ✅ **READY FOR PRODUCTION**

Ejecuta cada hora automáticamente. 🚀
