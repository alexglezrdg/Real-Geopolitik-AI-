/**
 * Editorial Curator - Real Geopolitik
 *
 * Selects and prioritizes news from RSS feeds with focus on:
 * - 75% Geopolitical news (AMERICAS + MIDDLE_EAST focus)
 * - 25% Trending/general news
 *
 * Scoring: deterministic (no LLM), region-aware, deduplication
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { isAlreadyPosted } from "./db.js";

// ============ TYPES ============
export type FeedItem = {
  source: string;
  title: string;
  link: string;
  isoDate?: string;
  snippet?: string;
};

export type CuratedItem = FeedItem & {
  score: number;
  bucket: "geopolitics" | "other";
  region: "US" | "LATAM" | "CARIBBEAN" | "MIDDLE_EAST" | "GLOBAL" | "OTHER";
  tags: string[];
  reasons: string[];
  topicTier?: 1 | 2 | 3; // ← NEW: Track tier for diversification
};

export type CurationResult = {
  picked: CuratedItem;
  ranked: CuratedItem[];
  stats: {
    geoRatio: number;
    targetGeoRatio: number;
    bucketsCount: { geopolitics: number; other: number };
  };
};

// ============ STATE FILE ============
const STATE_FILE = path.join(process.cwd(), "out", "curator_state.json");

interface CuratorState {
  recentTitles: string[];
  recentLinks: string[];
  recentRegions: string[];
  recentEventFingerprints: string[];
  lastTopic?: number; // ← NEW: Track last topic tier (1/2/3)
  lastRegion?: string; // ← NEW: Track last region for diversity
  lastUpdated: string;
}

function getStateFile(): CuratorState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    // Ignore errors, start fresh
  }
  return {
    recentTitles: [],
    recentLinks: [],
    recentRegions: [],
    recentEventFingerprints: [],
    lastTopic: undefined,
    lastRegion: undefined,
    lastUpdated: new Date().toISOString()
  };
}

function updateStateFile(state: CuratorState) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn(`⚠️  Failed to update curator state: ${(e as Error).message}`);
  }
}

// ============ NORMALIZATION ============
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, " ") // alphanumeric + space
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Extract event fingerprint: (actors + keywords + date bucket)
 * Detects same event across multiple sources with different headlines
 * Example: "Israel recovers bodies" vs "Israel retrieves remains" → same fingerprint
 * 
 * AGGRESSIVE dedup: 24-hour window to catch repeat postings
 */
function getEventFingerprint(title: string, region: string): string {
  const text = normalizeTitle(title);
  const words = text.split(" ").filter(w => w.length > 2);
  
  // Extract key entities/actors (more words for better matching)
  const entities = words.slice(0, 8).join("|");
  
  // Date bucket (DAY-level for 24h dedup window)
  const now = new Date();
  const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  
  // Combine: region + entities + day bucket
  const combined = `${region}::${entities}::${dateKey}`;
  const fingerprint = crypto.createHash("sha1").update(combined).digest("hex").slice(0, 12);
  
  return fingerprint;
}

/**
 * Classify topic tier for prioritization
 * TIER 1 (hard geopolitics): NATO, sanciones, energía, aranceles, defensa
 * TIER 2 (regional): conflictos locales, elecciones con impacto
 * TIER 3 (soft): cultura, clima, crimen no estatal
 */
function classifyTopicTier(text: string): 1 | 2 | 3 {
  const lower = text.toLowerCase();
  
  // TIER 1: Hard geopolitics (strategic power + explicit actors)
  const tier1Keywords = [
    // Alliances & defense
    "nato", "otan", "secretary general", "europe needs", "deterrence", "article 5",
    "alliance", "transatlantic",
    
    // Trade & tariffs
    "tariff", "trade war", "sanctions", "export controls", "secondary wave",
    "aranceles", "embargo", "sanciones",
    
    // Energy & resources
    "energía", "petróleo", "gas", "lng", "opec", "oil shock", "pipeline",
    "strategic reserves", "energy security",
    
    // Explicit actors (Tier 1 always)
    "delcy", "pdvsa", "venezuela", "maduro", "caracas",
    "trump", "tariff", "canada", "china", "deal",
    "europe", "eu", "ucrania", "ukraine", "russia", "putin",
    "iran", "israel", "hamas", "hezbollah",
    
    // Strategic events
    "defensa", "militar", "armamento", "inteligencia", "espía",
    "ruta comercial", "mar rojo", "estrecho", "bloqueo", "blockade",
    "escalation", "crisis", "alert"
  ];
  
  for (const kw of tier1Keywords) {
    if (lower.includes(kw)) {
      return 1;
    }
  }
  
  // TIER 3: Soft news (NOT geopolitics even if tagged)
  const tier3Keywords = [
    "cultura", "música", "cine", "film", "actor", "actress",
    "clima local", "meteorología", "weather",
    "crimen", "asesino", "robo", "murder",
    "deporte", "fútbol", "soccer", "football", "goal",
    "tecnología", "app", "aplicación", "startup",
    "celebrity", "influencer", "viral", "meme"
  ];
  
  for (const kw of tier3Keywords) {
    if (lower.includes(kw)) {
      return 3;
    }
  }
  
  // Default: TIER 2
  return 2;
}

// ============ CLASSIFICATION ============
const GEO_KEYWORDS_US = [
  "trump",
  "biden",
  "white house",
  "pentagon",
  "state department",
  "congress",
  "sanctions",
  "tariff",
  "border",
  "ice",
  "fbi",
  "nato"
];

const GEO_KEYWORDS_LATAM = [
  "venezuela",
  "maduro",
  "cuba",
  "la habana",
  "caracas",
  "nicaragua",
  "ortega",
  "mexico",
  "bukele",
  "haiti",
  "caricom",
  "oea",
  "colombia",
  "brasil",
  "argentina",
  "peru",
  "chile",
  "panama",
  "oas"
];

const GEO_KEYWORDS_MIDEAST = [
  "iran",
  "tehran",
  "israel",
  "gaza",
  "hamas",
  "hezbollah",
  "syria",
  "iraq",
  "yemen",
  "houthis",
  "saudi",
  "qatar",
  "uae",
  "nuclear",
  "protest",
  "lebanon"
];

const GEO_KEYWORDS_GLOBAL = [
  "kremlin",
  "russia",
  "ukraine",
  "china",
  "taiwan",
  "embargo",
  "blockade",
  "coup",
  "election interference",
  "missile",
  "drone",
  "carrier",
  "naval",
  "peace talks",
  "summit",
  "diplomacy",
  "war",
  "conflict",
  "treaty"
];

const URGENT_KEYWORDS = [
  "última hora",
  "breaking",
  "clave",
  "urgente",
  "alerta",
  "en directo",
  "just in",
  "breaking news"
];

const CONFLICT_KEYWORDS = [
  "sanctions",
  "blockade",
  "navy",
  "war",
  "missile",
  "nuclear",
  "border",
  "protest",
  "crackdown",
  "coup",
  "treaty",
  "attack",
  "strike",
  "conflict",
  "diplomacy"
];

const REPUTABLE_SOURCES = new Set([
  "reuters",
  "ap",
  "bbc",
  "dw",
  "france24",
  "aljazeera",
  "politico",
  "ft",
  "economist",
  "wsj",
  "nyt",
  "elpais",
  "infobae",
  "bbc world",
  "the guardian",
  "npr"
]);

const CLICKBAIT_KEYWORDS = [
  "video",
  "mira",
  "viral",
  "influencer",
  "celebrity",
  "actor",
  "actress",
  "singer",
  "meme",
  "crypto",
  "bitcoin",
  "nft",
  "horoscope",
  "recipe",
  "sport",
  "football",
  "soccer"
];

/**
 * OUTDATED PATTERNS: Rehash of old news, actors not in power, or cyclic complaints
 * Example: "Maduro rejects US interference" (Jan 2016 pattern, still happening but ACTOR NO LONGER IN POWER Jan 2026)
 * Rule: If headline matches these patterns WITHOUT new development context → penalize heavily
 */
const OUTDATED_PATTERNS = [
  // Venezuela: Maduro in power (OUTDATED - he was captured in Jan 2026)
  { pattern: /maduro\s+(rechaza|rejects|condena|condemns|niega|denies).{0,30}(washington|eeuu|estados unidos|interferencia|interference)/i, 
    reason: "Maduro rehash (actor no longer in power Jan 2026)" },
  
  // Generic Maduro resistance rhetoric (OUTDATED)
  { pattern: /venezuela.*maduro.{0,40}(resistencia|resistance|rechaza|rejects|soberanía|sovereignty)/i,
    reason: "Maduro resistance pattern (outdated Jan 2026)" },
  
  // Old Israel-Hamas cyclical updates (only accept if NEW development like negotiations)
  { pattern: /israel.*hamas.{0,30}(intercambio|exchange|tregua|truce).{0,30}?(civiles|civilians|rehenes|hostages)$/i,
    skip: false, // This is VALID if about negotiations/truce
    reason: "Israel-Hamas routine (check if NEW development)" },
  
  // Russia general statements (without military action or new development)
  { pattern: /rusia\s+(advierte|warns|amenaza|threatens|condena|condemns).{0,40}(occidente|west|otan|nato)(?!.{0,50}(new|nuevo|attack|ataque|strike|golpe))/i,
    reason: "Russia generic warning (no new development)" },
  
  // Generic US tariff rhetoric (only accept if SPECIFIC new announcement)
  { pattern: /trump\s+(amenaza|threatens|promete|promises).{0,40}arancel(?!.{0,100}(nuevo|new|acuerdo|deal|anunciado|announced))/i,
    reason: "Trump tariff generic threat (no specific new deal)" },
  
  // Iran generic nuclear warnings (only accept if AIEA or specific new advance)
  { pattern: /irán.*nuclear.{0,30}(advertencia|warning|amenaza|threat)(?!.{0,100}(aiea|enriquecimiento|enrichment|porcentaje|percent))/i,
    reason: "Iran nuclear generic warning (no specific AIEA data)" }
];

function classifyBucket(text: string): "geopolitics" | "other" {
  const lower = text.toLowerCase();

  // Negative: obvious non-geo content
  for (const kw of CLICKBAIT_KEYWORDS) {
    if (lower.includes(kw)) {
      return "other";
    }
  }

  // Positive: geopolitical keywords
  const allGeoKeywords = [
    ...GEO_KEYWORDS_US,
    ...GEO_KEYWORDS_LATAM,
    ...GEO_KEYWORDS_MIDEAST,
    ...GEO_KEYWORDS_GLOBAL
  ];

  for (const kw of allGeoKeywords) {
    if (lower.includes(kw)) {
      return "geopolitics";
    }
  }

  return "other";
}

function classifyRegion(text: string): "US" | "LATAM" | "CARIBBEAN" | "MIDDLE_EAST" | "GLOBAL" | "OTHER" {
  const lower = text.toLowerCase();

  for (const kw of GEO_KEYWORDS_US) {
    if (lower.includes(kw)) {
      return "US";
    }
  }

  // Caribbean keywords
  if (
    lower.includes("cuba") ||
    lower.includes("haiti") ||
    lower.includes("caricom") ||
    lower.includes("caribbean")
  ) {
    return "CARIBBEAN";
  }

  for (const kw of GEO_KEYWORDS_LATAM) {
    if (lower.includes(kw)) {
      return "LATAM";
    }
  }

  for (const kw of GEO_KEYWORDS_MIDEAST) {
    if (lower.includes(kw)) {
      return "MIDDLE_EAST";
    }
  }

  // Global (if mentions China/Russia/EU affecting Americas or ME)
  if (
    (lower.includes("china") || lower.includes("russia") || lower.includes("europe")) &&
    (lower.includes("america") || lower.includes("americas") || lower.includes("middle east"))
  ) {
    return "GLOBAL";
  }

  return "OTHER";
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();

  // Region tags
  if (lower.includes("cuba") || lower.includes("havana")) tags.push("Cuba");
  if (lower.includes("venezuela")) tags.push("Venezuela");
  if (lower.includes("iran") || lower.includes("tehran")) tags.push("Iran");
  if (lower.includes("israel")) tags.push("Israel");
  if (lower.includes("gaza")) tags.push("Gaza");
  if (lower.includes("ukraine")) tags.push("Ukraine");
  if (lower.includes("russia")) tags.push("Russia");
  if (lower.includes("china")) tags.push("China");
  if (lower.includes("united states") || lower.includes("usa") || lower.includes("america")) tags.push("USA");
  if (lower.includes("mexico")) tags.push("Mexico");
  if (lower.includes("trump")) tags.push("Trump");
  if (lower.includes("biden")) tags.push("Biden");

  return tags;
}

// ============ SCORING ============
function scoreCandidate(item: FeedItem, state: CuratorState): CuratedItem {
  const text = `${item.title} ${item.snippet || ""}`;
  const lower = text.toLowerCase(); // ← MOVED UP: Define aquí antes de usar
  let score = 0;
  const reasons: string[] = [];

  // 1. Bucket classification
  const bucket = classifyBucket(text);
  const region = classifyRegion(text);
  const tags = extractTags(text);
  const topicTier = classifyTopicTier(text); // ← NEW: Topic tier

  if (bucket === "geopolitics") {
    score += 45;
    reasons.push("Geopolitical content");
  }

  // 1a. NEW: Check for OUTDATED PATTERNS (rehash/actor no longer in power)
  for (const outdatedCheck of OUTDATED_PATTERNS) {
    if (outdatedCheck.pattern.test(text)) {
      // Penalize heavily if matches outdated pattern
      score -= 35;
      reasons.push(`❌ ${outdatedCheck.reason}`);
      break; // Stop on first match
    }
  }

  // 1b. TOPIC GATE: Boost hard geopolitics (TIER 1 = strategic power)
  if (topicTier === 1) {
    score += 40; // MASSIVELY INCREASED: TIER 1 hard geopolitics ONLY
    reasons.push("🚨 TIER 1: Hard geopolitics (strategic)");
  } else if (topicTier === 3) {
    score -= 40; // MASSIVELY PENALIZE soft news
    reasons.push("⊘ TIER 3: Soft news (BANNED)");
  }
  // TIER 2 = no penalty (acceptable geopolitics)

  // 1c. NEW: Diversification penalty (don't repeat same topic/region)
  if (state.lastTopic === topicTier) {
    score -= 12; // Penalty for repeating same tier
    reasons.push(`Repeat topic tier (${topicTier})`);
  }
  if (state.lastRegion === region) {
    score -= 8; // Penalty for repeating same region
    reasons.push(`Repeat region (${region})`);
  }

  // 2. Region scoring
  if (
    region === "US" ||
    region === "LATAM" ||
    region === "CARIBBEAN" ||
    region === "MIDDLE_EAST"
  ) {
    score += 20;
    reasons.push(`Target region: ${region}`);
  }

  // 2a. HARDCORE GEOPOLITICS BOOST: Cuba, Venezuela, Irán, China, EEUU pressure
  const hardcoreKeywords = [
    "cuba", "venezuela", "maduro", "caracas", "la habana",
    "iran", "tehran", "nuclear", "sanctions iran",
    "china taiwan", "china eeuu", "china us", "xi jinping",
    "trump tariff", "trump sanctions", "trump pressure",
    "pemex cuba", "petróleo venezuela", "energy embargo",
    "caribbean us", "caribe eeuu", "naval blockade",
    "bloqueo naval", "sanciones", "embargo"
  ];
  
  for (const kw of hardcoreKeywords) {
    if (lower.includes(kw)) {
      score += 35; // MASSIVE boost for hardcore actors
      reasons.push(`💥 HARDCORE GEOPOLITICS: ${kw}`);
      break;
    }
  }

  // 3. Conflict/diplomacy keywords
  for (const kw of CONFLICT_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 10;
      reasons.push(`Conflict/diplomacy: ${kw}`);
      break;
    }
  }

  // 4. Urgency keywords
  for (const kw of URGENT_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 8;
      reasons.push(`Urgent: ${kw}`);
      break;
    }
  }

  // 5. Reputable source
  const domain = getDomain(item.link);
  const sourceNameLower = (item.source || "").toLowerCase();
  for (const repSource of REPUTABLE_SOURCES) {
    if (sourceNameLower.includes(repSource) || domain.includes(repSource)) {
      score += 6;
      reasons.push(`Reputable source: ${item.source}`);
      break;
    }
  }

  // 6. Recency (within 24h = +2, otherwise 0)
  if (item.isoDate) {
    const itemDate = new Date(item.isoDate).getTime();
    const now = Date.now();
    const hoursOld = (now - itemDate) / (1000 * 60 * 60);
    if (hoursOld <= 24) {
      score += 2;
      reasons.push(`Recent (${Math.floor(hoursOld)}h old)`);
    }
  }

  // PENALTIES
  // NON-GEOPOLITICS HARD PENALTY: immigration domestic, crime domestic, Portugal narco
  const nonGeoPenaltyKeywords = [
    "minneapolis", "immigration chief", "ice crackdown domestic",
    "portugal cocaine", "narco-sub portugal", "portuguese police cocaine",
    "local crime murder", "robbery domestic", "theft",
    "celebrity gossip", "k-pop concert", "festival music"
  ];
  
  for (const kw of nonGeoPenaltyKeywords) {
    if (lower.includes(kw)) {
      score -= 40; // Strong penalty to force skip
      reasons.push(`❌ NON-GEOPOLITICS: ${kw}`);
      break;
    }
  }
  
  // Clickbait/rubbish
  for (const kw of CLICKBAIT_KEYWORDS) {
    if (lower.includes(kw)) {
      score -= 30;
      reasons.push(`Clickbait: ${kw}`);
      break;
    }
  }

  // Already posted (exact title)
  const normTitle = normalizeTitle(item.title);
  if (state.recentTitles.some((t) => normalizeTitle(t) === normTitle)) {
    score -= 50;
    reasons.push("Duplicate title");
  }

  // NEW: Same event fingerprint (same story from different source)
  const eventFP = getEventFingerprint(item.title, region);
  if (state.recentEventFingerprints.some((fp) => fp === eventFP)) {
    score -= 45; // Strong penalty for duplicate event (even if title differs)
    reasons.push(`Duplicate event: ${eventFP.split("|")[1]}`);
  }

  // Same domain recently posted
  if (state.recentLinks.some((link) => getDomain(link) === domain)) {
    score -= 12;
    reasons.push("Domain recently posted");
  }

  // Diversity: if last 2 posts were same region, penalize that region
  if (
    state.recentRegions.length >= 2 &&
    state.recentRegions[0] === region &&
    state.recentRegions[1] === region
  ) {
    score -= 8;
    reasons.push("Region over-represented");
  }

  // Clickbait patterns
  if (lower.includes("mira") || lower.includes("viral")) {
    score -= 12;
    reasons.push("Likely clickbait");
  }

  // Floor at 0
  score = Math.max(0, score);

  return {
    ...item,
    score,
    bucket,
    region,
    tags,
    reasons,
    topicTier // ← NEW: Include tier in return
  };
}

// ============ MAIN CURATOR ============
export async function curateCandidates(
  items: FeedItem[],
  opts?: { k?: number; targetGeoRatio?: number; debug?: boolean }
): Promise<CurationResult> {
  const k = opts?.k ?? 1;
  const targetGeoRatio = opts?.targetGeoRatio ?? 0.75;
  const debug = opts?.debug ?? false;

  if (!items || items.length === 0) {
    throw new Error("No candidates provided");
  }

  const state = getStateFile();

  // Score all candidates
  const scored = items.map((item) => scoreCandidate(item, state));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  if (debug) {
    console.log(`\n[CURATOR DEBUG] Scored ${scored.length} candidates:`);
    scored.slice(0, 5).forEach((s, idx) => {
      console.log(
        `  ${idx + 1}. [${s.bucket}/${s.region}] ${s.score.toFixed(0)} | ${s.title.slice(0, 40)}...`
      );
    });
  }

  // Selection logic respecting geo ratio
  let selected = scored[0];

  // If top is "other" but there's a "geopolitics" in top3 with score >= top-10, prefer geo
  if (selected.bucket === "other" && targetGeoRatio > 0.5) {
    const geoCandidate = scored.find(
      (s) => s.bucket === "geopolitics" && s.score >= selected.score - 10
    );
    if (geoCandidate) {
      selected = geoCandidate;
      if (debug) {
        console.log(`  → Swapped to geopolitical candidate (score diff: ${selected.score - scored[0].score})`);
      }
    }
  }

  // If selected is "other" and score < 45, there's no good geopolitics available (fail-open)
  if (selected.bucket === "other" && selected.score < 45 && debug) {
    console.log(`  → Selected 'other' bucket (no strong geopolitics available, fail-open)`);
  }

  // Update state with selected
  state.recentTitles.unshift(selected.title);
  state.recentLinks.unshift(selected.link);
  state.recentRegions.unshift(selected.region);
  state.recentEventFingerprints.unshift(getEventFingerprint(selected.title, selected.region));
  state.lastTopic = selected.topicTier ?? 2; // ← NEW: Track topic tier
  state.lastRegion = selected.region; // ← NEW: Track region

  // Keep only last 10
  state.recentTitles = state.recentTitles.slice(0, 10);
  state.recentLinks = state.recentLinks.slice(0, 10);
  state.recentRegions = state.recentRegions.slice(0, 10);
  state.recentEventFingerprints = state.recentEventFingerprints.slice(0, 10);

  updateStateFile(state);

  // Compute stats
  const geoCount = scored.filter((s) => s.bucket === "geopolitics").length;
  const geoRatio = items.length > 0 ? geoCount / items.length : 0;

  return {
    picked: selected,
    ranked: scored.slice(0, Math.max(k, 1)),
    stats: {
      geoRatio,
      targetGeoRatio,
      bucketsCount: {
        geopolitics: geoCount,
        other: items.length - geoCount
      }
    }
  };
}

// ============ FORMATTING ============
export function formatCuratorLog(result: CurationResult, debug = false): string[] {
  const logs: string[] = [];

  const picked = result.picked;
  logs.push(
    `[CURATOR] ✅ picked score=${picked.score} bucket=${picked.bucket} region=${picked.region}`
  );
  logs.push(`[CURATOR] tags=[${picked.tags.join(",")}] title="${picked.title.slice(0, 50)}..."`);
  logs.push(`[CURATOR] source="${picked.source}" link="${picked.link.slice(0, 60)}..."`);
  logs.push(
    `[CURATOR] geo_ratio=${(result.stats.geoRatio * 100).toFixed(0)}% (target=${(result.stats.targetGeoRatio * 100).toFixed(0)}%)`
  );

  if (debug) {
    logs.push(`[CURATOR DEBUG] ${result.stats.bucketsCount.geopolitics} geo + ${result.stats.bucketsCount.other} other`);
    if (result.ranked.length > 1) {
      logs.push(
        `[CURATOR DEBUG] top3: ${result.ranked
          .slice(0, 3)
          .map((r) => `[${r.score}]${r.title.slice(0, 30)}`)
          .join(" | ")}`
      );
    }
  }

  return logs;
}
