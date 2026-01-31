import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fetchAllFeeds } from "./rss.js";
import { pickTopStory, detectUrgencyTag } from "./news_picker.js";
import { curateCandidates, formatCuratorLog, type FeedItem } from "./curator.js";
import { refineCandidatesWithLLM, canonicalizeUrl, type LLMCurationResult } from "./curator-llm.js";
import { generateThreadWithClaude, type NewsPack } from "./claude.js";
import { generateNewsImage } from "./openai_image.js";
import { postThread, testConnection } from "./x.js";
import { isAlreadyPosted, markPosted, getTodayPostCount } from "./db.js";
import { recordPosted, canonicalizeUrl as phCanonicalizeUrl } from "./post_history.js";
import { checkDuplicate as dedupeCheck, rememberDedup, isTopicOnCooldown, recordTopicPosted, buildTopicHash } from "./dedupe_store.js";
import { geoGate, type RegionBucket } from "./geo_gate.js";
import { decideImageMode, extractEntities } from "./image_mode.js";
import { composeImage } from "./image_composer.js";
import { writeMaestroPost, type MaestroInput } from "./post_writer_maestro.js";
import { acquireLock, releaseLock } from "./process_lock.js";

const MAX_POSTS_PER_DAY = parseInt(process.env.MAX_POSTS_PER_DAY || "30", 10);

// ============ TWITTER LENGTH UTILITIES ============
// X counts URLs as 23 characters (via t.co shortening)
const TCO_URL_LEN = 23;

function twitterLen(text: string): number {
  // Count any URL as exactly 23 characters
  const urlRegex = /https?:\/\/\S+/g;
  let len = 0;
  let lastIndex = 0;
  for (const m of text.matchAll(urlRegex)) {
    const idx = m.index ?? 0;
    len += idx - lastIndex;
    len += TCO_URL_LEN;
    lastIndex = idx + m[0].length;
  }
  len += text.length - lastIndex;
  return len;
}

function trimToTwitter(text: string, max = 270): string {
  if (twitterLen(text) <= max) return text;
  // Conservative trim from the end until it fits
  let t = text;
  while (t.length > 0 && twitterLen(t) > max) {
    t = t.slice(0, -1);
  }
  return t.trim();
}

// ============ HASHTAG UTILITIES ============
const STOP_TAGS = new Set([
  "google", "news", "com", "rss", "article", "articles", "france24", "bbc",
  "reuters", "aljazeera", "dw", "ap", "afp", "guardian", "youtube", "video",
  "twitter", "x", "feed", "blog", "runrun", "elpais", "elmundo", "infobae",
  "nyt", "cnn", "foxnews", "washingtonpost", "noticias", "diario", "efe",
  "telesur", "rtve", "univision", "telemundo", "caracol", "eluniversal"
]);

const COMMON_TLDS = new Set([
  "com", "org", "net", "edu", "gov", "int", "mil",
  "es", "mx", "co", "ve", "ar", "br", "cl", "pe", "ec", "bo", "uy", "py",
  "news", "info", "tv", "io"
]);

function normalizeTag(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-zA-Z0-9]/g, "") // alphanumeric only
    .replace(/^\d+$/, "") // no pure numbers
    .trim();
}

function buildSourceStopTags(source?: string, url?: string): Set<string> {
  const stop = new Set<string>([...STOP_TAGS].map((t) => t.toLowerCase()));

  if (source) {
    for (const raw of source.split(/\s+/)) {
      const norm = normalizeTag(raw).toLowerCase();
      if (norm) stop.add(norm);
    }
  }

  if (url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      for (const part of host.split(".")) {
        if (!part || COMMON_TLDS.has(part)) continue;
        const norm = normalizeTag(part).toLowerCase();
        if (norm) stop.add(norm);
      }
    } catch {
      // ignore malformed URLs
    }
  }

  return stop;
}

// ============ GEOPOLITICAL GATING ============
/**
 * Quick geopolitical relevance check
 * Returns true if story is likely geopolitical
 */
function isGeoPreferred(item: any): { isGeo: boolean; reason: string } {
  const titleLower = (item.title ?? "").toLowerCase();
  const snippetLower = (item.snippet ?? "").toLowerCase();
  const fullText = `${titleLower} ${snippetLower}`;

  // STRONG GEO SIGNALS (positive)
  const GEO_POSITIVE = [
    // Conflicts/Military
    /war|conflict|militar|army|navy|air force|troops|invasion|attack|bombing|artillery|fighter|drone|missile|warfare/,
    // Diplomacy/Relations
    /diplomacy|diplomat|embassy|sanctions|embargo|treaty|agreement|negotiation|bilateral|multilateral|alliance|cooperation/,
    // Political
    /election|coup|regime|authoritarian|democracy|government|parliament|congress|president|minister|prime minister/,
    // Geopolitics/Security
    /geopolitics|geopolitical|security|intelligence|spy|espionage|national security|foreign policy|strategic|border|territorial/,
    // Trade/Resources
    /tariff|trade war|export|import|commodities|oil|gas|energy|lithium|rare earth|supply chain|sanctions|import duty/,
    // International actors
    /russia|china|iran|putin|xi jinping|biden|trump|erdogan|israel|palestine|gaza|hamas|hezbollah|saudi|uae|gulf|nato|eu/,
    // Americas focus
    /venezuela|maduro|cuba|havana|mexico|colombia|peru|chile|argentina|brazil|latam|caribbean|haiti|panama|border|migration|cartel/,
    // Middle East
    /saudi|yemen|houthi|iraq|syria|jordan|lebanon|bahrain|qatar|uae|israel|palestine|gaza|hamas|hezbollah|iran|tehran/,
  ];

  let geoScore = 0;
  for (const pattern of GEO_POSITIVE) {
    if (pattern.test(fullText)) {
      geoScore += 10;
    }
  }

  // STRONG NON-GEO SIGNALS (negative, heavily penalized)
  const NON_GEO_NEGATIVE = [
    // Local/domestic admin
    /child support|welfare|bureaucracy|local government|city council|municipal|domestic admin|australia health|australian domestic/,
    // Lifestyle/entertainment
    /celebrity|actor|actress|movie|film|music|sports|football|soccer|basketball|tennis|olympic|lifestyle|fashion|diet|cooking/,
    // Generic finance
    /stock market|crypto|bitcoin|ethereum|nft|inflation tip|saving money|investment advice|personal finance/,
    // Science/tech (unless geopolitical angle)
    /artificial intelligence(?!.*regulation|.*national security|.*china|.*us|.*geopolitics)/,
  ];

  // HARD-BAN CULTURA/DEPORTES/FARÁNDULA (unless explicit political connection)
  // These must be rejected UNLESS they mention: sanctions, diplomacy, embassy, minister, treaty, propaganda, censorship, exile
  const HARD_BAN_KEYWORDS = [
    // Culture/Entertainment
    /\b(jazz|músico|cantante|banda|concierto|festival|cine|película|actor|actriz|director|premio|oscar|grammy|teatro|danza|ballet|espectáculo)\b/i,
    // Sports
    /\b(fútbol|béisbol|baloncesto|voleibol|tenis|golf|boxeo|mma|juegos olímpicos|mundial|torneo|liga|campeonato|equipo deportivo)\b/i,
    // Celebrities/Gossip
    /\b(celebridad|influencer|modelo|reality show|farándula|chisme|romance|separación|boda celebrity)\b/i,
  ];

  const POLITICAL_EXCEPTION_KEYWORDS = [
    /\b(sanción|sanciones|embargo|diplomacia|diplomático|embajada|ministro|ministros|tratado|acuerdo oficial|propaganda estatal|censura|exilio político|disidente|refugiado político)\b/i,
  ];

  // Check hard-ban first
  let hasHardBan = false;
  for (const pattern of HARD_BAN_KEYWORDS) {
    if (pattern.test(fullText)) {
      hasHardBan = true;
      break;
    }
  }

  // If hard-ban detected, check for political exception
  if (hasHardBan) {
    let hasPoliticalException = false;
    for (const pattern of POLITICAL_EXCEPTION_KEYWORDS) {
      if (pattern.test(fullText)) {
        hasPoliticalException = true;
        break;
      }
    }
    
    if (!hasPoliticalException) {
      // REJECT: cultura/deportes without political connection
      return { 
        isGeo: false, 
        reason: "HARD_BAN: cultura/deportes/farándula sin conexión política explícita" 
      };
    }
  }

  let nonGeoPenalty = 0;
  for (const pattern of NON_GEO_NEGATIVE) {
    if (pattern.test(fullText)) {
      nonGeoPenalty += 30;
    }
  }

  geoScore -= nonGeoPenalty;

  const isGeo = geoScore >= 10;
  const reason = isGeo
    ? `geoScore=${geoScore} (positive signals detected)`
    : `geoScore=${geoScore} (non-geo signals or insufficient geo markers)`;

  return { isGeo, reason };
}

export function stripUrlsAndMoreDetails(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^más\s+detalles\s*:/i.test(l))
    .filter((l) => !/https?:\/\//i.test(l))
    .join("\n")
    .trim();
}

function buildFinalTweetText(baseText: string, url: string, hashtags: string[]): string {
  const canonicalUrl = canonicalizeUrl(url);
  const cleanBaseText = stripUrlsAndMoreDetails(baseText);
  const tags = hashtags.map((h) => `#${normalizeTag(h)}`).filter(Boolean).join(" ");
  const suffix = `\n\nMás detalles: ${canonicalUrl}${tags ? `\n${tags}` : ""}`;
  const combined = `${cleanBaseText}${suffix}`.trim();
  const final = trimToTwitter(combined, 280);
  
  // Validation: Ensure exactly 1 "Más detalles:" URL is present
  const urlMatches = final.match(/Más\s+detalles\s*:\s*https?:\/\/\S+/gi);
  if (!urlMatches || urlMatches.length !== 1) {
    console.warn(`[URL_VALIDATION] Expected 1 URL, found ${urlMatches?.length ?? 0} in final tweet`);
    console.warn(`  Final text: ${final.slice(0, 100)}...`);
  }
  
  return final;
}

// ============ ANTI-DUPLICATE HELPERS ============
/**
 * Pick first non-duplicate from ranked candidates
 * Applies hard geo-gate: only allow non-geo if score >= 85
 */
async function pickFirstNotDuplicate(
  candidates: any[],
  debug = false
): Promise<{ picked: any; reason: string } | null> {
  const debug_hist = (process.env.POST_HISTORY_DEBUG ?? "0") === "1" || debug;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];

    if (!c?.url && !c?.link) {
      if (debug_hist) console.log(`   [DEDUP] Candidate ${i}: missing url/link, skip`);
      continue;
    }

    const url = c.url || c.link;
    const title = c.title;

    if (!title) {
      if (debug_hist) console.log(`   [DEDUP] Candidate ${i}: missing title, skip`);
      continue;
    }

    // CONSOLIDATED DEDUP CHECK: 4-layer (URL/FP/NEAR/TOPIC) with 14d TTL + topic cooldown (72h)
    const dedupe = await dedupeCheck({
      url,
      title,
      region: c.region || c.region_bucket,
      snippet: c.snippet || "",
      source: c.source || ""
    });
    if (dedupe.isDuplicate) {
      console.log(`[DROP] ${dedupe.reason} :: "${title.slice(0, 50)}..."`);
      continue;
    }

    // Check topic cooldown (72h): same topic despite different URL
    const topicHash = buildTopicHash(title);
    const onCooldown = await isTopicOnCooldown(topicHash);
    if (onCooldown) {
      const lastPost = require('./dedupe_store.js').getLastTopicPost(topicHash);
      console.log(`[DROP] TOPIC_COOLDOWN :: "${title.slice(0, 50)}..." (last posted ${lastPost?.posted_at || "unknown"})`);
      continue;
    }

    // Hard geo-gate: only allow non-geo if score is very high (85+)
    const region = (c.region || c.region_bucket || "OTHER") as RegionBucket;
    const score = Number(c.score ?? 0);
    
    const gate = geoGate({ region_bucket: region, score });
    if (!gate.ok) {
      console.log(
        `[DROP] ${gate.reason} (region=${gate.region} score=${gate.score}) :: "${title.slice(0, 50)}..."`
      );
      continue;
    }

    // This candidate passes all checks
    if (debug_hist) {
      console.log(`   [DEDUP] ✅ Candidate ${i} selected: ${c.source} | score=${score} | region=${region}`);
    }
    return {
      picked: c,
      reason: `non_duplicate (OK) | region=${region} | score=${score}`,
    };
  }

  if (debug_hist) {
    console.log(`   [DEDUP] ⚠️  No candidate passed all checks`);
  }
  return null;
}

type RunResult = {
  success: boolean;
  posted: boolean;
  tweetIds: string[];
  errors: string[];
};

function buildTemplateThreadNewsPack(selected: {
  title: string;
  snippet?: string;
  source?: string;
  url: string;
}): NewsPack {
  const todayIso = new Date().toISOString().slice(0, 10);
  const hook = `${selected.title}`;
  const contextLine = (selected.snippet || selected.source || "Seguimiento").slice(0, 160);

  const t1 = `${hook}`;
  const t2 = `${contextLine}`;

  return {
    mode: "thread2",
    language: "es",
    urgency_tag: "CLAVE",
    topic_hashtags: [],
    tweet: { text: t1, url: selected.url },
    thread: [{ text: t2 }],
    visual: {
      format: "9:16",
      brand: "Real Geopolitik",
      palette: { bg: "#000000", text: "#FCFCFA", accent: "#E10600" },
      header: "CLAVE",
      headline: trimToTwitter(selected.title.toUpperCase(), 90),
      subheadline: trimToTwitter(contextLine, 110),
      source_line: `Fuente: ${selected.source ?? "N/A"}`,
      date_line: `Fecha: ${todayIso}`,
      image_brief: "Noticia geopolítica, alto contraste, sin logos",
      style_rules: [
        "alto contraste",
        "fondo negro/carbón",
        "acento rojo #E10600",
        "tipografía sans condensada bold, MAYÚSCULAS",
        "sin logos de terceros, sin marcas de agua",
      ],
      layout_lock: "header_pill_top_left|hero_60pct|red_rule|lower_third_text|footer_source_date",
    },
  };
}

// Extract texts from NewsPack
function extractTweetsFromPack(pack: NewsPack): string[] {
  const texts: string[] = [];
  
  if (pack.tweet?.text) {
    texts.push(pack.tweet.text);
  }
  
  if (pack.mode === "thread2" && pack.thread) {
    texts.push(...pack.thread.map((t) => t.text).filter(Boolean));
  }
  
  return texts;
}

// Format visual metadata for logging
function formatVisualMeta(pack: NewsPack): string {
  const { visual, topic_hashtags, urgency_tag } = pack;
  const tags = topic_hashtags.join(", ");
  return `[${urgency_tag}] "${visual.headline.slice(0, 50)}" | #${tags}`;
}

export async function runOnce(dryRun = true, armed = false, manualUrl?: string): Promise<RunResult> {
  console.log("\n" + "=".repeat(60));
  console.log("🌍 GEOPOLITIK X AUTOPOST");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔧 Mode: ${dryRun ? "SAFE MODE / DRY RUN (default)" : "LIVE (explicit --live)"}`);
  console.log("=".repeat(60));

  const result: RunResult = {
    success: false,
    posted: false,
    tweetIds: [],
    errors: [],
  };

  const todayCount = getTodayPostCount();
  console.log(`\n📊 Posts today: ${todayCount}/${MAX_POSTS_PER_DAY}`);

  if (todayCount >= MAX_POSTS_PER_DAY) {
    console.log("⚠️  Daily limit reached. Skipping.");
    result.errors.push("Daily limit reached");
    return result;
  }

  // Only test X connection if BOTH conditions are met: --live flag AND X_LIVE=1
  if (armed) {
    console.log("\n🔗 Testing X connection...");
    const me = await testConnection();
    if (!me) {
      result.errors.push("X API connection failed");
      return result;
    }
  }

  let selected: any;

  // If manual URL provided, use it
  if (manualUrl) {
    console.log("\n🔧 Manual mode: using provided URL");
    console.log(`   URL: ${manualUrl}`);
    
    // Try to fetch with RSS first
    console.log("\n📡 Fetching RSS feeds...");
    const items = await fetchAllFeeds();
    const rssItem = items.find(i => i.link === manualUrl);
    
    if (!rssItem) {
      console.log("   ⚠️  URL not found in RSS, using fallback");
      selected = {
        title: "Manual Entry",
        url: manualUrl,
        source: "Manual",
        publishedAt: new Date().toISOString(),
        snippet: "",
        score: 0,
        reasonPicked: "Manual URL"
      };
    } else {
      selected = {
        title: rssItem.title,
        url: rssItem.link,
        source: rssItem.source,
        publishedAt: rssItem.isoDate ?? new Date().toISOString(),
        snippet: rssItem.snippet ?? "",
        score: 0,
        reasonPicked: "Manual URL found in RSS"
      };
    }
  } else {
    // Automatic mode: fetch RSS and curate best story
    console.log("\n🤖 Automatic mode: curating best story...");
    
    try {
      const items = await fetchAllFeeds();
      
      if (!items || items.length === 0) {
        console.log("\n⚠️  No RSS items available");
        result.errors.push("No RSS items");
        result.success = true;
        return result;
      }

      // Cuba-first fast path: use news_picker with Cuba priority
      // CRITICAL: Must check dedup database before selecting!
      const cubaKeywords = ["cuba", "havana", "habana", "bloqueo", "blockade", "embargo", "naval", "caribe", "venezuela", "caracas", "pdvsa", "maduro", "diaz-canel"];
      const pickerCandidate = await pickTopStory();
      if (pickerCandidate) {
        const txt = `${pickerCandidate.title} ${pickerCandidate.snippet}`.toLowerCase();
        const isCuba = cubaKeywords.some(kw => txt.includes(kw));
        if (isCuba) {
          // CHECK DEDUP before selecting (this was missing and caused 10x duplicates!)
          const dedupe = await dedupeCheck({
            url: pickerCandidate.url || pickerCandidate.link,
            title: pickerCandidate.title,
            region: pickerCandidate.region || pickerCandidate.region_bucket,
            snippet: pickerCandidate.snippet || "",
            source: pickerCandidate.source || ""
          });

          if (dedupe.isDuplicate) {
            console.log(`\n🎯 Cuba-first pick BLOCKED by dedup: ${dedupe.reason}`);
          } else {
            // Also check topic cooldown
            const topicHash = buildTopicHash(pickerCandidate.title);
            const onCooldown = await isTopicOnCooldown(topicHash);
            if (onCooldown) {
              console.log(`\n🎯 Cuba-first pick BLOCKED by topic cooldown`);
            } else {
              selected = pickerCandidate;
              console.log("\n🎯 Cuba-first pick from news_picker (passed dedup check)");
            }
          }
        }
      }

      // If Cuba pick selected, skip curator pipeline
      if (!selected) {

      // Convert to FeedItem format for curator
      const feedItems: FeedItem[] = items.map((it) => ({
        source: it.source,
        title: it.title,
        link: it.link,
        isoDate: it.isoDate,
        snippet: it.snippet
      }));

      // Curate candidates
      const debug = (process.env.CURATOR_DEBUG ?? "0") === "1";
      const curationResult = await curateCandidates(feedItems, {
        k: 8,
        targetGeoRatio: 0.75,
        debug
      });

      // Log curator results
      const curatorLogs = formatCuratorLog(curationResult, debug);
      curatorLogs.forEach((log) => console.log(log));

      let bestItem = curationResult.picked;
      let llmResult: LLMCurationResult | null = null;

      // ===== STEP 2: Optional LLM curator validation/refinement =====
      const useLLMCurator = (process.env.CURATOR_LLM ?? "0") === "1";
      if (useLLMCurator) {
        console.log("\n🧠 LLM curator enabled: refining candidate...");
        
        const llmTimeoutMs = parseInt(process.env.CURATOR_LLM_TIMEOUT_MS ?? "15000", 10);
        const llmK = parseInt(process.env.CURATOR_LLM_K ?? "5", 10);

        // Prepare fewer candidates for LLM (use top ranked items only)
        // This improves reliability and reduces timeout issues
        const topCandidatesCount = Math.max(5, llmK);
        const topCandidates = feedItems
          .map(item => ({
            title: item.title,
            url: item.link,
            source: item.source,
            published_at: item.isoDate,
            snippet: item.snippet,
            tags: []
          }))
          .slice(0, topCandidatesCount);

        if (debug) {
          console.log(`   [LLM] Sending ${topCandidates.length} candidates with timeout=${llmTimeoutMs}ms`);
        }

        llmResult = await refineCandidatesWithLLM({
          candidates: topCandidates,
          k: llmK,
          timeoutMs: llmTimeoutMs,
          debug
        });

        if (llmResult && llmResult.best_pick && llmResult.best_pick.score >= 70) {
          console.log(`   ✅ LLM best_pick accepted (score=${llmResult.best_pick.score})`);
          console.log(`   📍 Region: ${llmResult.best_pick.region_bucket}`);
          console.log(`   🎯 Geopolitics: ${llmResult.best_pick.geopolitics_ratio_bucket}`);
          
          // Find the matching RSS item to get isoDate if missing
          const matchingItem = feedItems.find(
            (fi) => canonicalizeUrl(fi.link) === canonicalizeUrl(llmResult!.best_pick.url)
          );

          // Map LLM region bucket to curator region type
          const regionMap: Record<string, "US" | "LATAM" | "CARIBBEAN" | "MIDDLE_EAST" | "GLOBAL" | "OTHER"> = {
            "US": "US",
            "LATAM": "LATAM",
            "MIDDLE_EAST": "MIDDLE_EAST",
            "GLOBAL_GEO": "GLOBAL",
            "OTHER": "OTHER",
            "CARIBBEAN": "CARIBBEAN",
            "GLOBAL": "GLOBAL"
          };

          bestItem = {
            title: llmResult.best_pick.title,
            link: llmResult.best_pick.url,
            source: llmResult.best_pick.source,
            isoDate: matchingItem?.isoDate ?? new Date().toISOString(),
            snippet: llmResult.best_pick.why_this?.join(" ") ?? "",
            score: llmResult.best_pick.score,
            bucket: "geopolitics",
            region: regionMap[llmResult.best_pick.region_bucket] || "OTHER",
            tags: llmResult.best_pick.suggested_hashtags ?? [],
            reasons: llmResult.best_pick.why_this ?? []
          };
        } else {
          if (llmResult) {
            console.log(
              `   ⚠️  LLM best_pick score too low (${llmResult.best_pick?.score}), using deterministic`
            );
          } else {
            console.log(`   ⚠️  LLM curator failed/timeout, using deterministic`);
          }
        }
      }

      // ===== STEP 4: Anti-duplicate check =====
      // If deterministic pick is duplicate, try LLM ranked list or ranked candidates
      console.log("\n🔍 Anti-duplicate check...");
      const dupCheck = await dedupeCheck({
        url: bestItem.link,
        title: bestItem.title,
        region: "OTHER",
        snippet: bestItem.snippet || "",
        source: bestItem.source || ""
      });

      if (dupCheck.isDuplicate) {
        console.log(`   ⚠️  Best pick is duplicate (${dupCheck.reason})`);
        console.log(`   🔄 Trying to find non-duplicate from ranked candidates...`);

        // Try LLM ranked list first (if LLM curator was used)
        let candidates: any[] = [];
        if (useLLMCurator && llmResult?.ranked) {
          candidates = llmResult.ranked.map((r: any) => ({
            title: r.title,
            link: r.url,
            source: r.source,
            score: r.score,
            region: r.region_bucket,
          }));
        }

        // Fallback: use original feedItems as backup candidates
        if (candidates.length === 0) {
          candidates = feedItems.map((fi) => ({
            title: fi.title,
            link: fi.link,
            source: fi.source,
            score: 50, // approximate
            region: "OTHER",
          }));
        }

        const nonDupPick = await pickFirstNotDuplicate(candidates, debug);
        if (nonDupPick?.picked) {
          console.log(`   ✅ Found non-duplicate: ${nonDupPick.picked.source}`);
          console.log(`      Reason: ${nonDupPick.reason}`);
          bestItem = nonDupPick.picked;
        } else {
          console.log(`   ⚠️  No non-duplicate candidate found, using best anyway (may skip post)`);
          // If truly no options, we'll skip post below
          if (dupCheck.isDuplicate) {
            console.log("\n⚠️  SKIP: No non-duplicate story available, all recent stories already posted");
            result.errors.push("All candidates are duplicates");
            result.success = true;
            return result;
          }
        }
      } else {
        console.log(`   ✅ No duplicate found, safe to post`);
      }

      // Convert curator result to selected story
      const picked = bestItem;
      selected = {
        title: picked.title,
        url: picked.link,
        source: picked.source,
        publishedAt: picked.isoDate ?? new Date().toISOString(),
        snippet: picked.snippet ?? "",
        score: picked.score,
        region: ((picked as any).region || "OTHER") as RegionBucket,
        reasonPicked: `[${(picked as any).bucket || "curated"}/${(picked as any).region || "OTHER"}] score=${picked.score}`
      };

      console.log(`   ✅ Picked: "${selected.title.slice(0, 60)}..."`);
      console.log(`   📊 Score: ${selected.score?.toFixed(1) ?? "N/A"}`);
    }
    } catch (err) {
      console.warn(`⚠️  Curator error: ${(err as Error).message}. Falling back to pickTopStory...`);
      
      // Fallback to old pickTopStory method
      const topStory = await pickTopStory();
      if (!topStory) {
        console.log("\n⚠️  No suitable story found");
        result.errors.push("No story available");
        result.success = true;
        return result;
      }
      selected = topStory;
    }
  }

  console.log(`\n📰 Selected: "${selected.title.slice(0, 60)}..."`);
  console.log(`   Source: ${selected.source}`);
  console.log(`   URL: ${selected.url}`);

  // Region fallback to avoid undefined in dedupe store
  if (!(selected as any).region) {
    (selected as any).region = "GLOBAL";
  }

  const llmThreshold = parseInt(process.env.LLM_SCORE_THRESHOLD || "85", 10);
  const scoreForGen = Number(selected.score ?? 0);
  
  // Import hard-geo keywords for additional gate
  const { HARD_GEO_KEYWORDS } = await import("./news_picker.js");
  const textToCheck = `${selected.title} ${selected.snippet || ""}`.toLowerCase();
  const hasHardGeo = HARD_GEO_KEYWORDS.some(kw => textToCheck.includes(kw.toLowerCase()));
  
  // Use LLM if (score >= threshold) AND (has hard-geo keywords)
  // This prevents LLM wastage on low-signal stories that meet score but lack geopolitical substance
  const useLLM = scoreForGen >= llmThreshold && hasHardGeo;

  let newsPack: NewsPack;
  try {
    if (!useLLM) {
      console.log(`\n⚡ Using deterministic thread template (score=${scoreForGen} < ${llmThreshold} OR no hard-geo)`);
      newsPack = buildTemplateThreadNewsPack(selected);
    } else {
      console.log(`\n🧠 Using LLM thread generation (score=${scoreForGen} >= ${llmThreshold} AND has hard-geo)`);
      newsPack = await generateThreadWithClaude({
        source: selected.source,
        title: selected.title,
        url: selected.url,
        snippet: selected.snippet,
      });
    }
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`\n❌ Generation failed: ${msg}`);
    result.errors.push(`Claude error: ${msg}`);
    return result;
  }

  // SKIP validation: check if LLM rejected the story
  if (!newsPack.mode || newsPack.mode === null || newsPack.tweet?.text?.toUpperCase().includes("SKIP")) {
    console.log("\n⚠️  SKIP: LLM rejected story (non-geopolitical or insufficient signal)");
    console.log(`   Reason: mode=${newsPack.mode}, tweet.text="${newsPack.tweet?.text?.slice(0, 50)}..."`);
    result.errors.push("Story rejected by LLM editorial filter (SKIP)");
    result.success = true;
    return result;
  }

  const texts = extractTweetsFromPack(newsPack);

  console.log("\n📝 Thread preview:");
  texts.forEach((t, i) => console.log(`   ${i + 1}. ${t.slice(0, 120)}${t.length > 120 ? "…" : ""}`));

  console.log(`\n🧩 Visual meta: ${formatVisualMeta(newsPack)}`);

  // Generate image if enabled (HYBRID MODE: DALL·E + optional portrait composition)
  let imagePath: string | null = null;
  const imageRequired = process.env.IMAGE_LIVE === "1";
  
  if (imageRequired) {
    console.log(`\n🎨 Generating image...`);
    
    // Step 1: Always generate DALL·E image (as before)
    const dalleImagePath = await generateNewsImage(newsPack.visual, selected.url);
    
    if (!dalleImagePath) {
      console.log(`   ❌ Image generation FAILED (IMAGE_LIVE=1 requires image)`);
      console.log(`   [IMAGE] generation_failed=true`);
      result.errors.push("Image generation failed (IMAGE_LIVE=1 requires image)");
      result.success = true;
      return result;
    }

    // Step 2: Optional forced portrait (manual override)
    const forcedPortraitPath = (process.env.FORCE_PORTRAIT_PATH ?? "").trim();

    if (forcedPortraitPath) {
      if (fs.existsSync(forcedPortraitPath)) {
        console.log(`[IMG] forced portrait detected: ${path.basename(forcedPortraitPath)}`);
        const composeResult = await composeImage({
          dalleImagePath,
          portraitPath: forcedPortraitPath,
          badgeText: newsPack.visual.header,
          outputFilename: path.basename(dalleImagePath).replace(".png", ".composed.png"),
        });

        if (composeResult.success && composeResult.finalPath) {
          imagePath = composeResult.finalPath;
          console.log(`   ✅ Image ready (COMPOSED - forced portrait): ${imagePath}`);
          console.log(`[IMG] output: ${imagePath}`);
        } else {
          console.warn(`   ⚠️  Forced composition failed: ${composeResult.error}`);
          console.log(`   ✅ Fallback to DALL·E FULL: ${dalleImagePath}`);
          imagePath = dalleImagePath;
        }
      } else {
        console.warn(`   ⚠️  FORCE_PORTRAIT_PATH does not exist: ${forcedPortraitPath}`);
      }
    }

    // Step 3: Decide mode (DALL·E FULL vs COMPOSED) if not forced
    if (!imagePath) {
      // Extract entities from tags, title, AND snippet for better detection
      const entities = extractEntities(
        newsPack.topic_hashtags || [], 
        selected.title,
        selected.snippet // ← Added snippet for better Trump/Lula detection
      );
      const modeDecision = decideImageMode(entities);
      
      console.log(`[IMG] mode: ${modeDecision.mode}`);
      console.log(`[IMG] entity: ${modeDecision.entity || "NONE"}`);
      console.log(`[IMG] portrait: ${modeDecision.portraitPath ? path.basename(modeDecision.portraitPath) : "none"}`);
      console.log(`[IMG] reason: ${modeDecision.reason}`);

      if (modeDecision.mode === "DALLE_FULL") {
        imagePath = dalleImagePath;
        console.log(`   ✅ Image ready (DALL·E FULL): ${imagePath}`);
      } else if (modeDecision.mode === "COMPOSED" && modeDecision.portraitPath) {
        const composeResult = await composeImage({
          dalleImagePath,
          portraitPath: modeDecision.portraitPath,
          badgeText: newsPack.visual.header,
          outputFilename: path.basename(dalleImagePath).replace(".png", ".composed.png"),
        });

        if (composeResult.success && composeResult.finalPath) {
          imagePath = composeResult.finalPath;
          console.log(`   ✅ Image ready (COMPOSED): ${imagePath}`);
          console.log(`[IMG] output: ${imagePath}`);
        } else {
          console.warn(`   ⚠️  Composition failed: ${composeResult.error}`);
          console.log(`   ✅ Fallback to DALL·E FULL: ${dalleImagePath}`);
          imagePath = dalleImagePath;
        }
      }
    }

    console.log(`   [IMAGE] generated=${imagePath}`);
  }

  // ENFORCE HASHTAGS: Ensure 1-2 hashtags at end of tweet (exclude domain/source-based tags)
  const ensureHashtags = (
    baseText: string,
    packHashtags?: string[],
    source?: string,
    url?: string
  ): string[] => {
    const allHashtags: string[] = [];
    const stopTags = buildSourceStopTags(source, url);
    
    // 1. Try hashtags from LLM (NewsPack)
    if (packHashtags && packHashtags.length > 0) {
      for (const tag of packHashtags) {
        const normalized = normalizeTag(tag);
        if (normalized && !stopTags.has(normalized.toLowerCase())) {
          allHashtags.push(tag);
        }
      }
    }
    
    // 2. If still empty, derive from story keywords (NOT from URL/source domain)
    if (allHashtags.length === 0) {
      const storyText = `${selected.title}`.toLowerCase(); // Title only, NOT source
      const rules: Array<[RegExp, string]> = [
        [/cuba|havana|habana/, "Cuba"],
        [/venezuela|caracas|maduro/, "Venezuela"],
        [/trump/, "Trump"],
        [/iran|teheran|tehran/, "Iran"],
        [/ucrania|kiev|kyiv|rusia|moscu|donbas/, "Ucrania"],
        [/china|beijing|taiwan/, "China"],
        [/israel|gaza|hamas/, "Israel"],
        [/bloqueo|naval|embargo/, "Geopolitica"],
      ];
      
      for (const [regex, tag] of rules) {
        if (regex.test(storyText)) {
          allHashtags.push(tag);
        }
      }
    }
    
    // 3. Deduplicate and limit to 2
    const finalTags = [...new Set(allHashtags)]
      .map(normalizeTag)
      .filter(t => t && !stopTags.has(t.toLowerCase()))
      .slice(0, 2);
    
    // 4. Fallback if still empty
    if (finalTags.length === 0) {
      finalTags.push("Geopolitica");
    }
    
    console.log(`   [TAGS] final_hashtags=[${finalTags.join(",")}]`);
    return finalTags;
  };
  
  // Apply hashtag enforcement to first tweet
  // Returns array of final hashtags
  const finalHashtags = ensureHashtags(texts[0], newsPack.topic_hashtags, selected.source, selected.url);
  
  // Build final tweet text with URL and hashtags
  texts[0] = buildFinalTweetText(texts[0], selected.url, finalHashtags);

  // Strip URLs from second tweet to avoid duplicate preview cards
  if (texts.length > 1) {
    texts[1] = stripUrlsAndMoreDetails(texts[1]);
  }

  // IMPORTANT: x.ts must enforce dryRun + (X_LIVE && --live) safeguards
  const postResult = await postThread(texts, dryRun, imagePath);

  if (postResult.success) {
    const actuallyPosted = !["safe-mode", "dry-run"].includes(postResult.tweetIds?.[0] ?? "");
    if (actuallyPosted) {
      markPosted({
        url: selected.url,
        title: selected.title,
        source: selected.source,
        tweetId: postResult.tweetIds[0],
      });
      
      // Record in persistent post history (anti-duplicate tracking)
      // ONLY after X post succeeds
      await recordPosted({
        url: selected.url,
        title: selected.title,
        source: selected.source ?? undefined,
        tweet_id: postResult.tweetIds[0],
      });

      // Persist in 7d dedupe store
      await rememberDedup({
        url: selected.url,
        title: selected.title,
        source: selected.source,
        region: selected.reasonPicked,
        snippet: selected.snippet
      });
      
      // Record topic in 72h cooldown store
      recordTopicPosted({
        topic_hash: buildTopicHash(selected.title),
        title: selected.title,
        url: selected.url
      });
      
      console.log(`\n✅ Thread posted successfully!`);
      console.log(`   View: https://x.com/i/status/${postResult.tweetIds[0]}`);
      if (imagePath) {
        console.log(`   [MEDIA] posted_with_image=true`);
      }
    } else {
      console.log(`\n✅ Safe run completed (no posting).`);
    }

    result.success = true;
    result.posted = actuallyPosted;
    result.tweetIds = postResult.tweetIds;
    return result;
  }

  console.log("\n❌ Posting failed");
  result.errors = postResult.errors ?? ["Unknown post error"];
  return result;
}

async function main() {
  // Acquire process lock to prevent parallel executions
  try {
    await acquireLock(5000);
  } catch (lockErr) {
    console.error("❌ Could not acquire lock (another instance running?):", (lockErr as Error).message);
    process.exit(1);
  }

  // Ensure lock is released on exit
  process.on("exit", releaseLock);
  process.on("SIGINT", () => {
    releaseLock();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    releaseLock();
    process.exit(0);
  });

  const args = process.argv.slice(2);
  const live = args.includes("--live") || args.includes("-l");
  const dryRun = args.includes("--dry-run") || args.includes("-d") || !live;
  
  // Check for manual URL: --url https://...
  let manualUrl: string | undefined;
  const urlIdx = args.indexOf("--url");
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    manualUrl = args[urlIdx + 1];
  }
  
  // Determine if TRULY armed for live posting: both flag AND env var
  const xLive = (process.env.X_LIVE ?? "").toLowerCase().trim();
  const hasEnvArmed = xLive === "1" || xLive === "true" || xLive === "yes";
  const armed = live && hasEnvArmed;

  try {
    const r = await runOnce(dryRun, armed, manualUrl);
    process.exit(r.success ? 0 : 1);
  } catch (e) {
    console.error("\n💥 Fatal:", (e as Error)?.message ?? e);
    process.exit(1);
  }
}

main();
