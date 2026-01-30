/**
 * Persistent deduplication store (14d TTL)
 * - Canonical URL: resolve Google News RSS to final URL
 * - Strong fingerprint: normalize(title) + domain + normalize(summary_first_240)
 * - SimHash near-duplicate detection (Hamming <= 3)
 * - Persists in SQLite via shared db connection
 */

import crypto from "node:crypto";
import { db } from "./db.js";
import { canonicalizeUrl } from "./post_history.js";
import { normalizeUrl, resolveFinalUrlWithGoogleNews } from "./url_resolver.js";

const TTL_DAYS = Number(process.env.DEDUPE_TTL_DAYS || 14);
const NEAR_DUP_HAMMING = Number(process.env.DEDUPE_HAMMING || 3);
const MAX_SIG_ROWS = Number(process.env.DEDUPE_SIG_SCAN || 300);
const DEBUG = (process.env.DEDUPE_DEBUG ?? "0") === "1";

function init() {
  // Create table WITHOUT raw_url_hash first (for compatibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS dedupe_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_url TEXT,
      url_hash TEXT,
      fingerprint TEXT,
      signature TEXT,
      topic_hash TEXT,
      region TEXT,
      source TEXT,
      title TEXT,
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_dedupe_created_at ON dedupe_entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_dedupe_fp ON dedupe_entries(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_dedupe_url ON dedupe_entries(url_hash);
    CREATE INDEX IF NOT EXISTS idx_dedupe_canonical ON dedupe_entries(canonical_url);
    CREATE INDEX IF NOT EXISTS idx_dedupe_topic ON dedupe_entries(topic_hash);
  `);

  // Migration: add raw_url_hash column if missing (for existing DBs)
  try {
    db.exec(`ALTER TABLE dedupe_entries ADD COLUMN raw_url_hash TEXT`);
  } catch {
    // Column already exists, ignore
  }

  // Create index for raw_url_hash AFTER migration
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_dedupe_raw_url ON dedupe_entries(raw_url_hash)`);
  } catch {
    // Index might already exist, ignore
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS topic_cooldown (
      topic_hash TEXT PRIMARY KEY,
      posted_at TEXT,
      title TEXT,
      url TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_topic_cooldown_posted ON topic_cooldown(posted_at);
  `);
}
init();

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function utcDateBucket(d: Date = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract domain from URL for fingerprinting
 */
function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Build strong fingerprint: normalize(title) + domain + normalize(summary_first_240)
 * This captures "same story from different sources" better than just title
 */
function buildStrongFingerprint(params: {
  title: string;
  url: string;
  summary?: string;
  region?: string;
}): string {
  const domain = extractDomain(params.url);
  const normalized_title = normalizeText(params.title);
  const summary_snippet = (params.summary || "")
    .slice(0, 240)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const key = `${normalized_title}|${domain}|${summary_snippet}`;
  return sha1(key);
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((t) => t.length >= 3);
}

function topTokens(text: string, n = 10): string[] {
  const tokens = tokenize(text);
  return tokens.slice(0, n).sort();
}

function computeFingerprint(params: { title: string; region?: string }) {
  const region = (params.region || "GLOBAL").toUpperCase();
  const bucket = utcDateBucket();
  const key = `${bucket}|${region}|${topTokens(params.title, 12).join("|")}`;
  return sha1(key);
}

/**
 * LAYER 4: Topic Hash - Capture same story with rewritten title
 * 
 * Strategy:
 * 1. Normalize title (lowercase, remove accents, remove stopwords ES+EN)
 * 2. Keep top N tokens (sorted) + top M bigrams (sorted)
 * 3. Hash the sorted token/bigram list → topic_hash
 * 4. Dedup by topic_hash with 14d TTL
 * 
 * Examples (should all be DUP_TOPIC):
 * - "Kremlin warns of naval blockade on Cuba" 
 * - "Cuba suffers naval blockade from Kremlin"
 * - "Naval blockade: Kremlin tightens grip on Cuba"
 * → All extract: "bloqueo", "cuba", "kremlin", "naval" (sorted)
 */

const STOPWORDS_ES = new Set([
  "el", "la", "de", "que", "y", "a", "en", "un", "ser", "se", "no", "haber", "por", "con", "su", "para",
  "es", "está", "son", "están", "fue", "fueron", "sea", "sería", "podría", "puede", "pueda", "puedan",
  "muy", "más", "menos", "otro", "otro", "al", "del", "este", "esto", "ese", "eso", "aquel", "aquello",
  "lo", "los", "las", "nos", "os", "me", "te", "les", "le", "mi", "tu", "su", "nuestro", "vuestro",
  "como", "cuando", "donde", "porque", "pues", "sino", "si", "aunque", "luego", "después", "antes",
]);

const STOPWORDS_EN = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can", "shall", "it", "its", "that",
  "this", "these", "those", "i", "you", "he", "she", "we", "they", "him", "her", "us", "them",
  "my", "your", "his", "our", "their", "what", "which", "who", "where", "when", "why", "how",
]);

const STOPWORDS = new Set([...STOPWORDS_ES, ...STOPWORDS_EN]);

/**
 * Extract key geopolitical entities from title
 * Focuses on countries, regions, organizations that define the story
 */
function extractKeyEntities(title: string): string[] {
  const titleLower = title.toLowerCase();
  const entities: string[] = [];
  
  // Countries/regions (normalized names)
  const geoEntities = [
    "cuba", "habana", "havana",
    "venezuela", "caracas",
    "rusia", "russia", "kremlin", "moscu", "moscow",
    "eeuu", "usa", "estados unidos", "united states", "washington", "pentagon",
    "china", "beijing",
    "iran", "tehran",
    "mexico",
    "colombia",
    "brasil", "brazil",
    "argentina",
    "chile",
    "peru",
    "ukraine", "ucrania", "kiev",
    "israel", "palestine", "gaza",
    "syria", "siria",
    "nato", "otan",
    "caribe", "caribbean"
  ];
  
  for (const entity of geoEntities) {
    if (titleLower.includes(entity)) {
      // Normalize variations (russia/rusia → russia, eeuu/usa → usa, etc)
      if (entity.includes("rusia") || entity.includes("russia") || entity.includes("kremlin")) {
        if (!entities.includes("russia")) entities.push("russia");
      } else if (entity.includes("eeuu") || entity.includes("usa") || entity.includes("estados") || entity.includes("washington") || entity.includes("pentagon")) {
        if (!entities.includes("usa")) entities.push("usa");
      } else if (entity.includes("habana") || entity.includes("havana")) {
        if (!entities.includes("cuba")) entities.push("cuba");
      } else if (!entities.includes(entity)) {
        entities.push(entity);
      }
    }
  }
  
  // Key action verbs for geopolitics
  const actionVerbs = [
    "bloqueo", "blockade", "embargo",
    "sanciones", "sanctions",
    "ataque", "attack",
    "invasion", "invade",
    "guerra", "war",
    "golpe", "coup",
    "elecciones", "elections",
    "protesta", "protest",
    "crisis"
  ];
  
  for (const action of actionVerbs) {
    if (titleLower.includes(action)) {
      // Normalize (bloqueo/blockade → blockade)
      if (action.includes("bloqueo") || action.includes("blockade")) {
        if (!entities.includes("blockade")) entities.push("blockade");
      } else if (action.includes("sanciones") || action.includes("sanctions")) {
        if (!entities.includes("sanctions")) entities.push("sanctions");
      } else if (!entities.includes(action)) {
        entities.push(action);
      }
    }
  }
  
  return entities.sort(); // deterministic order
}

export function buildTopicHash(title: string): string {
  // Extract key entities (countries + actions)
  let entities = extractKeyEntities(title);
  
  // NORMALIZATION STRATEGY for better topic matching:
  // For Cuba/Russia/USA stories, the core topic is "Cuba + Russia/USA conflict"
  // Whether title says "Russia warns USA" or "USA warned by Russia", it's same topic
  // Solution: Always include primary countries (Cuba, Russia, etc) but make USA optional
  
  // Core geopolitical actors that define the story
  const coreActors = entities.filter(e => 
    !["usa", "washington", "pentagon"].includes(e) // exclude USA from core
  );
  
  // Include USA only if explicitly mentioned as action subject in first part of title
  const titleLower = title.toLowerCase();
  const usaIsExplicitActor = titleLower.match(/^(eeuu|usa|estados unidos)/);
  
  // Build topic signature: core actors + (USA if explicit)
  let topicEntities = coreActors;
  
  // For deduplication purposes, USA is often context, not core topic
  // Story is about Cuba/Russia, USA is often just mentioned as target
  // So we exclude USA unless it's the explicit subject
  
  // Sort for deterministic order
  const sortedEntities = topicEntities.sort();
  
  // Create hash from entities (minimum 2 required)
  if (sortedEntities.length >= 2) {
    return sha1(sortedEntities.join("|"));
  }
  
  // Fallback: not enough entities, use token-based approach
  const normalized = normalizeText(title);
  const tokens = normalized.split(" ").filter(t => t.length >= 4 && !STOPWORDS.has(t));
  const topTokens = tokens.slice(0, 8).sort();
  
  return sha1([...sortedEntities, ...topTokens].join("|"));
}

export function debugTopicHash(title: string): { hash: string; tokens: string[]; key: string } {
  const entities = extractKeyEntities(title);
  const normalized = normalizeText(title);
  const tokens = normalized.split(" ").filter(t => t.length >= 3 && !STOPWORDS.has(t));
  const topTokens_sorted = tokens.slice(0, 8).sort();
  
  const topicKey = entities.length >= 2 
    ? entities.join("|")
    : [...entities, ...topTokens_sorted.slice(0, 10)].join("|");
  
  const hash = sha1(topicKey);
  return { 
    hash, 
    tokens: entities.length >= 2 ? entities : [...entities, ...topTokens_sorted.slice(0, 10)], 
    key: topicKey 
  };
}

// Simple SimHash (64-bit) for near-duplicate detection
function simhash(text: string): string {
  const tokens = tokenize(text);
  if (tokens.length === 0) return "0".repeat(16);

  const bits = new Array<number>(64).fill(0);
  for (const token of tokens) {
    const h = BigInt("0x" + sha1(token).slice(0, 16)); // 64 bits from hex
    for (let i = 0n; i < 64n; i++) {
      const mask = 1n << i;
      const bit = (h & mask) ? 1 : -1;
      bits[Number(i)] += bit;
    }
  }

  let out = 0n;
  for (let i = 0; i < 64; i++) {
    if (bits[i] > 0) out |= 1n << BigInt(i);
  }
  return out.toString(16).padStart(16, "0");
}

function hamming(a: string, b: string): number {
  const aa = BigInt("0x" + a);
  const bb = BigInt("0x" + b);
  let x = aa ^ bb;
  let dist = 0;
  while (x) {
    x &= x - 1n;
    dist++;
  }
  return dist;
}

function pruneOldEntries() {
  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();
  db.prepare(`DELETE FROM dedupe_entries WHERE created_at < ?`).run(cutoff);
}

export type DedupeCheck = {
  isDuplicate: boolean;
  reason: string | null;
};

export async function checkDuplicate(params: {
  url: string;
  title: string;
  region?: string;
  snippet?: string;
  source?: string;
}): Promise<DedupeCheck> {
  pruneOldEntries();

  const ttlCutoff = new Date(Date.now() - TTL_DAYS * 86400000).toISOString();

  // Check 0: RAW URL (exact match, before any normalization) - FASTEST CHECK
  const rawUrlHash = sha1(params.url);
  const rawUrlHit = db
    .prepare(`SELECT 1 FROM dedupe_entries WHERE (raw_url_hash = ? OR url_hash = ?) AND created_at >= ? LIMIT 1`)
    .get(rawUrlHash, rawUrlHash, ttlCutoff);

  if (rawUrlHit) {
    if (DEBUG) console.log(`[DEDUPE] DUP_RAW_URL detected for ${params.url.slice(0, 60)}`);
    return { isDuplicate: true, reason: "DUP_RAW_URL" };
  }

  // Resolve canonical URL (handles Google News RSS)
  let canonicalUrl: string;
  try {
    canonicalUrl = await resolveFinalUrlWithGoogleNews(params.url, { timeoutMs: 3000 });
  } catch (err) {
    if (DEBUG) console.log(`[DEDUPE] resolveFinalUrl timeout/error, using normalized: ${(err as Error).message}`);
    canonicalUrl = normalizeUrl(params.url);
  }

  const urlHash = sha1(canonicalUrl);
  const strongFp = buildStrongFingerprint({
    title: params.title,
    url: canonicalUrl,
    summary: params.snippet,
    region: params.region,
  });
  const signature = simhash(`${params.title} ${params.snippet || ""}`);
  const topicHash = buildTopicHash(params.title);

  // Check 1: Canonical URL
  const urlHit = db
    .prepare(`SELECT 1 FROM dedupe_entries WHERE url_hash = ? AND created_at >= ? LIMIT 1`)
    .get(urlHash, ttlCutoff);

  if (urlHit) {
    if (DEBUG) console.log(`[DEDUPE] DUP_URL detected for ${canonicalUrl.slice(0, 60)}`);
    return { isDuplicate: true, reason: "DUP_URL" };
  }

  // Check 2: Strong fingerprint
  const fpHit = db
    .prepare(`SELECT 1 FROM dedupe_entries WHERE fingerprint = ? AND created_at >= ? LIMIT 1`)
    .get(strongFp, ttlCutoff);

  if (fpHit) {
    if (DEBUG) console.log(`[DEDUPE] DUP_FP detected for title: ${params.title.slice(0, 60)}`);
    return { isDuplicate: true, reason: "DUP_FP" };
  }

  // Check 3: Near-duplicate via simhash
  const rows = db
    .prepare(`SELECT signature FROM dedupe_entries WHERE created_at >= ? ORDER BY id DESC LIMIT ?`)
    .all(ttlCutoff, MAX_SIG_ROWS) as { signature: string }[];

  for (const row of rows) {
    if (!row.signature) continue;
    const dist = hamming(signature, row.signature);
    if (dist <= NEAR_DUP_HAMMING) {
      if (DEBUG) console.log(`[DEDUPE] DUP_NEAR(h=${dist}) detected`);
      return { isDuplicate: true, reason: `DUP_NEAR(h=${dist})` };
    }
  }

  // Check 4: Topic Hash - same story with rewritten title
  const topicHit = db
    .prepare(`SELECT 1 FROM dedupe_entries WHERE topic_hash = ? AND created_at >= ? LIMIT 1`)
    .get(topicHash, ttlCutoff);

  if (topicHit) {
    if (DEBUG) console.log(`[DEDUPE] DUP_TOPIC detected for title: ${params.title.slice(0, 60)}`);
    return { isDuplicate: true, reason: "DUP_TOPIC" };
  }

  return { isDuplicate: false, reason: null };
}

export async function rememberDedup(params: {
  url: string;
  title: string;
  region?: string;
  snippet?: string;
  source?: string;
}) {
  // CRITICAL: Use SAME URL resolution as checkDuplicate to ensure hashes match
  let canonicalUrl: string;
  try {
    canonicalUrl = await resolveFinalUrlWithGoogleNews(params.url, { timeoutMs: 3000 });
  } catch {
    canonicalUrl = normalizeUrl(params.url);
  }
  const urlHash = sha1(canonicalUrl);

  // ALSO store raw URL hash for exact match detection
  const rawUrlHash = sha1(params.url);
  const strongFp = buildStrongFingerprint({
    title: params.title,
    url: canonicalUrl,
    summary: params.snippet,
    region: params.region,
  });
  const signature = simhash(`${params.title} ${params.snippet || ""}`);
  const topicHash = buildTopicHash(params.title);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO dedupe_entries (canonical_url, url_hash, fingerprint, signature, topic_hash, region, source, title, created_at, raw_url_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(canonicalUrl, urlHash, strongFp, signature, topicHash, params.region ?? null, params.source ?? null, params.title ?? null, now, rawUrlHash);

  if (DEBUG) console.log(`[DEDUPE] Remembered: ${canonicalUrl.slice(0, 60)}`);
}

export function debugFingerprint(params: { title: string; url: string; region?: string }) {
  return buildStrongFingerprint(params);
}

export function debugSignature(text: string) {
  return simhash(text);
}

export function cleanupDedup() {
  pruneOldEntries();
}
/**
 * TOPIC COOLDOWN: Prevent same topic from being posted within 48 hours
 * topic_hash = buildTopicHash(title), identifies story topic despite URL changes
 * Use case: "Cuba + USA + embargo" story evolves with new reporting → don't post again within 48h
 */

const TOPIC_COOLDOWN_HOURS = Number(process.env.TOPIC_COOLDOWN_HOURS || 48);

/**
 * Check if topic has been posted within cooldown period
 */
export async function isTopicOnCooldown(topicHash: string): Promise<boolean> {
  if (!topicHash) return false; // no topic hash = no cooldown check

  const cutoff = new Date(Date.now() - TOPIC_COOLDOWN_HOURS * 3600000).toISOString();
  const row = db.prepare(
    `SELECT 1 FROM topic_cooldown WHERE topic_hash = ? AND posted_at > ? LIMIT 1`
  ).get(topicHash, cutoff);
  
  return !!row;
}

/**
 * Record topic as posted (for cooldown tracking)
 */
export function recordTopicPosted(params: {
  topic_hash: string;
  title: string;
  url: string;
}): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO topic_cooldown (topic_hash, posted_at, title, url)
     VALUES (?, ?, ?, ?)`
  ).run(params.topic_hash, now, params.title, params.url);
}

/**
 * Debug: Get last post of topic
 */
export function getLastTopicPost(topicHash: string): { posted_at: string; title: string; url: string } | null {
  const row = db.prepare(
    `SELECT posted_at, title, url FROM topic_cooldown WHERE topic_hash = ? ORDER BY posted_at DESC LIMIT 1`
  ).get(topicHash) as { posted_at: string; title: string; url: string } | undefined;
  return row || null;
}