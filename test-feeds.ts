/**
 * Test RSS Feed URLs
 * Validate which sources work and which don't
 */

import { NEWS_SOURCES } from "./src/news_sources.js";
import Parser from "rss-parser";

const parser = new Parser();

async function testFeeds() {
  console.log("\n🔍 TESTING RSS FEEDS...");
  console.log("=".repeat(70));

  const working = [];
  const failed = [];

  for (const source of NEWS_SOURCES.slice(0, 30)) {
    try {
      console.log(`⏳ Testing: ${source.name}...`);
      const feed = await Promise.race([
        parser.parseURL(source.url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 5000)
        )
      ]);

      const itemCount = (feed.items || []).length;
      console.log(`   ✅ OK - ${itemCount} items`);
      working.push({ name: source.name, items: itemCount, url: source.url });
    } catch (error) {
      const msg = (error as any).message || "UNKNOWN ERROR";
      console.log(`   ❌ FAILED - ${msg}`);
      failed.push({ name: source.name, error: msg, url: source.url });
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`✅ WORKING (${working.length}):`);
  working.forEach(f => console.log(`   - ${f.name}: ${f.items} items`));

  console.log(`\n❌ FAILED (${failed.length}):`);
  failed.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
}

testFeeds();
