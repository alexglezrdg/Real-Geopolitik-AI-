/**
 * Video Search Module
 * Busca videos de YouTube relacionados con noticias geopolíticas
 * Sin necesidad de API key (usa RSS de YouTube)
 */

export interface VideoResult {
  title: string;
  videoId: string;
  url: string;
  channelName: string;
  publishedAt: string;
  thumbnail: string;
}

// Canales de noticias geopolíticas en español con feeds RSS de YouTube
// NOTA: Solo incluir channel IDs verificados que retornan feeds válidos
const YOUTUBE_NEWS_CHANNELS = [
  // CANALES VERIFICADOS Y FUNCIONANDO ✓
  {
    name: "France 24 Español",
    feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCUdOoVWuWmgo1wByzcsyKDQ",
    priority: 1,
  },
  {
    name: "El País",
    feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCnsvJeZO4RigQ898WdDNoBw",
    priority: 1,
  },
  {
    name: "A Bordo Noticias",
    feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNSBGs9WyhFREBxi7vlwcTw",
    priority: 2,
  },
  {
    name: "Euronews",
    feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCW2QcKZiU8aUGg4yxCIditg",
    priority: 1,
  },
  // TODO: Agregar más canales verificados en el futuro
  // Para encontrar channel IDs: ir al canal de YouTube, ver código fuente, buscar "channelId"
];

// Keywords para filtrar videos geopolíticos
const GEOPOLITICAL_VIDEO_KEYWORDS = [
  // Figuras de EEUU
  "trump", "biden", "marco rubio", "rubio", "pompeo", "blinken",
  "casa blanca", "congreso", "senado", "pentagon",
  // Figuras LatAm
  "maduro", "nicolás maduro", "maría corina", "maria corina", "machado",
  "milei", "javier milei", "cristina", "kirchner",
  "lula", "bolsonaro",
  "sheinbaum", "claudia sheinbaum", "amlo", "lópez obrador",
  "petro", "gustavo petro", "duque",
  "boric", "gabriel boric",
  "díaz-canel", "diaz-canel", "canel",
  "bukele", "nayib bukele",
  "noboa", "daniel noboa",
  // Países y regiones
  "cuba", "venezuela", "eeuu", "estados unidos", "rusia", "china",
  "ucrania", "iran", "irán", "israel", "palestina", "gaza",
  "méxico", "argentina", "brasil", "colombia", "nicaragua", "haiti",
  "corea del norte", "corea del sur", "taiwán", "taiwan",
  // Figuras internacionales
  "putin", "zelensky", "xi jinping", "kim jong", "netanyahu",
  "erdogan", "modi", "macron", "scholz",
  // Temas geopolíticos
  "sanciones", "bloqueo", "embargo", "aranceles", "comercio",
  "militar", "guerra", "conflicto", "tensión", "crisis",
  "frontera", "migración", "deportación", "migrantes",
  "otan", "nato", "nuclear", "diplomacia", "cumbre", "acuerdo",
  "petróleo", "gas", "energía", "brics",
];

/**
 * Decodifica entidades HTML comunes
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

/**
 * Parsea feed RSS de YouTube
 */
function parseYouTubeFeed(feed: any): VideoResult[] {
  const videos: VideoResult[] = [];
  
  const entries = feed?.entry || feed?.items || [];
  
  for (const entry of entries) {
    try {
      const videoId = entry["yt:videoId"] || 
                      entry.id?.split(":").pop() ||
                      entry.link?.href?.match(/v=([a-zA-Z0-9_-]{11})/)?.[1];
      
      if (!videoId) continue;
      
      videos.push({
        title: entry.title || entry.title?.["#text"] || "",
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channelName: entry.author?.name || entry["yt:channelId"] || "",
        publishedAt: entry.published || entry.pubDate || "",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      });
    } catch (e) {
      // Skip invalid entries
    }
  }
  
  return videos;
}

/**
 * Busca videos geopolíticos recientes de canales de noticias
 */
export async function searchGeopoliticalVideos(
  keywords: string[] = GEOPOLITICAL_VIDEO_KEYWORDS,
  maxResults: number = 10
): Promise<VideoResult[]> {
  const allVideos: VideoResult[] = [];
  
  console.log(`🎬 Buscando videos en ${YOUTUBE_NEWS_CHANNELS.length} canales...`);
  
  for (const channel of YOUTUBE_NEWS_CHANNELS) {
    try {
      const response = await fetch(channel.feedUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      
      if (!response.ok) {
        console.log(`  ✗ ${channel.name}: ${response.status}`);
        continue;
      }
      
      const text = await response.text();
      
      // Parse XML manually (simple)
      const entries: VideoResult[] = [];
      const entryMatches = text.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
      
      for (const match of entryMatches) {
        const entryXml = match[1];
        
        const videoIdMatch = entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const titleMatch = entryXml.match(/<title>([^<]+)<\/title>/);
        const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/);
        const authorMatch = entryXml.match(/<name>([^<]+)<\/name>/);
        
        if (videoIdMatch && titleMatch) {
          const rawTitle = decodeHtmlEntities(titleMatch[1]);
          entries.push({
            title: rawTitle,
            videoId: videoIdMatch[1],
            url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
            channelName: authorMatch?.[1] || channel.name,
            publishedAt: publishedMatch?.[1] || "",
            thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`,
          });
        }
      }
      
      console.log(`  ✓ ${channel.name}: ${entries.length} videos`);
      allVideos.push(...entries);
      
    } catch (e) {
      console.log(`  ✗ ${channel.name}: Error`);
    }
  }
  
  // Filtrar por keywords geopolíticos
  const filtered = allVideos.filter(video => {
    const titleLower = video.title.toLowerCase();
    return keywords.some(kw => titleLower.includes(kw.toLowerCase()));
  });
  
  console.log(`🎯 ${filtered.length} videos geopolíticos encontrados`);
  
  // Ordenar por fecha (más recientes primero)
  filtered.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });
  
  return filtered.slice(0, maxResults);
}

/**
 * Busca videos específicos sobre un tema
 */
export async function searchVideosByTopic(
  topic: string,
  maxResults: number = 5
): Promise<VideoResult[]> {
  const topicKeywords = topic.toLowerCase().split(/\s+/);
  return searchGeopoliticalVideos(topicKeywords, maxResults);
}

/**
 * Extrae hashtags relevantes del título del video
 */
function extractHashtags(title: string): string[] {
  const lower = title.toLowerCase();
  const hashtags: Set<string> = new Set();
  
  const keywordToHashtag: Record<string, string> = {
    // Figuras
    "trump": "#Trump", "biden": "#Biden",
    "marco rubio": "#MarcoRubio", "rubio": "#Rubio",
    "maduro": "#Maduro", "nicolás maduro": "#Maduro",
    "maría corina": "#MariaCorina", "maria corina": "#MariaCorina", "machado": "#MariaCorina",
    "milei": "#Milei", "javier milei": "#Milei",
    "lula": "#Lula", "bolsonaro": "#Bolsonaro",
    "sheinbaum": "#Sheinbaum", "amlo": "#AMLO",
    "petro": "#Petro", "gustavo petro": "#Petro",
    "boric": "#Boric",
    "bukele": "#Bukele",
    "putin": "#Putin", "zelensky": "#Zelensky",
    "xi jinping": "#XiJinping", "netanyahu": "#Netanyahu",
    "díaz-canel": "#DiazCanel", "diaz-canel": "#DiazCanel",
    // Países
    "cuba": "#Cuba", "venezuela": "#Venezuela",
    "eeuu": "#EEUU", "estados unidos": "#EEUU",
    "rusia": "#Rusia", "china": "#China",
    "ucrania": "#Ucrania", "iran": "#Iran", "irán": "#Iran",
    "israel": "#Israel", "palestina": "#Palestina", "gaza": "#Gaza",
    "méxico": "#Mexico", "mexico": "#Mexico",
    "argentina": "#Argentina", "brasil": "#Brasil",
    "colombia": "#Colombia", "nicaragua": "#Nicaragua",
    // Temas
    "sanciones": "#Sanciones", "bloqueo": "#Bloqueo",
    "aranceles": "#Aranceles", "guerra": "#Guerra",
    "migración": "#Migracion", "migrantes": "#Migrantes",
    "deportación": "#Deportacion", "frontera": "#Frontera",
    "otan": "#OTAN", "nato": "#NATO",
    "nuclear": "#Nuclear", "brics": "#BRICS",
  };
  
  for (const [keyword, hashtag] of Object.entries(keywordToHashtag)) {
    if (lower.includes(keyword)) {
      hashtags.add(hashtag);
    }
  }
  
  // Máximo 3 hashtags para no saturar
  return Array.from(hashtags).slice(0, 3);
}

/**
 * Genera un copy breve y humano basado en el título
 */
function generateHumanCopy(title: string): string {
  // Limpiar el título de prefijos y sufijos comunes
  let cleanTitle = title
    // Prefijos comunes de breaking news
    .replace(/^(ÚLTIMA HORA|URGENTE|BREAKING|EN VIVO|LIVE|DIRECTO|AHORA|\d+\/\d+\/\d+)\s*[\|:\-•]?\s*/gi, "")
    // Sufijos de canales - más exhaustivo
    .replace(/\s*[\|•\-]+\s*(FRANCE 24|France 24|DW|CNN|Euronews|BBC|NTN24|Telemundo|Univision|EL PA[IÍ]S|El Pa[ií]s|RT|TeleSUR|Infobae|VOA|A Bordo).*$/gi, "")
    // #shorts y similar
    .replace(/\s*#\w+\s*$/gi, "")
    // Limpiar espacios extra
    .replace(/\s+/g, " ")
    .trim();
  
  // Si el título es muy largo, usar solo la primera parte significativa
  if (cleanTitle.length > 140) {
    // Intentar cortar en separadores naturales
    const separators = [": ", " - ", " | ", ". "];
    for (const sep of separators) {
      const idx = cleanTitle.indexOf(sep);
      if (idx > 30 && idx < 140) {
        cleanTitle = cleanTitle.slice(0, idx);
        break;
      }
    }
    // Si aún muy largo, cortar en espacio más cercano a 140
    if (cleanTitle.length > 140) {
      const lastSpace = cleanTitle.lastIndexOf(" ", 137);
      if (lastSpace > 80) {
        cleanTitle = cleanTitle.slice(0, lastSpace) + "...";
      }
    }
  }
  
  return cleanTitle;
}

/**
 * Formatea un video para tweet - estilo humano con hashtags
 */
export function formatVideoTweet(video: VideoResult, _newsContext?: string): string {
  const flags = detectVideoFlags(video.title);
  const hashtags = extractHashtags(video.title);
  const humanCopy = generateHumanCopy(video.title);
  
  // Formato: 🇺🇸🇨🇺‼️ Copy humano breve
  // 
  // ▶️ URL
  // #Hashtag1 #Hashtag2
  
  let tweet = `${flags}${humanCopy}`;
  tweet += `\n\n▶️ ${video.url}`;
  
  if (hashtags.length > 0) {
    tweet += `\n\n${hashtags.join(" ")}`;
  }
  
  return tweet;
}

/**
 * Formatea un video para tweet NATIVO (sin URL, porque el video se sube directamente)
 * Para cuando descargamos y subimos el video a Twitter
 */
export function formatVideoTweetNative(video: VideoResult): string {
  const flags = detectVideoFlags(video.title);
  const hashtags = extractHashtags(video.title);
  const humanCopy = generateHumanCopy(video.title);
  
  // Formato para video nativo - sin URL porque el video está adjunto
  // 🇺🇸🇨🇺‼️ Copy humano breve
  // 
  // 📺 Fuente: Canal
  // #Hashtag1 #Hashtag2
  
  let tweet = `${flags}${humanCopy}`;
  
  // Agregar crédito del canal
  const channelClean = video.channelName
    .replace(/\s*-\s*(Español|en Español|Spanish)$/i, "")
    .trim();
  tweet += `\n\n📺 ${channelClean}`;
  
  if (hashtags.length > 0) {
    tweet += `\n\n${hashtags.join(" ")}`;
  }
  
  return tweet;
}

/**
 * Detecta banderas de países en el título del video
 */
function detectVideoFlags(title: string): string {
  const lower = title.toLowerCase();
  const flags: Set<string> = new Set();
  
  const mapping: Record<string, string> = {
    // EEUU
    "eeuu": "🇺🇸", "estados unidos": "🇺🇸", "trump": "🇺🇸", "biden": "🇺🇸",
    "marco rubio": "🇺🇸", "rubio": "🇺🇸", "casa blanca": "🇺🇸", "washington": "🇺🇸",
    // Cuba
    "cuba": "🇨🇺", "habana": "🇨🇺", "díaz-canel": "🇨🇺", "diaz-canel": "🇨🇺",
    // Venezuela
    "venezuela": "🇻🇪", "maduro": "🇻🇪", "caracas": "🇻🇪", "maría corina": "🇻🇪", "maria corina": "🇻🇪", "machado": "🇻🇪",
    // Rusia
    "rusia": "🇷🇺", "putin": "🇷🇺", "moscú": "🇷🇺", "kremlin": "🇷🇺",
    // China
    "china": "🇨🇳", "beijing": "🇨🇳", "pekín": "🇨🇳", "xi jinping": "🇨🇳",
    // Ucrania
    "ucrania": "🇺🇦", "kiev": "🇺🇦", "zelensky": "🇺🇦",
    // Medio Oriente
    "iran": "🇮🇷", "irán": "🇮🇷", "teherán": "🇮🇷",
    "israel": "🇮🇱", "netanyahu": "🇮🇱", "tel aviv": "🇮🇱",
    "palestina": "🇵🇸", "gaza": "🇵🇸", "cisjordania": "🇵🇸",
    // México
    "méxico": "🇲🇽", "mexico": "🇲🇽", "sheinbaum": "🇲🇽", "amlo": "🇲🇽",
    // Argentina
    "argentina": "🇦🇷", "milei": "🇦🇷", "buenos aires": "🇦🇷",
    // Brasil
    "brasil": "🇧🇷", "lula": "🇧🇷", "bolsonaro": "🇧🇷", "brasilia": "🇧🇷",
    // Colombia
    "colombia": "🇨🇴", "petro": "🇨🇴", "bogotá": "🇨🇴",
    // Otros LatAm
    "chile": "🇨🇱", "boric": "🇨🇱",
    "nicaragua": "🇳🇮", "ortega": "🇳🇮",
    "el salvador": "🇸🇻", "bukele": "🇸🇻",
    "ecuador": "🇪🇨", "noboa": "🇪🇨",
    "perú": "🇵🇪", "peru": "🇵🇪",
    "haiti": "🇭🇹", "haití": "🇭🇹",
    "panamá": "🇵🇦", "panama": "🇵🇦",
    // Asia
    "corea del norte": "🇰🇵", "kim jong": "🇰🇵", "pyongyang": "🇰🇵",
    "corea del sur": "🇰🇷", "seúl": "🇰🇷",
    "taiwán": "🇹🇼", "taiwan": "🇹🇼",
    "india": "🇮🇳", "modi": "🇮🇳",
    // Europa
    "francia": "🇫🇷", "macron": "🇫🇷",
    "alemania": "🇩🇪", "scholz": "🇩🇪",
    "reino unido": "🇬🇧", "uk": "🇬🇧",
    "turquía": "🇹🇷", "erdogan": "🇹🇷",
    "otan": "🏳️", "nato": "🏳️",
  };
  
  for (const [keyword, flag] of Object.entries(mapping)) {
    if (lower.includes(keyword)) {
      flags.add(flag);
    }
  }
  
  const flagStr = Array.from(flags).slice(0, 2).join("");
  return flagStr ? `${flagStr}‼️ ` : "🌎‼️ ";
}

// Test function
export async function testVideoSearch() {
  console.log("=".repeat(60));
  console.log("TEST: Video Search");
  console.log("=".repeat(60));
  
  const videos = await searchGeopoliticalVideos(["trump", "cuba", "venezuela"], 5);
  
  for (const video of videos) {
    console.log(`\n📹 ${video.title}`);
    console.log(`   Canal: ${video.channelName}`);
    console.log(`   URL: ${video.url}`);
    console.log(`   Fecha: ${video.publishedAt}`);
  }
  
  if (videos.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("Ejemplo de tweet:");
    console.log(formatVideoTweet(videos[0]));
  }
}

// Run test if executed directly
if (process.argv[1]?.includes("video_search")) {
  testVideoSearch();
}
