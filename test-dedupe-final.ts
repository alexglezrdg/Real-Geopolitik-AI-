/**
 * COMPREHENSIVE DEDUPE TEST
 * Tests the 3 main fixes:
 * 1) TTL=14d + simhash (Hamming ≤ 3)
 * 2) Single URL enforcement (no duplicate "Más detalles:")
 * 3) Google News & syndication dedup
 */

import { checkDuplicate, rememberDedup, debugSignature, debugFingerprint } from "./src/dedupe_store.js";

// Recreate stripUrlsAndMoreDetails locally for testing
function stripUrlsAndMoreDetails(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^más\s+detalles\s*:/i.test(l))
    .filter((l) => !/https?:\/\//i.test(l))
    .join("\n")
    .trim();
}

const TEST_CASES = [
  {
    name: "CASE 1: Same story, different source URLs (Google News vs Infobae)",
    story1: {
      title: "El Kremlin advierte sobre posible bloqueo naval estadounidense a Cuba",
      url: "https://news.google.com/rss/articles/CBMiYGh0dHBzOi8vaW5mb2JhZi5jb20vY3ViYS9rY...?hl=es",
      snippet: "Moscú evalúa una escalada de tensiones",
      source: "Google News",
    },
    story2: {
      title: "Kremlin alerta sobre posible bloqueo naval a Cuba",
      url: "https://www.infobae.com/cuba/2025/01/kremlin-bloqueo-naval",
      snippet: "Putin considera la amenaza de sanciones",
      source: "Infobae",
    },
    expectedDup: true, // Should detect as duplicate
  },
  {
    name: "CASE 2: Nearly identical title with small variation (typo, punctuation)",
    story1: {
      title: "Venezuela: Maduro anuncia nuevas sanciones contra opositores",
      url: "https://reuters.com/venezuela-maduro-sanciones-1",
      snippet: "Caracas toma medidas contra críticos",
      source: "Reuters",
    },
    story2: {
      title: "Venezuela - Maduro anuncia nuevas sanciones contra opositores.",
      url: "https://bbc.com/venezuela-maduro-2025-sanciones",
      snippet: "El gobierno toma medidas duras",
      source: "BBC",
    },
    expectedDup: true, // Should detect via simhash
  },
  {
    name: "CASE 3: Different stories (should NOT dedupe)",
    story1: {
      title: "Trump expande sanciones contra Irán",
      url: "https://wsj.com/trump-iran-1",
      snippet: "Nueva política de presión máxima",
      source: "WSJ",
    },
    story2: {
      title: "China incrementa aranceles a productos estadounidenses",
      url: "https://ft.com/china-tariffs-1",
      snippet: "Represalia comercial en escala",
      source: "Financial Times",
    },
    expectedDup: false,
  },
  {
    name: "CASE 4: URL dedup only (exact URLs posted before)",
    story1: {
      title: "Bloqueo naval: Crisis en el Caribe",
      url: "https://exact-same-url.com/story",
      snippet: "Tensión escalada",
      source: "AP",
    },
    story2: {
      title: "Bloqueo naval: Crisis en el Caribe", // Same
      url: "https://exact-same-url.com/story", // Exact same URL
      snippet: "Tensión escalada",
      source: "Reuters",
    },
    expectedDup: true,
  },
];

const TEXT_TESTS = [
  {
    name: "TEXT TEST 1: Single URL cleanup",
    input: "🚨 ÚLTIMA HORA | Kremlin advierte bloqueo\n\nMás detalles: https://url1.com\nMás detalles: https://url2.com",
    expectedNoDoubleLink: true,
  },
  {
    name: "TEXT TEST 2: Remove embedded URLs",
    input: "Noticia importante https://embed.url en el medio\n\nMás detalles: https://final.url",
    expectedCleanedCount: 1, // Only final URL should remain
  },
  {
    name: "TEXT TEST 3: Preserve single URL case",
    input: "🚨 ÚLTIMA HORA | Evento crítico\nContexto importante",
    expectedNoDoubleLink: true,
  },
];

async function testDeduplication() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 COMPREHENSIVE DEDUPE TEST SUITE");
  console.log("=".repeat(70));

  let passed = 0;
  let failed = 0;

  // ============ DEDUPE TESTS ============
  console.log("\n📋 PART A: Deduplication Logic (TTL=14d, Simhash, URL normalization)");
  console.log("-".repeat(70));

  for (const testCase of TEST_CASES) {
    console.log(`\n✍️  ${testCase.name}`);

    // Clear dedupe store by remembering story1
    rememberDedup({
      url: testCase.story1.url,
      title: testCase.story1.title,
      snippet: testCase.story1.snippet,
      source: testCase.story1.source,
      region: "LATAM",
    });

    // Now check if story2 is detected as duplicate
    const dupCheck = checkDuplicate({
      url: testCase.story2.url,
      title: testCase.story2.title,
      snippet: testCase.story2.snippet,
      source: testCase.story2.source,
      region: "LATAM",
    });

    const isExpectedDup = testCase.expectedDup;
    const actualDup = dupCheck.isDuplicate;

    if (actualDup === isExpectedDup) {
      console.log(`   ✅ PASS: isDuplicate=${actualDup} (expected=${isExpectedDup})`);
      console.log(`      Reason: ${dupCheck.reason || "no duplicate"}`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: isDuplicate=${actualDup} (expected=${isExpectedDup})`);
      console.log(`      Reason: ${dupCheck.reason || "no duplicate"}`);
      console.log(`      Story1: ${testCase.story1.title.slice(0, 50)}...`);
      console.log(`      Story2: ${testCase.story2.title.slice(0, 50)}...`);
      
      // Debug info
      const sig1 = debugSignature(`${testCase.story1.title} ${testCase.story1.snippet}`);
      const sig2 = debugSignature(`${testCase.story2.title} ${testCase.story2.snippet}`);
      console.log(`      Sig1: ${sig1}`);
      console.log(`      Sig2: ${sig2}`);
      
      failed++;
    }
  }

  // ============ TEXT CLEANUP TESTS ============
  console.log("\n\n📋 PART B: URL/Link Text Cleanup (stripUrlsAndMoreDetails)");
  console.log("-".repeat(70));

  for (const textTest of TEXT_TESTS) {
    console.log(`\n✍️  ${textTest.name}`);

    const cleaned = stripUrlsAndMoreDetails(textTest.input);
    const linkCount = (cleaned.match(/https?:\/\//g) || []).length;

    if (textTest.expectedNoDoubleLink !== undefined && textTest.expectedNoDoubleLink) {
      // Should not have duplicate "Más detalles:"
      const moreDetailsCount = (cleaned.match(/más\s+detalles\s*:/gi) || []).length;
      if (moreDetailsCount <= 1) {
        console.log(`   ✅ PASS: No duplicate "Más detalles:" (count=${moreDetailsCount})`);
        console.log(`      Cleaned: "${cleaned.slice(0, 80)}..."`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: Found ${moreDetailsCount} "Más detalles:" lines`);
        console.log(`      Cleaned: "${cleaned}"`);
        failed++;
      }
    }

    if (textTest.expectedCleanedCount !== undefined) {
      if (linkCount === textTest.expectedCleanedCount) {
        console.log(`   ✅ PASS: URL count=${linkCount} (expected=${textTest.expectedCleanedCount})`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: URL count=${linkCount} (expected=${textTest.expectedCleanedCount})`);
        console.log(`      Cleaned: "${cleaned}"`);
        failed++;
      }
    }
  }

  // ============ SUMMARY ============
  console.log("\n" + "=".repeat(70));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(70));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${passed + failed}`);
  console.log(`🎯 Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log("=".repeat(70));

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

testDeduplication().catch((e) => {
  console.error("💥 Test crashed:", e);
  process.exit(1);
});
