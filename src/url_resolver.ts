/**
 * URL Resolver - Follow redirects to final destination
 * 
 * Resolves shorteners (bit.ly), AMP URLs, news aggregators to final URL
 * Used by post_history to detect duplicates across different link formats
 */

import * as https from "https";
import * as http from "http";
import { IncomingMessage, ClientRequest } from "http";

const DEBUG = process.env.URL_RESOLVER_DEBUG === "1";

function log(...args: any[]) {
  if (!DEBUG) return;
  console.log("[URL-RESOLVER]", ...args);
}

interface ResolveOptions {
  maxRedirects?: number;
  timeoutMs?: number;
  followAll?: boolean; // Follow even 200 OK (for JS redirects)
}

/**
 * Resolve URL to final destination
 * Follows HTTP redirects (3xx), returns final URL
 * Times out after specified ms, returns original URL
 * Uses AbortController for true connection cleanup (not just setTimeout)
 */
export async function resolveFinalUrl(
  urlString: string,
  options: ResolveOptions = {}
): Promise<string> {
  const {
    maxRedirects = 5,
    timeoutMs = 5000,
    followAll = false,
  } = options;

  let current = urlString;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    try {
      const parsed = new URL(current);
      const isHttps = parsed.protocol === "https:";

      log(`Resolving (${redirectCount}): ${current}`);

      // Use AbortController for true timeout (cancels request, not just callback)
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => {
        log(`Timeout after ${timeoutMs}ms, aborting request`);
        controller.abort();
      }, timeoutMs);

      const finalUrl = await new Promise<string>((resolve) => {
        // Use request with method: HEAD
        const reqOptions = {
          method: "HEAD" as const,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
          timeout: timeoutMs,
          signal: controller.signal as any, // AbortSignal for true cancellation
        };

        const req = isHttps
          ? https.request(current, reqOptions)
          : http.request(current, reqOptions);

        req.on("response", (res: IncomingMessage) => {
          clearTimeout(timeoutHandle);
          res.resume(); // Consume response to allow connection reuse

          const status = res.statusCode ?? 200;

          // 3xx redirects
          if (status >= 300 && status < 400) {
            const location = res.headers.location;
            if (location) {
              log(`Redirect ${status} to: ${location}`);
              redirectCount++;

              // Handle relative redirects
              try {
                current = new URL(location, current).toString();
              } catch {
                current = location;
              }

              resolve("REDIRECT_CONTINUE");
            } else {
              log(`Redirect ${status} but no Location header`);
              resolve(current);
            }
          } else {
            // 2xx, 4xx, 5xx → final destination
            log(`Final (${status}): ${current}`);
            resolve(current);
          }
        });

        req.on("error", (err: any) => {
          clearTimeout(timeoutHandle);
          const errMsg = (err as Error).message;
          
          // AbortError means timeout was triggered
          if (errMsg.includes("abort") || errMsg.includes("Cancel")) {
            log(`Request aborted (timeout), using original URL`);
          } else {
            log(`Error: ${errMsg}, using current URL`);
          }
          
          resolve(current);
        });

        req.end();
      });

      if (finalUrl !== "REDIRECT_CONTINUE") {
        return finalUrl;
      }
    } catch (err) {
      log(`Parse error: ${(err as Error).message}, using current URL`);
      return current;
    }
  }

  log(`Max redirects (${maxRedirects}) reached, using current URL`);
  return current;
}

/**
 * Cache for resolved URLs (per process lifetime)
 * Avoids repeated HEAD requests for same URLs
 */
const resolveCache = new Map<string, string>();

export async function resolveFinalUrlCached(
  urlString: string,
  options: ResolveOptions = {}
): Promise<string> {
  if (resolveCache.has(urlString)) {
    const cached = resolveCache.get(urlString)!;
    log(`Cache hit: ${urlString} → ${cached}`);
    return cached;
  }

  const resolved = await resolveFinalUrl(urlString, options);
  resolveCache.set(urlString, resolved);
  return resolved;
}

/**
 * Check if URL is known shortener/aggregator (skip resolution)
 */
function isKnownRedirector(url: string): boolean {
  const redirectorDomains = [
    "bit.ly",
    "tinyurl.com",
    "goo.gl",
    "ow.ly",
    "short.link",
    "news.google.com",
    "flipboard.com",
    "pocket.co",
  ];

  try {
    const parsed = new URL(url);
    const host = parsed.hostname?.toLowerCase() ?? "";

    return redirectorDomains.some((d) => host.includes(d));
  } catch {
    return false;
  }
}

/**
 * Batch resolve URLs (useful for RSS feeds with many links)
 */
export async function resolveFinalUrlsBatch(
  urls: string[],
  options: ResolveOptions = {}
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const url of urls) {
    if (isKnownRedirector(url)) {
      try {
        const resolved = await resolveFinalUrlCached(url, options);
        results.set(url, resolved);
      } catch {
        results.set(url, url);
      }
    } else {
      results.set(url, url);
    }
  }

  return results;
}

/**
 * Clear the resolution cache (for testing)
 */
export function clearResolveCache() {
  resolveCache.clear();
}

/**
 * Get cache size (for monitoring)
 */
export function getResolveCacheSize() {
  return resolveCache.size;
}
/**
 * Extract real URL from Google News RSS redirect
 * Google News RSS articles: news.google.com/rss/articles/{ENCODED_ID}
 * We need to follow the redirect to get the real URL
 */
async function extractGoogleNewsUrl(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url);

    // Try to extract from query parameter
    const urlParam = urlObj.searchParams.get("url");
    if (urlParam) {
      log(`Extracted URL param from Google News: ${urlParam.slice(0, 80)}`);
      return urlParam;
    }

    // For /rss/articles/ URLs, we need to follow the redirect
    // Google News redirects these to the real article URL
    if (url.includes("/rss/articles/") || url.includes("/articles/")) {
      log(`Following Google News redirect for: ${url.slice(0, 80)}`);
      
      // Make GET request and follow redirects
      const https = await import("https");
      
      return new Promise((resolve) => {
        const req = https.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },
          timeout: 5000
        }, (res) => {
          // Check for redirect in Location header
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            log(`Got redirect to: ${res.headers.location.slice(0, 80)}`);
            resolve(res.headers.location);
          } else {
            // Some Google News URLs may have a meta refresh in the body
            // Just return null and let the main resolver handle it
            resolve(null);
          }
          res.resume();
        });
        
        req.on("error", (err) => {
          log(`Error following Google News redirect: ${err.message}`);
          resolve(null);
        });
        
        req.on("timeout", () => {
          log(`Timeout following Google News redirect`);
          req.destroy();
          resolve(null);
        });
      });
    }
  } catch (err) {
    log(`Failed to extract Google News URL: ${(err as Error).message}`);
  }

  return null;
}

/**
 * Normalize URL for comparison
 * - lowercase host
 * - remove tracking params (utm_*, fbclid, gclid, ref, s, etc)
 * - remove fragments
 * - sort query params
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);

    // Lowercase host
    u.hostname = u.hostname.toLowerCase();

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "utm_id",
      "fbclid",
      "gclid",
      "msclkid",
      "ref",
      "refid",
      "source",
      "medium",
      "campaign",
      "content",
      "term",
      "s",
      "mc_cid",
      "mc_eid",
      "hss_channel",
      "hwc",
      "share_id",
      "rs",
      "hl",
    ];

    trackingParams.forEach((param) => u.searchParams.delete(param));

    // Remove fragment
    u.hash = "";

    // Sort params for consistency
    const params = new URLSearchParams([...u.searchParams].sort());
    u.search = params.toString();

    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Enhanced resolution: handle Google News RSS specially
 */
export async function resolveFinalUrlWithGoogleNews(
  urlString: string,
  options: ResolveOptions = {}
): Promise<string> {
  // Step 1: Check if Google News RSS
  if (/news\.google\.com\/(rss\/articles|articles\/)/i.test(urlString)) {
    log(`Detected Google News URL: ${urlString.slice(0, 80)}`);
    const extracted = await extractGoogleNewsUrl(urlString);
    if (extracted) {
      log(`Using extracted URL: ${extracted.slice(0, 80)}`);
      urlString = extracted;
    }
  }

  // Step 2: Resolve via normal redirect following
  const resolved = await resolveFinalUrl(urlString, options);

  // Step 3: Normalize
  return normalizeUrl(resolved);
}