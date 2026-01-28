/**
 * News Picker: selects trending geopolitical stories
 * Scoring + filtering logic for autonomous story selection
 * HARD geopolitics filter + regional priority (USA/LATAM first)
 */

import Parser from "rss-parser";
import { isGeopoliticallyRelevant, hasLatAmMention, NEWS_SOURCES } from "./news_sources.js";
import { isAlreadyPosted } from "./db.js";
import * as fs from "fs";
import * as path from "path";

export type CandidateStory = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
  score: number;
  reasonPicked?: string;
};

// Persist recent picks to avoid repeating the same headline even if posted.json was cleared
const PICKER_STATE_FILE = path.join(process.cwd(), "out", "news_picker_state.json");

type PickerState = {
  recentTitles: string[];
};

// HARD GEOPOLITICS KEYWORDS (boost)
export const HARD_GEO_KEYWORDS = [
  // Geopolitical terms (Spanish)
  "sanciones",
  "embargo",
  "bloqueo",
  "elecciones",
  "golpe",
  "oposición",
  "ejército",
  "defensa",
  "misil",
  "drones",
  "naval",
  "otan",
  "pentágono",
  "kremlin",
  "casa blanca",
  "inteligencia",
  "espionaje",
  "ciberataque",
  "frontera",
  "migración",
  "tratado",
  "diplomacia",
  "reconocimiento",
  "petróleo",
  "guerra",
  "conflicto",
  "terrorismo",
  "nuclear",
  "armas",
  // Geopolitical terms (English)
  "state of emergency",
  "sanctions",
  "embargo",
  "blockade",
  "elections",
  "coup",
  "opposition",
  "army",
  "defense",
  "missile",
  "drones",
  "naval",
  "nato",
  "pentagon",
  "kremlin",
  "white house",
  "intelligence",
  "espionage",
  "cyberattack",
  "border",
  "migration",
  "treaty",
  "diplomacy",
  "oil",
  "war",
  "conflict",
  "terrorism",
  "nuclear",
  "weapons",
  "cia",
  // Countries (priority regions)
  "cuba",
  "venezuela",
  "méxico",
  "mexico",
  "argentina",
  "brasil",
  "brazil",
  "colombia",
  "iran",
  "irán",
  "israel",
  "palestina",
  "gaza",
  "rusia",
  "russia",
  "ucrania",
  "ukraine",
  "china",
  "taiwan",
  "corea del norte",
  "north korea",
  // Key political figures
  "trump",
  "biden",
  "maduro",
  "milei",
  "sheinbaum",
  "lula",
  "bukele",
  "petro",
  "putin",
  "zelensky",
  "xi jinping",
  "netanyahu",
  "díaz-canel",
  "diaz-canel",
  "maría corina",
  "maria corina",
  "marco rubio",
];

// WHITELIST: Phrases that indicate legitimate political/diplomatic context
// If these appear WITH culture/sports keywords, reduce penalty
const GEOPOLITICAL_CONTEXT_PHRASES = [
  "sanciones",
  "sanctions",
  "diplomacia",
  "diplomacy",
  "embajador",
  "ambassador",
  "ministro",
  "minister",
  "canciller",
  "chancellor",
  "tratado",
  "treaty",
  "acuerdo oficial",
  "official agreement",
  "política exterior",
  "foreign policy",
  "relaciones internacionales",
  "international relations",
  "gobierno",
  "government",
  "estado",
  "state",
  "propaganda",
  "censura",
  "censorship",
  "exilio político",
  "political exile",
  "disidente",
  "dissident",
];

// SOFT/NON-GEO KEYWORDS (penalize heavily)
// HARD-BAN: cultura, deportes, entretenimiento sin nexo político explícito
const SOFT_NON_GEO_KEYWORDS = [
  // Cultura / Entretenimiento
  "farándula",
  "celebrity",
  "entretenimiento",
  "entertainment",
  "lifestyle",
  "fashion",
  "dieta",
  "diet",
  "cultura",
  "música",
  "music",
  "cine",
  "film",
  "película",
  "movie",
  "actor",
  "actriz",
  "actress",
  "cantante",
  "singer",
  "artista",
  "artist",
  "concierto",
  "concert",
  "festival",
  "gala",
  "premios",
  "awards",
  "alfombra roja",
  "red carpet",
  "estreno",
  "premiere",
  // Deportes
  "deportes",
  "sports",
  "fútbol",
  "football",
  "soccer",
  "baloncesto",
  "basketball",
  "béisbol",
  "baseball",
  "campeonato",
  "championship",
  "liga",
  "league",
  "mundial",
  "world cup",
  "olimpiadas",
  "olympics",
  "jugador",
  "player",
  "equipo",
  "team",
  "partido",
  "match",
  "gol",
  "goal",
  "medalla",
  "medal",
  "trofeo",
  "trophy",
  "victoria deportiva",
  "sports victory",
  // Entretenimiento específico
  "reality show",
  "novela",
  "soap opera",
  "serie",
  "series",
  "netflix",
  "streaming",
  "youtuber",
  "influencer",
  "tiktoker",
  "viral video",
  "meme",
  // Cultura específica
  "exposición",
  "exhibition",
  "galería",
  "gallery",
  "teatro",
  "theater",
  "danza",
  "dance",
  "ballet",
  "ópera",
  "opera",
  "concierto",
  "tour musical",
  "music tour",
  "disco",
  "album",
  "single",
  "hit musical",
  // Otros
  "clima",
  "weather",
  "accidente",
  "accident",
  "tráfico",
  "traffic",
  "turismo",
  "tourism",
  "hotel",
  "restaurant",
  "gastronomía",
  "gastronomy",
];

// REGION PRIORITY: USA + LATAM (Caribbean included) first
const REGION_PRIORITY: Record<string, number> = {
  "united states": 50,
  "usa": 50,
  "us": 50,
  "florida": 48, // US-LATAM border
  "cuba": 48,
  "venezuela": 45,
  "mexico": 43,
  "colombia": 40,
  "brasil": 38,
  "argentina": 35,
  "chile": 33,
  "perú": 30,
  "caribbean": 42,
  "caribe": 42,
  "nato": 20,
  "europa": 15,
  "europe": 15,
  "rusia": 20,
  "russia": 20,
  "china": 18,
  "irán": 20,
  "iran": 20,
};

function scoreHardGeopolitics(title: string, snippet: string): number {
  const combined = `${title} ${snippet}`.toLowerCase();

  let score = 0;

  // Count HARD GEO keywords
  const hardMatches = HARD_GEO_KEYWORDS.filter((kw) => combined.includes(kw)).length;
  score += hardMatches * 10;

  // Count SOFT/NON-GEO keywords
  const softMatches = SOFT_NON_GEO_KEYWORDS.filter((kw) => combined.includes(kw)).length;
  
  // Check for geopolitical context (whitelist)
  const hasGeoContext = GEOPOLITICAL_CONTEXT_PHRASES.some((phrase) => combined.includes(phrase));
  
  if (softMatches > 0) {
    if (hasGeoContext && hardMatches > 0) {
      // Has culture/sports BUT also has legitimate political context
      // Reduce penalty (not eliminate it, still prefer pure geopolitics)
      score -= softMatches * 15;
    } else {
      // Culture/sports WITHOUT political context = heavy penalty
      score -= softMatches * 40; // Increased from 30 to 40 for even stronger filtering
    }
  }

  return Math.max(0, score);
}

function scoreRegionalPriority(title: string, snippet: string, source: string): number {
  const combined = `${title} ${snippet} ${source}`.toLowerCase();

  let maxScore = 0;
  for (const [region, points] of Object.entries(REGION_PRIORITY)) {
    if (combined.includes(region)) {
      maxScore = Math.max(maxScore, points);
    }
  }

  // Default: low score for non-priority regions
  return maxScore || 5;
}

function loadPickerState(): PickerState {
  try {
    if (fs.existsSync(PICKER_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(PICKER_STATE_FILE, "utf-8"));
    }
  } catch (e) {
    console.warn(`⚠️  Failed to read picker state: ${(e as Error).message}`);
  }
  return { recentTitles: [] };
}

function savePickerState(state: PickerState) {
  try {
    const dir = path.dirname(PICKER_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Keep last 40 headlines
    state.recentTitles = state.recentTitles.slice(0, 40);
    fs.writeFileSync(PICKER_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn(`⚠️  Failed to write picker state: ${(e as Error).message}`);
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (GeopolitikBot/1.0; +https://geopolitik.com)"
  },
  customFields: {
    item: [["content:encoded", "fullContent"]]
  }
});

/**
 * Fetch all feeds and return raw candidates
 */
export async function fetchCandidates(): Promise<CandidateStory[]> {
  const candidates: CandidateStory[] = [];
  const debug = (process.env.NEWS_DEBUG ?? "0") === "1";

  for (const source of NEWS_SOURCES) {
    try {
      if (debug) console.log(`  📡 Fetching ${source.name}...`);
      const feed = await parser.parseURL(source.url);

      for (const item of feed.items ?? []) {
        const url = (item.link || "").trim();
        const title = (item.title || "").trim();
        const snippet = (item.contentSnippet || item.content || "").toString().slice(0, 600);
        const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();

        if (!url || !title) continue;

        // Check if already posted
        if (isAlreadyPosted(url)) {
          if (debug) console.log(`     ⏭️  Already posted: ${title.slice(0, 50)}`);
          continue;
        }

        // Check if geopolitically relevant
        if (!isGeopoliticallyRelevant(title, snippet)) {
          if (debug) console.log(`     ❌ Not geopolitical: ${title.slice(0, 50)}`);
          continue;
        }

        candidates.push({
          title,
          url,
          source: source.name,
          publishedAt,
          snippet,
          score: 0,
          reasonPicked: undefined
        });
      }

      if (debug) console.log(`  ✓ ${source.name}: ${feed.items?.length ?? 0} items (filtered)`);
    } catch (e: any) {
      if (debug) console.log(`  ✗ ${source.name}: ${e?.message ?? String(e)}`);
    }
  }

  return candidates;
}

/**
 * Score a candidate story
 * Factors: recency, LatAm boost, keywords, source reliability
 */
function scoreStory(story: CandidateStory, nowMs: number): number {
  let score = 0;
  const text = `${story.title} ${story.snippet}`.toLowerCase();

  // Geopolitical priority boost - BALANCED across regions
  // Tier 1: Core focus countries (+25)
  const tier1Countries = ["cuba", "venezuela", "eeuu", "usa", "estados unidos", "rusia", "russia", "ucrania", "ukraine"];
  if (tier1Countries.some(kw => text.includes(kw))) {
    score += 25;
  }
  // Tier 2: Latin America (+20)
  const tier2Countries = ["brasil", "brazil", "argentina", "colombia", "méxico", "mexico", "chile", "perú", "peru"];
  if (tier2Countries.some(kw => text.includes(kw))) {
    score += 20;
  }
  // Tier 3: Global powers & Middle East (+18)
  const tier3Countries = ["china", "irán", "iran", "israel", "gaza", "palestina", "siria", "syria", "francia", "france", "españa", "spain", "alemania", "germany"];
  if (tier3Countries.some(kw => text.includes(kw))) {
    score += 18;
  }

  // 1. Recency: newer = higher score, OLD NEWS PENALTY
  try {
    const pubMs = new Date(story.publishedAt).getTime();
    const ageHours = (nowMs - pubMs) / (1000 * 60 * 60);
    
    if (ageHours < 2) score += 50;      // Very fresh: big boost
    else if (ageHours < 4) score += 40; // Fresh
    else if (ageHours < 8) score += 25; // Recent
    else if (ageHours < 12) score += 10;
    else if (ageHours < 24) score -= 10; // Starting to get old
    else score -= 30; // OLD NEWS PENALTY
  } catch {
    score += 10;
  }

  // 2. LatAm presence: strong boost (max +40)
  if (hasLatAmMention(text)) {
    score += 40;
  }

  // 3. Hard Geopolitics scoring (replaces old conflict keywords, +100 max)
  const geoScore = scoreHardGeopolitics(story.title, story.snippet);
  score += geoScore;

  // 4. Regional Priority bonus (USA/LATAM +30, NATO +15, etc)
  const regionScore = scoreRegionalPriority(story.title, story.snippet, story.source);
  score += regionScore;

  // 5. Source reliability boost (max +5)
  const highReliabilitySources = [
    "BBC", "Reuters", "AFP", "AP", "DW", "France 24", "Guardian", "Al Jazeera"
  ];
  if (highReliabilitySources.some(name => story.source.includes(name))) {
    score += 5;
  }

  // 6. LatAm-focused sources bonus (helps Cuba/Venezuela stories surface)
  const latamPrioritySources = ["OnCubaNews", "Havana Times", "Radio Habana", "BBC Mundo", "France 24 Español", "El País América", "RFI Español"];
  if (latamPrioritySources.some(name => story.source.includes(name))) {
    score += 8;
  }

  // 7. Soft penalty for repeat China headlines to diversify
  if (text.includes("china") && text.includes("general")) {
    score -= 8;
  }

  return score;
}

/**
 * Pick the top story(ies) from candidates
 * @param count number of stories to pick (default 1)
 */
export async function pickTopStories(count = 1): Promise<CandidateStory[]> {
  const now = Date.now();
  const candidates = await fetchCandidates();
  const state = loadPickerState();
  const seen = new Set<string>(state.recentTitles || []);

  if (candidates.length === 0) {
    return [];
  }

  // Filter out old news (>24 hours) completely
  const freshCandidates = candidates.filter(c => {
    try {
      const pubMs = new Date(c.publishedAt).getTime();
      const ageHours = (now - pubMs) / (1000 * 60 * 60);
      return ageHours < 24; // Only news from last 24 hours
    } catch {
      return true; // Keep if can't parse date
    }
  });

  console.log(`📰 Candidates: ${candidates.length} total, ${freshCandidates.length} fresh (<24h)`);

  // Score all fresh candidates
  freshCandidates.forEach(c => {
    c.score = scoreStory(c, now);
  });

  // Sort by score descending
  freshCandidates.sort((a, b) => b.score - a.score);

  const picked: CandidateStory[] = [];

  // NO MORE BUCKETS - Just pick top scored stories (already balanced by country tiers)
  for (const story of freshCandidates) {
    const norm = normalizeTitle(story.title);
    if (seen.has(norm)) continue; // avoid repeating headlines even if posted.json was cleared
    picked.push({
      ...story,
      reasonPicked: `score=${story.score.toFixed(1)} | ${story.source}`
    });
    seen.add(norm);
    if (picked.length >= count) break;
  }

  // Persist updated state
  state.recentTitles = Array.from(seen);
  savePickerState(state);

  return picked;
}

/**
 * Pick ONE top story (convenience wrapper)
 */
export async function pickTopStory(): Promise<CandidateStory | null> {
  const top = await pickTopStories(1);
  return top.length > 0 ? top[0] : null;
}

/**
 * Detect urgency level from story content
 */
export function detectUrgencyTag(title: string, snippet: string): "ÚLTIMA HORA" | "CLAVE" | "EN DESARROLLO" {
  const text = `${title} ${snippet}`.toLowerCase();

  // ÚLTIMA HORA: breaking news, active crisis
  const breakingKeywords = ["última hora", "breaking", "urgent", "live", "now", "just"];
  if (breakingKeywords.some(kw => text.includes(kw))) {
    return "ÚLTIMA HORA";
  }

  // EN DESARROLLO: single source, tentative
  // (determined by source count, we'll assume single = EN DESARROLLO)

  // CLAVE: important but not breaking
  return "CLAVE";
}
