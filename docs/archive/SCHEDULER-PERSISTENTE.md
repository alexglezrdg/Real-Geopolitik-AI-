# 🔧 CONFIGURACIÓN PERSISTENTE - Evitar Standby

**Objetivo:** Asegurar que los posts se ejecuten automáticamente cada hora, incluso si la laptop está en standby.

---

## 📋 PROBLEMA ACTUAL

- Posts se detienen cuando la laptop entra en mode de standby/sleep
- El script `autopost-hourly.sh` solo funciona si la máquina está despierta
- Necesitamos: **Cron Job del sistema operativo** (no depende de aplicación corriendo)

---

## ✅ SOLUCIÓN: Cron del Sistema

Cron es el scheduler del sistema operativo macOS/Linux que **se ejecuta independientemente del estado de la laptop**, despertando el sistema si es necesario.

### 1. **Crear archivo de cron (launchd en macOS)**

En macOS, usamos **`launchd`** en lugar de cron tradicional (más confiable).

#### Paso 1: Crear el archivo plist

```bash
# Crear directorio si no existe
mkdir -p ~/Library/LaunchAgents

# Crear el archivo de configuración
nano ~/Library/LaunchAgents/com.geopolitik.autopost.plist
```

#### Paso 2: Pegue este contenido:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.geopolitik.autopost</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>bash</string>
        <string>/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost/scripts/autopost-hourly.sh</string>
    </array>
    
    <!-- Ejecutar cada hora (3600 segundos) -->
    <key>StartInterval</key>
    <integer>3600</integer>
    
    <!-- Logs -->
    <key>StandardOutPath</key>
    <string>/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost/logs/launchd-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost/logs/launchd-stderr.log</string>
    
    <!-- Reintentar si falla -->
    <key>KeepAlive</key>
    <false/>
    
    <!-- Trabajar desde el directorio correcto -->
    <key>WorkingDirectory</key>
    <string>/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost</string>
    
    <!-- Variables de entorno -->
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>X_LIVE</key>
        <string>1</string>
        <key>IMAGE_LIVE</key>
        <string>1</string>
    </dict>
</dict>
</plist>
```

#### Paso 3: Cargar el servicio

```bash
# Cargar el servicio en launchd
launchctl load ~/Library/LaunchAgents/com.geopolitik.autopost.plist

# Verificar que está corriendo
launchctl list | grep geopolitik
```

#### Paso 4: Verificar logs

```bash
# Ver logs de ejecución
tail -f logs/launchd-stdout.log
tail -f logs/launchd-stderr.log

# Ver logs del autopost
tail -f logs/autopost-hourly.log
```

---

## 🛑 COMANDOS DE CONTROL

```bash
# Descargar el servicio
launchctl unload ~/Library/LaunchAgents/com.geopolitik.autopost.plist

# Recargar después de cambios
launchctl unload ~/Library/LaunchAgents/com.geopolitik.autopost.plist
launchctl load ~/Library/LaunchAgents/com.geopolitik.autopost.plist

# Ver estado
launchctl list com.geopolitik.autopost

# Ver todos los servicios activos
launchctl list | grep -i geopolitik
```

---

## 📊 DIFERENCIA: LaunchD vs Cron vs Screen/Nohup

| Método | Ventaja | Desventaja | Funciona en Standby |
|--------|---------|-----------|-------------------|
| **LaunchD (macOS)** | Nativo, confiable, integrado | Solo macOS | ✅ SÍ |
| **Cron tradicional** | Estándar en Unix/Linux | No soporta NanoID bien | Parcial |
| **Screen/Nohup** | Simple, funciona en Linux | Depende de terminal abierta | ❌ NO |
| **Systemd (Linux)** | Moderno, integrado | Solo Linux | ✅ SÍ |

---

## 🔄 ALTERNATIVA LINUX: SystemD (si usas Linux en servidor)

Si tu servidor es Linux, usa **systemd timer** en lugar de launchd:

### 1. Crear servicio

```bash
sudo nano /etc/systemd/system/geopolitik-autopost.service
```

### 2. Contenido:

```ini
[Unit]
Description=GeopolitikX Autopost Service
After=network.target

[Service]
Type=oneshot
User=alexgonzalez
WorkingDirectory=/Users/alexgonzalez/Youtube\ WorkSpace/geopolitik-x-autopost
Environment="PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
Environment="NODE_ENV=production"
Environment="X_LIVE=1"
Environment="IMAGE_LIVE=1"
ExecStart=/bin/bash /Users/alexgonzalez/Youtube\ WorkSpace/geopolitik-x-autopost/scripts/autopost-hourly.sh
StandardOutput=append:/Users/alexgonzalez/Youtube\ WorkSpace/geopolitik-x-autopost/logs/systemd-stdout.log
StandardError=append:/Users/alexgonzalez/Youtube\ WorkSpace/geopolitik-x-autopost/logs/systemd-stderr.log

[Install]
WantedBy=multi-user.target
```

### 3. Crear timer (cada hora)

```bash
sudo nano /etc/systemd/system/geopolitik-autopost.timer
```

```ini
[Unit]
Description=GeopolitikX Autopost Timer
Requires=geopolitik-autopost.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=1h
Persistent=true

[Install]
WantedBy=timers.target
```

### 4. Habilitar

```bash
sudo systemctl daemon-reload
sudo systemctl enable geopolitik-autopost.timer
sudo systemctl start geopolitik-autopost.timer
sudo systemctl status geopolitik-autopost.timer
```

---

## ✨ VERIFICACIÓN FINAL

Para verificar que el sistema está funcionando:

```bash
# Ver próxima ejecución
launchctl list com.geopolitik.autopost

# Ejecutar manualmente para probar
bash scripts/autopost-hourly.sh

# Ver logs históricos
tail -50 logs/launchd-stdout.log
tail -50 logs/autopost-hourly.log
```

---

## 📝 CHECKLIST DE CONFIGURACIÓN

- [ ] Archivo plist creado en `~/Library/LaunchAgents/`
- [ ] Script `autopost-hourly.sh` tiene permisos de ejecución (`chmod +x`)
- [ ] Servicio cargado con `launchctl load`
- [ ] Variables de entorno configuradas (X_LIVE=1, IMAGE_LIVE=1)
- [ ] Logs accesibles y monitoreables
- [ ] Se ejecutó primer test manual
- [ ] Verificado que launchctl lista el servicio

---

**Resultado:** Los posts se ejecutarán **cada hora automáticamente**, incluso si la laptop está en standby.
