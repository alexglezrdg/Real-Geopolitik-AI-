/**
 * Post History - Anti-Duplicate Tracking (48h window)
 * Tracks posted stories by canonical URL + title fingerprint
 * 
 * With URL resolution for shorteners/redirects
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { resolveFinalUrlCached } from "./url_resolver.js";

export type DuplicateReason =
  | "duplicate_url_recent"
  | "duplicate_title_recent"
  | null;

export type PostHistoryEntry = {
  canonical_url: string;
  url_hash: string;
  title_fingerprint: string;
  title: string;
  source?: string | null;
  posted_at: string; // ISO
  tweet_id?: string | null;
};

const DEFAULT_HISTORY_PATH =
  process.env.POST_HISTORY_PATH || "data/posted.json";
const WINDOW_HOURS = Number(process.env.POST_HISTORY_WINDOW_HOURS || 48);
const MAX_ENTRIES = Number(process.env.POST_HISTORY_MAX_ENTRIES || 2000);
const DEBUG = process.env.POST_HISTORY_DEBUG === "1";

function log(...args: any[]) {
  if (!DEBUG) return;
  console.log("[POST-HISTORY]", ...args);
}

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function normalizeHost(host: string) {
  const h = host.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

const TRACKING_KEYS = [
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "cmpid",
  "cmp",
  "ocid",
  "ICID",
  "s_cid",
  "vero_id",
  "ref",
];

function isTrackingParam(key: string) {
  const k = key.toLowerCase();
  if (k.startsWith("utm_")) return true;
  return TRACKING_KEYS.some((x) => x.toLowerCase() === k);
}

export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.host = normalizeHost(u.host);

    // Strip tracking params
    const kept: [string, string][] = [];
    u.searchParams.forEach((value, key) => {
      if (!isTrackingParam(key)) kept.push([key, value]);
    });

    // Rebuild sorted query
    kept.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    u.search = "";
    for (const [k, v] of kept) u.searchParams.append(k, v);

    // Normalize trailing slash (keep "/" for root only)
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    // If URL parsing fails, fall back to trimming
    return raw.trim();
  }
}

const STOPWORDS = new Set([
  // Spanish
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "al",
  "y",
  "o",
  "u",
  "en",
  "por",
  "para",
  "con",
  "sin",
  "sobre",
  "tras",
  "ante",
  "entre",
  "contra",
  "a",
  "su",
  "sus",
  "se",
  "que",
  "como",
  "más",
  "menos",
  "hoy",
  "ayer",
  "mañana",
  "última",
  "hora",
  "clave",
  "urgente",
  "breaking",
  // English
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "without",
  "and",
  "or",
  "as",
  "by",
  "from",
  "at",
  "breaking",
  "latest",
  "update",
]);

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function titleFingerprint(titleRaw: string): string {
  const t = stripDiacritics(titleRaw.toLowerCase())
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = t
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length >= 3 && !STOPWORDS.has(x));

  // ✅ IMPROVED: Use first 15 tokens (not 10) to avoid collision
  // Example: "Israel hostages freed" vs "Israel hostages killed"
  // With 15 tokens: captures more context → different hashes
  // With 10 tokens: both might be "israel hostages" → collision
  const key = tokens.slice(0, 15).join(" ");
  return sha1(key || t);
}

function nowMs() {
  return Date.now();
}

function withinWindowMs(postedAtIso: string, windowHours: number) {
  const ts = Date.parse(postedAtIso);
  if (!Number.isFinite(ts)) return false;
  return nowMs() - ts <= windowHours * 60 * 60 * 1000;
}

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function readHistory(
  filePath: string
): Promise<PostHistoryEntry[]> {
  try {
    const buf = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(buf);
    if (!Array.isArray(parsed)) return [];
    return parsed as PostHistoryEntry[];
  } catch {
    return [];
  }
}

async function atomicWriteJson(filePath: string, data: any) {
  await ensureDir(filePath);
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

function prune(entries: PostHistoryEntry[]) {
  const prunedWindow = entries.filter((e) =>
    withinWindowMs(e.posted_at, WINDOW_HOURS)
  );
  // Keep newest first
  prunedWindow.sort(
    (a, b) => Date.parse(b.posted_at) - Date.parse(a.posted_at)
  );
  return prunedWindow.slice(0, MAX_ENTRIES);
}

export async function hasRecentDuplicate(
  url: string,
  title: string,
  filePath = DEFAULT_HISTORY_PATH
) {
  // ✅ Resolve redirects (shorteners, AMP, etc.) BEFORE canonicalizing
  // This ensures bit.ly/XYZ → example.com/article → same hash as direct example.com/article
  let resolvedUrl = url;
  try {
    resolvedUrl = await resolveFinalUrlCached(url, {
      timeoutMs: 3000,  // Shorter timeout for post flow
      maxRedirects: 3,
    });
    if (resolvedUrl !== url) {
      log(`URL resolved: ${url.slice(0, 50)}... → ${resolvedUrl.slice(0, 50)}...`);
    }
  } catch (err) {
    // If resolution fails, use original URL
    log(`URL resolution failed: ${(err as Error).message}, using original`);
  }

  const canonical = canonicalizeUrl(resolvedUrl);
  const url_hash = sha1(canonical);
  const tfp = titleFingerprint(title);

  const entries = prune(await readHistory(filePath));

  const urlDup = entries.find((e) => e.url_hash === url_hash);
  if (urlDup) {
    log(
      "Duplicate URL detected:",
      canonical,
      "matched:",
      urlDup.canonical_url,
      "at",
      urlDup.posted_at
    );
    return {
      isDuplicate: true,
      reason: "duplicate_url_recent" as DuplicateReason,
      canonical_url: canonical,
    };
  }

  const titleDup = entries.find((e) => e.title_fingerprint === tfp);
  if (titleDup) {
    log(
      "Duplicate TITLE detected:",
      title,
      "matched:",
      titleDup.title,
      "at",
      titleDup.posted_at
    );
    return {
      isDuplicate: true,
      reason: "duplicate_title_recent" as DuplicateReason,
      canonical_url: canonical,
    };
  }

  return { isDuplicate: false, reason: null as DuplicateReason, canonical_url: canonical };
}

export async function recordPosted(params: {
  url: string;
  title: string;
  source?: string | null;
  tweet_id?: string | null;
  filePath?: string;
}) {
  const filePath = params.filePath || DEFAULT_HISTORY_PATH;

  const canonical = canonicalizeUrl(params.url);
  const entry: PostHistoryEntry = {
    canonical_url: canonical,
    url_hash: sha1(canonical),
    title_fingerprint: titleFingerprint(params.title),
    title: params.title,
    source: params.source ?? null,
    posted_at: new Date().toISOString(),
    tweet_id: params.tweet_id ?? null,
  };

  const existing = prune(await readHistory(filePath));
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  await atomicWriteJson(filePath, next);
  log("Recorded post:", entry.canonical_url, entry.tweet_id || "");
}
