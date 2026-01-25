import "dotenv/config";
import { fetchAllFeeds } from "./rss.js";
import { generateThreadWithClaude } from "./claude.js";
import { postThread, testConnection } from "./x.js";
import { isAlreadyPosted, markPosted, getTodayPostCount } from "./db.js";

const MAX_POSTS_PER_DAY = parseInt(process.env.MAX_POSTS_PER_DAY || "5", 10);

type RunResult = {
  success: boolean;
  posted: boolean;
  tweetIds: string[];
  errors: string[];
};

function pickFirstValid(items: any[]) {
  for (const it of items ?? []) {
    const url = String((it as any)?.url ?? (it as any)?.link ?? "").trim();
    const title = String((it as any)?.title ?? (it as any)?.headline ?? "").trim();
    const source = String((it as any)?.source ?? "").trim();
    const snippet = String((it as any)?.snippet ?? (it as any)?.summary ?? "").trim();

    if (!url || !title) continue;
    if (isAlreadyPosted(url)) continue;

    return { url, title, source, snippet };
  }
  return null;
}

function normalizeThreadToTexts(threadObj: any): string[] {
  const raw = threadObj?.thread ?? threadObj;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x: any) => (typeof x === "string" ? x : x?.text))
    .map((t: any) => String(t ?? "").trim())
    .filter(Boolean);
}

export async function runOnce(dryRun = true): Promise<RunResult> {
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
    console.log("⚠ Daily limit reached. Skipping.");
    result.errors.push("Daily limit reached");
    return result;
  }

  // Do NOT test X connection in dry-run
  if (!dryRun) {
    console.log("\n🔗 Testing X connection...");
    const me = await testConnection();
    if (!me) {
      result.errors.push("X API connection failed");
      return result;
    }
  }

  console.log("\n📡 Fetching RSS feeds...");
  const items = await fetchAllFeeds();

  if (!items || items.length === 0) {
    console.log("\n⚠ No new items to post");
    result.errors.push("No new items");
    result.success = true;
    return result;
  }

  const selected = pickFirstValid(items);
  if (!selected) {
    console.log("\n⚠ No suitable item found");
    result.errors.push("No suitable item");
    result.success = true;
    return result;
  }

  console.log(`\n📰 Selected: "${selected.title.slice(0, 60)}..."`);
  console.log(`   Source: ${selected.source}`);
  console.log(`   URL: ${selected.url}`);

  let threadObj: any;
  try {
    threadObj = await generateThreadWithClaude({
      source: selected.source,
      title: selected.title,
      url: selected.url,
      snippet: selected.snippet,
    });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`\n✗ Thread generation failed: ${msg}`);
    result.errors.push(`Claude error: ${msg}`);
    return result;
  }

  if (threadObj?.skip) {
    console.log(`\n⚠ Skipping: ${threadObj.skip_reason}`);
    result.errors.push(`Skipped: ${threadObj.skip_reason}`);
    result.success = true;
    return result;
  }

  const texts = normalizeThreadToTexts(threadObj);

  console.log("\n📝 Thread preview:");
  texts.forEach((t, i) => console.log(`   ${i + 1}. ${t.slice(0, 120)}${t.length > 120 ? "…" : ""}`));

  // IMPORTANT: x.ts must enforce dryRun + (X_LIVE && --live) safeguards
  const postResult = await postThread(texts, dryRun);

  if (postResult.success) {
    const actuallyPosted = !["safe-mode", "dry-run"].includes(postResult.tweetIds?.[0] ?? "");
    if (actuallyPosted) {
      markPosted({
        url: selected.url,
        title: selected.title,
        source: selected.source,
        tweetId: postResult.tweetIds[0],
        tweetIds: postResult.tweetIds,
      });
      console.log(`\n✅ Thread posted successfully!`);
      console.log(`   View: https://x.com/i/status/${postResult.tweetIds[0]}`);
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
  const args = process.argv.slice(2);
  const live = args.includes("--live") || args.includes("-l");
  const dryRun = args.includes("--dry-run") || args.includes("-d") || !live;

  try {
    const r = await runOnce(dryRun);
    process.exit(r.success ? 0 : 1);
  } catch (e) {
    console.error("\n💥 Fatal:", (e as Error)?.message ?? e);
    process.exit(1);
  }
}

main();
