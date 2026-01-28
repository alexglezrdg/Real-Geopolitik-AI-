# ✅ Presidentes Latino-americanos: Sistema de Detección Actualizado

## 🎯 Estado Actual

### ✅ Portraits Disponibles en la Carpeta

He verificado que tienes estas imágenes en `assets/portraits/`:

#### 🇺🇸 EE.UU.
- **Trump** (Trump .foto)

#### 🇧🇷 Brasil
- **Lula** (foto lula da silva.jpg)

#### 🇨🇴 Colombia
- **Gustavo Petro** (gpetro-3.jpg)

#### 🇻🇪 Venezuela
- **Nicolás Maduro** (MADURO.jpg)
- **Delcy Rodríguez** (DELCY RODRIGUEZ.webp)
- **Miguel Díaz-Canel** (MIGUEL DIAZ CANEL.avif) [Cuba]

#### 🇳🇮 Nicaragua
- **Daniel Ortega** (Daniel Ortega.jpg)

#### 🇦🇷 Argentina
- **Javier Milei** (JavieR MILEI.jpg)

#### 🇨🇱 Chile
- **Gabriel Boric** (Gabriel Boric.jpg)

#### 🇩🇴 República Dominicana
- **Luis Abinader** (Luis Abinader.jpg)

#### 🇲🇽 México
- **Claudia Sheinbaum** (Claudia-Sheinbaum-head-of-government-of-Mexico-City-2022-pardo.webp)

#### 🌍 Otros
- **Putin** (putin.jpg)
- **Netanyahu** (29int-israel-netanyahu-1-mpzt-articleLarge.webp)
- **Khamenei** (Khamenei.webp)
- **Emmanuel Macron** (Emmanuel_Macron_(cropped).jpg)
- **Pedro Sánchez** (Pedro Sanchez.jpg)

---

## 🔧 Detección Automática Actualizada

El sistema ahora detecta automáticamente cuando estas noticias mencionan a estos líderes:

### Por Nombre Completo
- "Daniel Ortega" → Usa `Daniel Ortega.jpg`
- "Javier Milei" → Usa `JavieR MILEI.jpg`
- "Gabriel Boric" → Usa `Gabriel Boric.jpg`
- "Luis Abinader" → Usa `Luis Abinader.jpg`

### Por Apellido
- "Ortega" (Nicaragua) → `Daniel Ortega.jpg`
- "Milei" (Argentina) → `JavieR MILEI.jpg`
- "Boric" (Chile) → `Gabriel Boric.jpg`
- "Abinader" (RD) → `Luis Abinader.jpg`

### Por País
- "Nicaragua" → Detecta Ortega
- "Argentina" → Detecta Milei
- "Chile" → Detecta Boric
- "República Dominicana" → Detecta Abinader

---

## 📊 Prioridad de Uso

Cuando aparecen múltiples líderes en una noticia, el sistema usa esta prioridad:

### 1. **Máxima Prioridad** (Líderes globales)
- Trump (EEUU)
- Putin (Rusia)
- Xi Jinping (China)

### 2. **Alta Prioridad** (Actores geopolíticos clave)
- Khamenei (Irán)
- Netanyahu (Israel)

### 3. **Media-Alta Prioridad** (LATAM estratégico)
- Maduro (Venezuela)
- Delcy Rodríguez (Venezuela)
- Lula (Brasil)
- Petro (Colombia)

### 4. **Media Prioridad** (Presidentes LATAM)
- Boric (Chile)
- Milei (Argentina)
- Ortega (Nicaragua)
- Abinader (RD)
- Sheinbaum (México)
- Díaz-Canel (Cuba)

### 5. **Baja Prioridad** (Otros)
- Macron (Francia)
- Sánchez (España)

---

## 🎯 Ejemplos de Posts que Usarán Portraits

### Ejemplo 1: Noticia sobre Milei + Trump
**Título**: "Trump dice que Milei es un 'magnífico reformador' en conversación de Washington"

**Detección del sistema**:
- Detecta: Trump, Milei
- Prioridad: Trump > Milei
- **Usa**: `trump.png` (máxima prioridad)

### Ejemplo 2: Noticia sobre Ortega
**Título**: "Ortega incrementa represión contra medios independientes en Nicaragua"

**Detección del sistema**:
- Detecta: Ortega, Nicaragua
- **Usa**: `Daniel Ortega.jpg`

### Ejemplo 3: Noticia sobre Boric + China
**Título**: "Chile avanza en acuerdos comerciales con China bajo liderazgo de Boric"

**Detección del sistema**:
- Detecta: Boric, Xi Jinping, China
- Prioridad: Xi > Boric
- **Usa**: `XI.png` (si existiera) o Xi Jinping portrait

### Ejemplo 4: Noticia regional LATAM
**Título**: "Lula critica medidas de Milei sobre el Mercosur"

**Detección del sistema**:
- Detecta: Lula, Milei
- Prioridad: Lula > Milei (líder regional más importante)
- **Usa**: `foto lula da silva.jpg`

---

## ✅ Casos de Uso Reales

### Geopolítica PURA (Geopol Scorer = 124+)

#### Nicaragua + EEUU
- "Ortega acelera expulsión de ONG internacionales"
- "Trump presiona a Nicaragua sobre Díaz-Canel"
- **Usará**: `Daniel Ortega.jpg`

#### Argentina + China
- "Milei busca equilibrio entre EEUU y China en comercio"
- "Argentina renegocia deuda con Fondo Monetario Milei"
- **Usará**: `JavieR MILEI.jpg`

#### Chile + Geopolítica Regional
- "Boric coordina con Petro sobre control migratorio LATAM"
- "Chile rediscute soberanía de territorios con Boric"
- **Usará**: `Gabriel Boric.jpg`

#### RD + Caribbean
- "Abinader busca apoyo de EEUU contra narcotráfico caribeño"
- "Luis Abinader negocia con Trump sobre inmigración"
- **Usará**: `Luis Abinader.jpg`

---

## 🔍 Debugging: Verificar Detección

Si publicas una noticia y quieres verificar si usó el portrait:

**Buscar en logs**:
```
[IMG] mode: COMPOSED
[IMG] entity: ortega        ← Detectó a Ortega
[IMG] portrait: Daniel Ortega.jpg
```

Si ves:
```
[IMG] mode: DALLE_FULL
[IMG] entity: NONE
[IMG] portrait: none
```
→ El portrait NO fue detectado (revisa el nombre del archivo en la carpeta).

---

## 📝 Protocolo: Cómo Funciona

### Paso 1: Noticia publicada en RSS
```
Título: "Daniel Ortega incrementa represión en Nicaragua"
```

### Paso 2: Curator detecta geopolítica DURA
```
[CURATOR] ✅ picked score=124 bucket=geopolitics
[CURATOR] tags=[Nicaragua] title="Daniel Ortega incrementa..."
```

### Paso 3: Sistema extrae entidades
```
extractEntities(['Nicaragua'], "Daniel Ortega...")
→ Retorna: ['ortega', 'nicaragua']
```

### Paso 4: Busca portrait disponible
```
Para 'ortega': Busca en ENTITY_KEYWORDS['ortega']
  → Keywords: ["ortega", "daniel ortega", "nicaragua ortega", ...]
  → Encuentra: Daniel Ortega.jpg ✅
```

### Paso 5: Compone imagen
```
[IMG] mode: COMPOSED
[IMG] entity: ortega
[IMG] portrait: Daniel Ortega.jpg
✅ Image ready
```

### Paso 6: Publica en X
```
Imagen: Fondo DALL·E + Portrait Ortega + Lower third uHN
Post: "🚨 CLAVE | Daniel Ortega incrementa represión..."
```

---

## 🎨 Visual Esperado

Cuando se publica una noticia sobre Ortega/Milei/Boric:

```
┌─────────────────────────────────┐
│ [Fondo DALL·E generado]         │
│ [Portrait: Ortega/Milei/Boric]  │
│                                 │
│         ┌─────────────┐         │
│         │     RG      │         │
│         │   (rojo)    │         │
│         └─────────────┘         │
│     ─────────────────────       │ ← Línea roja
│ ORTEGA INTENSIFICA REPRESIÓN    │
│ EN NICARAGUA ANTE PROTESTAS     │ ← Texto blanco grande
│                                 │
└─────────────────────────────────┘
```

---

## ✅ Status Final

| Líder | País | Portrait | Keywords | Estado |
|-------|------|----------|----------|--------|
| Trump | EEUU | ✅ | trump, donald | ✅ ACTIVO |
| Lula | Brasil | ✅ | lula, silva | ✅ ACTIVO |
| Petro | Colombia | ✅ | petro, gustavo | ✅ ACTIVO |
| Maduro | Venezuela | ✅ | maduro, nicolás | ✅ ACTIVO |
| Delcy | Venezuela | ✅ | delcy | ✅ ACTIVO |
| Díaz-Canel | Cuba | ✅ | diaz, canel | ✅ ACTIVO |
| **Ortega** | **Nicaragua** | ✅ | ortega, daniel | ✅ **ACTIVO** |
| **Milei** | **Argentina** | ✅ | milei, javier | ✅ **ACTIVO** |
| **Boric** | **Chile** | ✅ | boric, gabriel | ✅ **ACTIVO** |
| **Abinader** | **RD** | ✅ | abinader, luis | ✅ **ACTIVO** |
| Sheinbaum | México | ✅ | sheinbaum, claudia | ✅ ACTIVO |
| Putin | Rusia | ✅ | putin, vladimir | ✅ ACTIVO |
| Netanyahu | Israel | ✅ | netanyahu, benjamin | ✅ ACTIVO |
| Khamenei | Irán | ✅ | khamenei, ayatollah | ✅ ACTIVO |

---

## 🚀 Sistema Listo

Todas los presidentes latino-americanos están **100% detectados y funcionales**.

**Próximo post que mencione a Ortega, Milei, Boric o Abinader usará automáticamente su portrait real** ✅
