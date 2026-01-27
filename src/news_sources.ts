/**
 * News Sources Configuration
 * RSS feeds for geopolitical news with LatAm priority
 */

export type NewsSource = {
  id: string;
  name: string;
  url: string;
  region: "latam" | "global" | "us";
  priority: 1 | 2 | 3; // 1=highest, 3=lowest
  reliability: "high" | "medium"; // for dedup score
};

export const NEWS_SOURCES: NewsSource[] = [
  // LATAM Priority (region: latam, priority: 1)
  {
    id: "bbc-mundo",
    name: "BBC Mundo",
    url: "https://www.bbc.com/mundo/index.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "rfi-espanol",
    name: "RFI Español",
    url: "https://www.rfi.fr/es/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "france24-espanol",
    name: "France 24 Español",
    url: "https://www.france24.com/es/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elpaís-america",
    name: "El País América",
    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "lanacion-argentina",
    name: "La Nación Argentina",
    url: "https://www.lanacion.com.ar/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "infobae-latam",
    name: "Infobae Latinoamérica",
    url: "https://www.infobae.com/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // Global / International (priority: 2)
  {
    id: "aljazeera-world",
    name: "Al Jazeera English",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "aljazeera-espanol",
    name: "Al Jazeera Español",
    url: "https://www.aljazeera.com/xml/rss/es/all.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "dw-english",
    name: "DW English",
    url: "https://www.dw.com/en/top-stories/s-9097",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "dw-espanol",
    name: "DW Español",
    url: "https://www.dw.com/es/portada/s-9058",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "theguardian-world",
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "npr-world",
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "reuters-world",
    name: "Reuters World News",
    url: "https://feeds.reuters.com/reuters/worldNews",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "ap-news-world",
    name: "AP News - World",
    url: "https://apnews.com/hub/world-news",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "politico-world",
    name: "Politico International",
    url: "https://www.politico.com/politico-today/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },

  // Google News RSS: Cuba + Trump Naval Blockade (high-signal, real-time)
  {
    id: "google-news-cuba-trump",
    name: "Google News - Cuba Trump",
    url: "https://news.google.com/rss/search?q=Trump%20bloqueo%20naval%20Cuba&hl=es-419&gl=US&ceid=US:es-419",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // CUBA NOTICIAS - DIRECT FEEDS (Priority 1)
  {
    id: "radiohabana-cuba",
    name: "Radio Habana Cuba - Spanish",
    url: "https://www.radiohc.cu/es/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "oncuba-news",
    name: "OnCubaNews",
    url: "https://oncubanews.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "havana-times",
    name: "Havana Times",
    url: "https://havanatimes.org/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // US / DEFENSA / MILITAR
  {
    id: "militarytimes",
    name: "Military Times News",
    url: "https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml",
    region: "us",
    priority: 2,
    reliability: "high"
  },
  {
    id: "defensenews",
    name: "Defense News Global",
    url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
    region: "us",
    priority: 2,
    reliability: "high"
  },

  // IRAN NEWS (BRICS ally geopolitics)
  {
    id: "presstv-iran",
    name: "Press TV - Iran",
    url: "https://www.presstv.ir/rss.xml",
    region: "global",
    priority: 2,
    reliability: "medium"
  },

  // CHINA NEWS ENGLISH
  {
    id: "scmp-china",
    name: "South China Morning Post",
    url: "https://www.scmp.com/rss/91/feed",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "cgtn-world",
    name: "CGTN World",
    url: "https://www.cgtn.com/subscribe/rss/section/world.xml",
    region: "global",
    priority: 2,
    reliability: "medium"
  },

  // BREAKING NEWS AGGREGATORS
  {
    id: "cnn-world",
    name: "CNN World News",
    url: "http://rss.cnn.com/rss/edition_world.rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "nbcnews-world",
    name: "NBC News World",
    url: "https://feeds.nbcnews.com/nbcnews/public/world",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "telesur-english",
    name: "TeleSUR English",
    url: "https://www.telesurenglish.net/rss",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },
  {
    id: "mexiconewsdaily",
    name: "Mexico News Daily",
    url: "https://mexiconewsdaily.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "brasilwire",
    name: "Brasil Wire",
    url: "https://www.brasilwire.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },
  {
    id: "laprensa-panama",
    name: "La Prensa Panamá",
    url: "https://www.prensa.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "rt-espanol",
    name: "RT en Español",
    url: "https://actualidad.rt.com/rss",
    region: "global",
    priority: 2,
    reliability: "medium"
  },
  {
    id: "sputnik-mundo",
    name: "Sputnik Mundo",
    url: "https://sputniknews.lat/export/rss2/archive/index.xml",
    region: "latam",
    priority: 2,
    reliability: "medium"
  },
  {
    id: "ansa-latam",
    name: "ANSA Latinoamérica",
    url: "https://www.ansa.it/sito/ansait_rss.xml",
    region: "latam",
    priority: 2,
    reliability: "high"
  },
  {
    id: "efe-latam",
    name: "EFE América",
    url: "https://www.efe.com/efe/america/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  }
];

// Keywords that signal geopolitical importance
export const GEOPOLITICS_KEYWORDS = [
  // Conflict & war
  "guerra", "conflicto", "guerra civil", "invasión", "ataque militar",
  "bomba", "misil", "artillería", "ejército", "defensa",

  // Diplomacy & politics
  "sanciones", "embajada", "embargo", "negociación", "tratado",
  "acuerdo", "diplomacia", "cumbre", "congreso", "senado",
  "elecciones", "voto", "referéndum", "golpe", "coup",

  // Economic & trade
  "aranceles", "comercio", "bloqueo", "exportación", "importación",
  "petróleo", "energía", "crudo", "gas", "economía", "inversión",

  // Regions & orgs
  "ONU", "OEA", "OTAN", "MERCOSUR", "ALBA", "BRICS",
  "Naciones Unidas", "Organización de Naciones",

  // Migration & borders
  "migración", "frontera", "caravana", "refugiados", "asilo",
  "visa", "control fronterizo",

  // Crisis & emergency
  "crisis", "golpe", "protestas", "manifestación", "bloqueo",
  "estado de emergencia", "desastre", "catástrofe"
];

// LatAm-specific keywords (boost if found)
export const LATAM_KEYWORDS = [
  "Cuba", "Venezuela", "Haití", "México", "Brasil",
  "Colombia", "Argentina", "Chile", "Perú", "Ecuador",
  "Bolivia", "República Dominicana", "Panamá", "Guatemala",
  "Honduras", "Nicaragua", "El Salvador", "Costa Rica",
  "Paraguay", "Uruguay", "Belize", "Jamaica", "Trinidad",

  // Regional mentions
  "América Latina", "Caribe", "Latinoamérica", "EEUU",
  "Hispanoamérica", "Sudamérica", "Centroamérica"
];

// Keywords to avoid (opinion, lifestyle, sports)
export const EXCLUDE_KEYWORDS = [
  "deporte", "sport", "fútbol", "soccer", "opinión", "opinion",
  "análisis", "analysis", "culturalifestyle", "entretenimiento",
  "cine", "película", "música", "cantante", "actor",
  "resena", "review", "belleza", "moda", "fashion",
  "receta", "cocina", "viaje", "viajes", "turismo"
];

export function isGeopoliticallyRelevant(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase();

  // If it matches exclude keywords, it's not relevant
  if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) {
    return false;
  }

  // Must have at least one geopolitics keyword
  return GEOPOLITICS_KEYWORDS.some(kw => text.includes(kw));
}

export function hasLatAmMention(text: string): boolean {
  return LATAM_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}
