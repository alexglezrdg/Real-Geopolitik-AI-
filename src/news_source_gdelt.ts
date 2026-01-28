/**
 * GDELT v2 Doc API helper (lite)
 * Fetches recent articles by query, returns unified FeedItem[]
 * Reference: https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/
 */

import { FeedItem } from "./rss.js";

const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

const DEFAULT_QUERIES = [
  "cuba OR havana OR bloqueo OR embargo",
  "venezuela OR caracas OR maduro",
  "latin america OR mexico OR colombia OR chile OR peru",
  "united states state department OR pentagon OR nato",
];

const MAX_RECORDS = Number(process.env.GDELT_MAX_RECORDS || 40);
const ENABLED = (process.env.GDELT_ENABLED ?? "0") === "1"; // Default disabled due to API content-type issues

export async function fetchGdelt(): Promise<FeedItem[]> {
  if (!ENABLED) return [];

  const items: FeedItem[] = [];

  for (const query of DEFAULT_QUERIES) {
    const url = `${GDELT_BASE}?query=${encodeURIComponent(query)}&maxrecords=${MAX_RECORDS}&format=json&mode=ArtList&sort=DateDesc`; // mode=ArtList gives list
    try {
      const res = await fetch(url, { headers: { "User-Agent": "GeopolitikBot/1.0" } });
      if (!res.ok) {
        console.warn(`[GDELT] ${res.status} ${res.statusText}`);
        continue;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json")) {
        console.warn(`[GDELT] unexpected content-type: ${contentType}`);
        continue;
      }
      const data: any = await res.json();
      const arts = data?.articles || [];
      for (const art of arts) {
        const link = (art.url || "").trim();
        const title = (art.title || "").trim();
        if (!link || !title) continue;
        items.push({
          source: art.sourceDomain || art.domain || "GDELT",
          title,
          link,
          isoDate: art.seendate || art.date || undefined,
          snippet: (art.excerpt || art.language || "").toString().slice(0, 500)
        });
      }
    } catch (e: any) {
      console.warn(`[GDELT] error ${e?.message || e}`);
    }
  }

  // Remove obvious dups by URL
  const seen = new Set<string>();
  const unique: FeedItem[] = [];
  for (const it of items) {
    const key = it.link.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(it);
  }

  return unique;
}
