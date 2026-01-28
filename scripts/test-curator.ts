#!/usr/bin/env node
/**
 * Test Script for Editorial Curator
 * Run: node scripts/test-curator.ts
 */

import { curateCandidates, formatCuratorLog, type FeedItem } from "../src/curator.js";

// ============ TEST CASES ============
const testCases = [
  {
    name: "Mixed content (crypto, sports, Venezuela, Iran)",
    items: [
      {
        source: "Crypto News",
        title: "Bitcoin reaches new ATH - viral trading signals",
        link: "https://cryptonews.com/bitcoin-ath",
        snippet: "Video shows how to make money fast with crypto NFT trading"
      },
      {
        source: "Sports World",
        title: "Messi scores amazing goal in PSG match",
        link: "https://sportnews.com/messi-goal",
        snippet: "Argentine footballer scores during Paris Saint-Germain game"
      },
      {
        source: "Reuters",
        title: "Venezuela's Maduro announces new economic sanctions regime",
        link: "https://reuters.com/venezuela-sanctions",
        snippet:
          "Caracas implements currency controls amid international pressure"
      },
      {
        source: "Al Jazeera",
        title: "Iran nuclear talks resume with international mediators",
        link: "https://aljazeera.com/iran-nuclear-talks",
        snippet:
          "Tehran negotiates with IAEA inspectors on nuclear program compliance"
      },
      {
        source: "BBC",
        title: "US Pentagon announces new military support for Taiwan",
        link: "https://bbc.com/taiwan-military-aid",
        snippet: "Washington increases defense commitments in response to China tensions"
      }
    ],
    expected: "should pick Venezuela or Iran (geopolitics)"
  },
  {
    name: "Regional diversity check",
    items: [
      {
        source: "Reuters",
        title: "Cuba restricts internet access amid protests",
        link: "https://reuters.com/cuba-internet",
        snippet: "La Habana blocks social media during demonstrations"
      },
      {
        source: "BBC",
        title: "Venezuela economy shrinks further",
        link: "https://bbc.com/venezuela-economy",
        snippet: "Caracas faces economic collapse"
      },
      {
        source: "DW",
        title: "Iran missile test concerns US officials",
        link: "https://dw.com/iran-missile",
        snippet: "Tehran demonstrates new ballistic missile capability"
      }
    ],
    expected: "should pick Iran (different region)"
  },
  {
    name: "Only non-geo content",
    items: [
      {
        source: "Celebrity News",
        title: "Popular actor wins Oscar award",
        link: "https://celebnews.com/oscar",
        snippet: "Influencer celebrates Hollywood achievement"
      },
      {
        source: "Crypto Today",
        title: "NFT collection sells for millions",
        link: "https://crypto.com/nft-sale",
        snippet: "Viral digital art breaks records"
      }
    ],
    expected: "should pick best of non-geo (fail-open)"
  }
];

async function runTests() {
  console.log("\n" + "=".repeat(70));
  console.log("📋 CURATOR TEST SUITE");
  console.log("=".repeat(70) + "\n");

  for (const testCase of testCases) {
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}`);

    try {
      const result = await curateCandidates(testCase.items, {
        k: 3,
        targetGeoRatio: 0.75,
        debug: true
      });

      const picked = result.picked;
      console.log(`\n   ✅ RESULT`);
      console.log(`   Picked: "${picked.title.slice(0, 50)}..."`);
      console.log(`   Bucket: ${picked.bucket}`);
      console.log(`   Region: ${picked.region}`);
      console.log(`   Score: ${picked.score}`);
      console.log(`   Tags: [${picked.tags.join(",")}]`);

      if (result.ranked.length > 1) {
        console.log(`\n   📊 Top 3 Ranked:`);
        result.ranked.slice(0, 3).forEach((r, idx) => {
          console.log(
            `      ${idx + 1}. [${r.score}] ${r.title.slice(0, 40)}... (${r.bucket}/${r.region})`
          );
        });
      }

      console.log(
        `\n   📈 Stats: geo=${(result.stats.geoRatio * 100).toFixed(0)}% (target=${(result.stats.targetGeoRatio * 100).toFixed(0)}%)`
      );
    } catch (err) {
      console.error(`   ❌ ERROR: ${(err as Error).message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ TEST SUITE COMPLETED");
  console.log("=".repeat(70) + "\n");
}

// Run tests
runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
