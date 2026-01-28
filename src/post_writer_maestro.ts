import type { NewsPack } from "./claude.js";
import type { VideoMetadata, VideoSource } from "./video_integration.js";

/**
 * PROMPT MAESTRO - Post Writer for X/Twitter
 * Optimized for geopolitics: maximizes replies, clarity, and engagement
 * Now supports video integration from news sources
 */

// ============ TYPE DEFINITIONS ============

export type PostFormat = "BREAKING_SINGLE" | "MINI_THREAD" | "FULL_THREAD" | "COMMUNITY_Q" | "VIDEO_POST";
export type Language = "ES" | "EN";
export type RegionBucket = "US" | "LATAM" | "MIDDLE_EAST" | "EUROPE" | "CHINA_ASIA" | "GLOBAL_GEO" | "OTHER";

export interface MaestroInput {
  headline: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  region_bucket: RegionBucket;
  topic_tags: string[];
  entities: string[];
  assets?: string[]; // BTC, SPX, GOLD, etc.
  urgency?: "ÚLTIMA HORA" | "ANÁLISIS" | "SEGUIMIENTO";
  videoSource?: VideoSource; // Optional video to attach
}

export interface MaestroOutput {
  format: PostFormat;
  language: Language;
  tweets: string[];
  hashtags: string[];
  link: string;
  videoData?: {
    url: string;
    title: string;
    duration?: number;
  };
  notes_for_poster: {
    reply_prompt: string;
    why_this_format: string;
    country_emoji: string;
    suggested_community?: string;
  };
}

// ============ COUNTRY EMOJI MAPPING ============

const COUNTRY_EMOJI_MAP: Record<string, string> = {
  // Americas
  "united states": "🇺🇸",
  "usa": "🇺🇸",
  "us": "🇺🇸",
  "america": "🇺🇸",
  "canada": "🇨🇦",
  "mexico": "🇲🇽",
  "brazil": "🇧🇷",
  "argentina": "🇦🇷",
  "colombia": "🇨🇴",
  "venezuela": "🇻🇪",
  "chile": "🇨🇱",
  "peru": "🇵🇪",
  "cuba": "🇨🇺",
  
  // Europe
  "european union": "🇪🇺",
  "eu": "🇪🇺",
  "united kingdom": "🇬🇧",
  "uk": "🇬🇧",
  "france": "🇫🇷",
  "germany": "🇩🇪",
  "italy": "🇮🇹",
  "spain": "🇪🇸",
  "poland": "🇵🇱",
  "nato": "🪖",
  
  // Middle East
  "israel": "🇮🇱",
  "palestine": "🇵🇸",
  "iran": "🇮🇷",
  "saudi arabia": "🇸🇦",
  "uae": "🇦🇪",
  "turkey": "🇹🇷",
  "syria": "🇸🇾",
  "iraq": "🇮🇶",
  "yemen": "🇾🇪",
  "egypt": "🇪🇬",
  
  // Asia-Pacific
  "china": "🇨🇳",
  "russia": "🇷🇺",
  "india": "🇮🇳",
  "japan": "🇯🇵",
  "south korea": "🇰🇷",
  "korea": "🇰🇵",
  "taiwan": "🇹🇼",
  "thailand": "🇹🇭",
  "vietnam": "🇻🇳",
  "philippines": "🇵🇭",
  "indonesia": "🇮🇩",
  "pakistan": "🇵🇰",
  "bangladesh": "🇧🇩",
  
  // Africa
  "south africa": "🇿🇦",
  "kenya": "🇰🇪",
  "nigeria": "🇳🇬",
  "ethiopia": "🇪🇹",
  "uganda": "🇺🇬",
  
  // Default
  "global": "🌍",
  "international": "🌍",
  "geopolitics": "🌍",
};

// ============ UTILITY FUNCTIONS ============

function getCountryEmoji(entities: string[], region: RegionBucket): string {
  // Try to find emoji from entities
  for (const entity of entities) {
    const lower = entity.toLowerCase();
    for (const [country, emoji] of Object.entries(COUNTRY_EMOJI_MAP)) {
      if (lower.includes(country) || country.includes(lower)) {
        return emoji;
      }
    }
  }

  // Fallback by region
  const regionEmoji: Record<RegionBucket, string> = {
    US: "🇺🇸",
    LATAM: "🌎",
    MIDDLE_EAST: "🕌",
    EUROPE: "🇪🇺",
    CHINA_ASIA: "🏯",
    GLOBAL_GEO: "🌍",
    OTHER: "📍",
  };

  return regionEmoji[region] || "🌍";
}

function shouldDiscard(region: RegionBucket, topicTags: string[]): boolean {
  // Discard if OTHER region and no geopolitical relevance
  if (region === "OTHER") {
    const geoKeywords = [
      "sanctions",
      "nato",
      "trade",
      "energy",
      "security",
      "alliance",
      "war",
      "conflict",
      "election",
      "diplomacy",
      "tariff",
      "embargo",
    ];
    const hasGeo = topicTags.some((t) => geoKeywords.some((k) => t.toLowerCase().includes(k)));
    if (!hasGeo) return true;
  }
  return false;
}

function decideFormat(headline: string, topicTags: string[], hasVideo: boolean = false): PostFormat {
  // Video format if video is available
  if (hasVideo) {
    return "VIDEO_POST";
  }

  // Breaking news = single post
  if (headline.toLowerCase().includes("última hora") || headline.toLowerCase().includes("breaking")) {
    return "BREAKING_SINGLE";
  }

  // If has multiple angles (analysis, context, impact)
  if (headline.length > 100) {
    return "MINI_THREAD";
  }

  // Community-oriented if controversial or Q/A nature
  if (headline.toLowerCase().includes("?")) {
    return "COMMUNITY_Q";
  }

  // Default
  return "BREAKING_SINGLE";
}

function decideLanguage(headline: string, summary: string, entities: string[]): Language {
  // SPANISH-ONLY MODE: Always return ES
  // All posts are in Spanish for Hispanic geopolitical audience
  return "ES";
}

// ============ TWEET GENERATORS ============

function generateBreakingSingle(input: MaestroInput): string[] {
  const emoji = getCountryEmoji(input.entities, input.region_bucket);
  const lang = "ES"; // Spanish-only mode
  const mainActor = input.entities[0] || "Actores";
  
  // Professional news format inspired by uHN, Reuters, CNN
  let mainCopy = `${emoji} ${mainActor.toUpperCase()}: ${input.headline}`;
  
  // Add urgency indicator if breaking
  if (input.urgency === "ÚLTIMA HORA") {
    mainCopy = `⚠️ BREAKING | ${mainCopy}`;
  }
  
  // Add context line with key impact
  const impactLabel = input.topic_tags.includes("sanctions")
    ? "📍 Impacto: sanciones internacionales"
    : input.topic_tags.includes("energy")
      ? "📍 Impacto: suministro energético global"
      : input.topic_tags.includes("trade")
        ? "📍 Impacto: comercio global"
        : input.topic_tags.includes("security")
          ? "📍 Impacto: seguridad regional"
          : "📍 Impacto: alianzas geopolíticas";
  
  // Summary from the article
  const summaryLine = `\n📌 ${input.summary.slice(0, 150)}${input.summary.length > 150 ? "..." : ""}`;
  
  // Two scenarios for engagement
  const scenario1 = input.topic_tags.includes("sanctions") 
    ? "Escenario A: Represalias diplomáticas" 
    : "Escenario A: Negociación bilateral";
  
  const scenario2 = input.topic_tags.includes("sanctions")
    ? "Escenario B: Escalada comercial"
    : "Escenario B: Tensión creciente";
  
  const scenarios = `\n📊 ${scenario1} | ${scenario2}`;
  
  // Source and link
  const sourceLink = `\nFuente: ${input.source}\nLeer más: ${input.url}`;
  
  return [`${mainCopy}${summaryLine}${impactLabel}${scenarios}${sourceLink}`];
}

function generateMiniThread(input: MaestroInput): string[] {
  const emoji = getCountryEmoji(input.entities, input.region_bucket);
  const lang = "ES"; // Spanish-only mode

  const tweets: string[] = [];

  // Tweet 1: Hook - professional breaking news style
  const urgencyBadge = input.urgency === "ÚLTIMA HORA" ? "🚨 ÚLTIMA HORA | " : "📰 ";
  tweets.push(
    `${urgencyBadge}${emoji} ${input.headline}\n\n` +
    `5 puntos clave que debes saber sobre el impacto geopolítico`
  );

  // Tweet 2: Key facts
  tweets.push(
    `1️⃣ LOS HECHOS:\n` +
    `• Actor: ${input.entities[0] || "Desconocido"}\n` +
    `• Acción: ${input.topic_tags[0] || "evento significativo"}\n` +
    `• Región: ${input.region_bucket.replace(/_/g, " ")}`
  );

  // Tweet 3: Why it matters (impact analysis)
  const impactEmoji = input.topic_tags.includes("sanctions") ? "🚫"
    : input.topic_tags.includes("energy") ? "⚡"
    : input.topic_tags.includes("trade") ? "📦"
    : input.topic_tags.includes("security") ? "🛡️"
    : "📍";
  
  tweets.push(
    `${impactEmoji} POR QUÉ IMPORTA:\n` +
    `• Escala: ${input.entities.slice(1, 2).join(", ") || "Múltiples actores"} afectados\n` +
    `• Implicación: ${input.summary.slice(0, 120)}`
  );

  // Tweet 4: Two scenarios
  tweets.push(
    `📊 ESCENARIOS (48-72h):\n\n` +
    `🟢 Base (60%): Comunicados, negociación\n` +
    `🔴 Riesgo (40%): Represalias, escalada`
  );

  // Tweet 5: What to watch + call to action
  tweets.push(
    `👀 VIGILAR:\n` +
    `• Reacciones diplomáticas\n` +
    `• Movimiento de mercados\n` +
    `• Aliados tomando posición\n\n` +
    `Fuente: ${input.source}\n${input.url}`
  );

  return tweets;
}

function generateFullThread(input: MaestroInput): string[] {
  const emoji = getCountryEmoji(input.entities, input.region_bucket);
  const lang = "ES"; // Spanish-only mode

  const tweets: string[] = [];

  // Tweet 1: Hook
  tweets.push(
    `${emoji} THREAD: Por qué lo de ${input.entities[0] || "esto"} NO es local.\n\n` +
      `Afecta alianzas, energía y comercio globales. 7 tweets.`
  );

  // Tweet 2: What happened
  tweets.push(
    `QUÉ PASÓ (100% factual):\n\n` +
      `• ${input.headline}\n` +
      `• Fuente: ${input.source}, ${new Date(input.published_at).toLocaleDateString("es-ES")}`
  );

  // Tweet 3: Why it matters
  tweets.push(
    `POR QUÉ IMPORTA:\n\n` +
      `${
        input.topic_tags.includes("energy")
          ? "🔴 Energía: amenaza a suministro global"
          : ""
      }${input.topic_tags.includes("sanctions") ? "🚫 Sanciones: reacción en cadena previsible" : ""}${
        input.topic_tags.includes("trade") ? "📦 Comercio: reglas del juego cambian" : ""
      }${input.topic_tags.includes("security") ? "⚔️ Seguridad: reposicionamiento militar" : ""}`
  );

  // Tweet 4: Incentives
  tweets.push(
    `INCENTIVOS:\n\n` +
      `Actor A (${input.entities[0]}) quiere: ${input.topic_tags[0] || "leverage"}\n` +
      `Actor B (${input.entities[1] || "aliado"}) necesita: estabilidad`
  );

  // Tweet 5: Scenarios
  tweets.push(
    `ESCENARIOS:\n\n` +
      `🟢 Más probable (70%): negociación, acuerdo limitado\n` +
      `🔴 Menos probable (30%): escalada rápida`
  );

  // Tweet 6: Market impact (if assets)
  if (input.assets && input.assets.length > 0) {
    const assetLabels = [
      input.assets.includes("GOLD") ? "ORO: refugio ↑" : "",
      input.assets.includes("SPX") ? "SPX: volatilidad" : "",
      input.assets.includes("BTC") ? "BTC: especulación" : "",
    ]
      .filter((x) => x)
      .join(" | ");

    tweets.push(
      `MERCADO (NO es asesoría financiera):\n\n${assetLabels}\n\nCausalidad: riesgo geopolítico → demanda de refugio.`
    );
  } else {
    tweets.push(`VIGILAR:\n\n• Comunicados oficiales en 48h\n• Respuesta de aliados\n• Mercados repricing riesgo`);
  }

  // Tweet 7: What to watch + CTA
  tweets.push(
    `QUÉ VIGILAR:\n\n` +
      `1️⃣ Movimiento militar/comercial\n` +
      `2️⃣ Posicionamiento de terceros\n` +
      `3️⃣ Repricing de activos\n\n` +
      `¿Quieres seguimiento? Responde "SEGUIMIENTO" y te notificamos en 24h.\n\n` +
      `${input.url}`
  );

  return tweets;
}

function generateCommunityQ(input: MaestroInput): string[] {
  const emoji = getCountryEmoji(input.entities, input.region_bucket);
  const lang = "ES"; // Spanish-only mode

  const tweet =
    `${emoji} Lo de ${input.entities[0] || "esto"} NO es local: afecta ${input.entities.slice(1, 3).join(" y ") || "alianzas globales"}.\n\n` +
    `Dos caminos:\n\n` +
    `A) Escalada → sanciones y represalias\n` +
    `B) Status quo → acuerdo limitado\n\n` +
    `¿A o B? ¿Y por qué?`;

  return [tweet];
}

function generateVideoPost(input: MaestroInput): string[] {
  const emoji = getCountryEmoji(input.entities, input.region_bucket);
  const mainActor = input.entities[0] || "Noticia";
  
  // Professional video post format
  const urgencyBadge = input.urgency === "ÚLTIMA HORA" ? "🚨 " : "🎥 ";
  
  const mainTweet = 
    `${urgencyBadge}VÍDEO | ${emoji} ${mainActor}\n\n` +
    `${input.headline}\n\n` +
    `📍 ${input.source}\n` +
    `🔗 ${input.url}`;
  
  // Context tweet
  const contextTweet =
    `📌 CONTEXTO:\n\n` +
    `${input.summary.slice(0, 200)}${input.summary.length > 200 ? "..." : ""}\n\n` +
    `Impacto: ${input.topic_tags[0] || "evento geopolítico"} en ${input.region_bucket.replace(/_/g, " ")}`;
  
  return [mainTweet, contextTweet];
}

// ============ MAIN EXPORT ============

export function writeMaestroPost(input: MaestroInput): MaestroOutput | null {
  // Check if should discard
  if (shouldDiscard(input.region_bucket, input.topic_tags)) {
    console.log("[MAESTRO] Discarding: OTHER region + no geo relevance");
    return null;
  }

  const format = decideFormat(input.headline, input.topic_tags, !!input.videoSource);
  const language = "ES"; // Spanish-only
  const emoji = getCountryEmoji(input.entities, input.region_bucket);

  let tweets: string[] = [];
  let replyPrompt = "";

  switch (format) {
    case "BREAKING_SINGLE":
      tweets = generateBreakingSingle(input);
      replyPrompt = "¿Escenario: escalada o status quo?";
      break;

    case "MINI_THREAD":
      tweets = generateMiniThread(input);
      replyPrompt = "¿Cuál de los dos escenarios ves más probable?";
      break;

    case "FULL_THREAD":
      tweets = generateFullThread(input);
      replyPrompt = "¿Quieres seguimiento? Responde 'SEGUIMIENTO'";
      break;
    
    case "VIDEO_POST":
      tweets = generateVideoPost(input);
      replyPrompt = "¿Cuál es tu análisis del evento?";
      break;

    case "COMMUNITY_Q":
      tweets = generateCommunityQ(input);
      replyPrompt = "¿A o B y por qué?";
      break;
  }

  // Extract hashtags (max 2-3 for video posts)
  const hashtags: string[] = [];
  const maxTags = format === "VIDEO_POST" ? 3 : 2;
  if (input.topic_tags.length > 0) {
    const tag1 = input.topic_tags[0].charAt(0).toUpperCase() + input.topic_tags[0].slice(1);
    hashtags.push(`#${tag1}`);
    if (input.topic_tags.length > 1 && hashtags.length < maxTags) {
      const tag2 = input.entities[0]?.replace(/\s+/g, "") || input.topic_tags[1];
      hashtags.push(`#${tag2}`);
    }
    if (format === "VIDEO_POST" && hashtags.length < maxTags) {
      hashtags.push("#Video");
    }
  }

  const suggestedCommunity = input.region_bucket === "LATAM" ? "Geopolítica Latinoamericana" : "Geopolítica Global";

  const videoData = input.videoSource ? {
    url: input.videoSource.url,
    title: input.videoSource.title || "Video",
    duration: input.videoSource.duration,
  } : undefined;

  const whyFormat = format === "BREAKING_SINGLE" 
    ? "Single impact post for immediate engagement"
    : format === "MINI_THREAD"
      ? "Mini thread for context + two scenarios"
      : format === "FULL_THREAD"
        ? "Deep anchor thread for followers seeking analysis"
        : format === "VIDEO_POST"
          ? "Video post for maximum visual engagement"
          : "Community question for rapid reply generation";

  return {
    format,
    language,
    tweets,
    hashtags: hashtags.slice(0, maxTags),
    link: input.url,
    videoData,
    notes_for_poster: {
      reply_prompt: replyPrompt,
      why_this_format: whyFormat,
      country_emoji: emoji,
      suggested_community: suggestedCommunity,
    },
  };
}
