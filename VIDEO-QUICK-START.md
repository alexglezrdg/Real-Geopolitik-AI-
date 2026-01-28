# 🎥 GUÍA RÁPIDA - VIDEO INTEGRATION

**v2.0 - GeopolitikX AutoPost**

---

## 🚀 USAR VIDEOS EN TUS POSTS

### Opción 1: YouTube automático en RSS

Si tus fuentes RSS incluyen videos de YouTube, **se detectan automáticamente**.

```typescript
import { extractVideoFromRSSItem } from "./video_integration.js";

// En un feed de RSS
const videoSource = extractVideoFromRSSItem(rssItem);
// → Busca automáticamente: media:content, enclosure, YouTube links

// Pasar al maestro
const output = writeMaestroPost({
  headline: "...",
  summary: "...",
  // ...
  videoSource, // ← NUEVO
});
```

---

### Opción 2: Videos de noticias en artículos

Si tienes URLs de noticias que incluyen videos:

```typescript
import { extractVideoFromNewsArticle } from "./video_integration.js";

// De un artículo parseado
const videoSource = extractVideoFromNewsArticle(article);

const output = writeMaestroPost({
  headline: article.headline,
  summary: article.summary,
  // ...
  videoSource,
});
```

---

### Opción 3: Video manual (YouTube)

Para compartir un video de YouTube específico:

```typescript
import { extractYouTubeId, getYouTubeMetadata } from "./video_integration.js";

const youtubeUrl = "https://www.youtube.com/watch?v=Ld-Ri9UbPCQ";
const videoId = extractYouTubeId(youtubeUrl); // → "Ld-Ri9UbPCQ"

const metadata = await getYouTubeMetadata(videoId, process.env.YOUTUBE_API_KEY);
// → { title, duration, thumbnail, isValid }

const output = writeMaestroPost({
  headline: "...",
  summary: "...",
  // ...
  videoSource: {
    type: "youtube",
    url: youtubeUrl,
    title: metadata.title,
    duration: metadata.duration,
  },
});
```

---

### Opción 4: Video directo (MP4, WebM)

Para links a videos directos:

```typescript
const videoUrl = "https://news.site.com/video/iran-warning.mp4";

const output = writeMaestroPost({
  headline: "...",
  summary: "...",
  // ...
  videoSource: {
    type: "direct_url",
    url: videoUrl,
    title: "Iran warns of consequences",
  },
});
```

---

## 📤 PUBLICAR CON VIDEO

El post se publica con video automáticamente:

```typescript
const result = await postThread(
  output.tweets,
  false, // dryRun = false (publicar)
  imagePath,
  output.videoData?.url // ← Video URL se añade
);
```

---

## 📊 RESULTADO EN X

El post se verá así:

```
🎥 VÍDEO | 🇮🇷 IRAN: Advertencia de reacciones ante armada US

Iran warns of dire consequences if attacked

📌 CONTEXTO:
Tensión creciente en Estrecho de Ormuz...

Fuente: Al Jazeera
https://www.youtube.com/watch?v=...

#Breaking #News #Geopolitics
```

---

## 🔧 CONFIGURACIÓN OPCIONAL

### YouTube API (para metadata)

Si quieres metadata (duración exacta, thumbnail), configura:

```bash
export YOUTUBE_API_KEY="your-key-here"
```

Sin esto, se obtiene metadata básica.

---

### Validación X/Twitter

Verificar si video es compatible:

```typescript
import { isXCompatible } from "./video_integration.js";

if (isXCompatible(videoMetadata, isPremium = false)) {
  // ✅ Puedes publicar en X
} else {
  // ❌ Video muy largo o formato no soportado
  console.warn("Video no compatible con X");
}
```

---

## 📋 FORMATOS SOPORTADOS

| Tipo | URL | Ejemplo |
|------|-----|---------|
| **YouTube** | youtube.com/watch?v= | https://youtube.com/watch?v=Ld-Ri9UbPCQ |
| **YouTube Corto** | youtu.be/ | https://youtu.be/Ld-Ri9UbPCQ |
| **MP4** | .mp4 | https://site.com/video.mp4 |
| **WebM** | .webm | https://site.com/video.webm |
| **MOV** | .mov | https://site.com/video.mov |
| **RSS Enclosure** | media:content | Detectado automáticamente |

---

## 🎯 CASOS DE USO

### Caso 1: Alerta News 24 - Style (Video de evento)
```typescript
// Video de conferencia de prensa
const videoSource = {
  type: "youtube",
  url: "https://youtube.com/watch?v=...",
  title: "Press conference: Sanctions announcement",
};

// Post resultado:
// 🎥 VÍDEO | 🇺🇸 USA: Conferencia de sanciones
// [Video embebido]
// 📌 Contexto: Nuevas medidas contra...
```

### Caso 2: uHN - Explicador visual
```typescript
// Video explicativo de 2 minutos
const videoSource = {
  type: "direct_url",
  url: "https://media.news.com/explainer-ukraine.mp4",
  title: "Ukraine crisis explained in 2 minutes",
  duration: 120,
};

// Post resultado:
// 🎥 VÍDEO | 🇺🇦 UKRAINE: Crisis explicada
// [Video compuesto]
// 📊 Timeline: desde 2022 hasta hoy
```

### Caso 3: Breaking News - Clip en vivo
```typescript
// Video clip de 45 segundos
const videoSource = {
  type: "youtube",
  url: "https://youtube.com/watch?v=breaking-clip",
};

// Post resultado:
// 🚨 VÍDEO | 🌍 BREAKING: Reacción internacional
// [Video en vivo]
// 📍 Fuente: Reuters
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Video not found"
```
✓ Verificar URL de YouTube es correcta
✓ Video no está privado o eliminado
✓ API key válida (si usas metadata)
```

### Problema: "Video too long for X"
```
✓ Videos X regular: máx 140 segundos
✓ Videos X Premium: máx 4 horas
✓ Usar `isXCompatible()` para validar
```

### Problema: "Video URL not detected in RSS"
```
✓ Verificar feed RSS tiene media:content
✓ O video link en description
✓ O enclosure tag
✓ Si no, pasar manualmente en `videoSource`
```

---

## 📞 EJEMPLOS COMPLETOS

### Ejemplo 1: Post con YouTube automático

```typescript
import { extractYouTubeId, getYouTubeMetadata } from "./video_integration.js";
import { writeMaestroPost } from "./post_writer_maestro.js";
import { postThread } from "./x.js";

const newsItem = {
  headline: "Iran warns US of dire consequences",
  summary: "Iranian government issues warning amid US naval presence...",
  url: "https://aljazeera.com/...",
  source: "Al Jazeera",
  published_at: new Date().toISOString(),
  region_bucket: "MIDDLE_EAST",
  topic_tags: ["security", "military"],
  entities: ["Iran", "USA"],
  videoSource: {
    type: "youtube",
    url: "https://youtube.com/watch?v=xyz123",
    title: "Iran warns US",
  },
};

const post = writeMaestroPost(newsItem);
await postThread(
  post.tweets,
  false, // live mode
  imagePath,
  post.videoData?.url // ← Video se incluye
);
```

### Ejemplo 2: RSS con video automático

```typescript
import { RSSFeedParser } from "./rss.js";
import { extractVideoFromRSSItem } from "./video_integration.js";
import { writeMaestroPost } from "./post_writer_maestro.js";

const feed = await RSSFeedParser.parse("https://reuters.com/feed");

for (const item of feed.items) {
  const videoSource = extractVideoFromRSSItem(item);
  
  if (videoSource) {
    console.log(`📹 Video found: ${videoSource.url}`);
    
    const post = writeMaestroPost({
      headline: item.title,
      summary: item.summary,
      url: item.link,
      source: item.source,
      published_at: item.pubDate,
      region_bucket: "GLOBAL_GEO",
      topic_tags: item.tags || [],
      entities: item.entities || [],
      videoSource, // ← Automático desde RSS
    });
    
    if (post) {
      // Publicar con video
      await postThread(post.tweets, false, null, post.videoData?.url);
    }
  }
}
```

---

**¡Listo para compartir videos con tus posts de noticias geopolíticas! 🚀**
