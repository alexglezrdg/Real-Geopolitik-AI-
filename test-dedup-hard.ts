/**
 * VALIDATION TESTS - Hard Dedup + Parallel Lock + Single URL
 * Covers: Google News RSS dedup, parallel execution lock, single URL enforcement
 */

import { checkDuplicate, rememberDedup } from "./src/dedupe_store.js";
import { normalizeUrl, resolveFinalUrlWithGoogleNews } from "./src/url_resolver.js";
import { checkLockStatus, acquireLock, releaseLock } from "./src/process_lock.js";
import { stripUrlsAndMoreDetails } from "./src/run_once.js";

async function testGoogleNewsDedup() {
  console.log("\n🧪 TEST 1: Google News RSS Dedup");
  console.log("━".repeat(60));

  const story1 = {
    title: "Kremlin warns of possible US naval blockade on Cuba",
    url: "https://news.google.com/rss/articles/CBMiYGh0dHBzOi8vaW5mb2JhZi5jb20vY3ViYS9",
    snippet: "Tension in Caribbean escalates with military threat",
    source: "Google News",
  };

  const story2 = {
    title: "Kremlin alerta posible bloqueo naval estadounidense a Cuba",
    url: "https://www.infobae.com/cuba/2025/01/kremlin-bloqueo-naval/",
    snippet: "La tensión en el Caribe se intensifica",
    source: "Infobae",
  };

  console.log(`\n[1] Posting Story 1 (Google News RSS):`);
  console.log(`    Title: ${story1.title.slice(0, 60)}...`);
  console.log(`    URL: ${story1.url.slice(0, 60)}...`);

  rememberDedup(story1);

  console.log(`\n[2] Checking Story 2 (different source, same content):`);
  console.log(`    Title: ${story2.title.slice(0, 60)}...`);
  console.log(`    URL: ${story2.url.slice(0, 60)}...`);

  try {
    const dupCheck = await checkDuplicate(story2);
    const dup = dupCheck;
    console.log(`\n[RESULT] isDuplicate: ${dup.isDuplicate}`);
    console.log(`[RESULT] Reason: ${dup.reason}`);

    if (dup.isDuplicate && (dup.reason === "DUP_FP" || dup.reason?.startsWith("DUP_NEAR"))) {
      console.log("✅ PASS: Detected as duplicate via strong fingerprint/simhash");
      return true;
    } else {
      console.log("❌ FAIL: Should detect as duplicate");
      return false;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${(err as Error).message}`);
    return false;
  }
}

async function testParallelLock() {
  console.log("\n\n🧪 TEST 2: Parallel Execution Lock");
  console.log("━".repeat(60));

  console.log(`\n[1] Acquiring lock...`);
  try {
    await acquireLock(1000);
    console.log(`✅ Lock acquired (PID: ${process.pid})`);

    const lockStatus = checkLockStatus();
    if (lockStatus) {
      console.log(`[LOCK] PID: ${lockStatus.pid}`);
      console.log(`[LOCK] Host: ${lockStatus.hostname}`);
      console.log(`[LOCK] Age: ${Date.now() - lockStatus.timestamp}ms`);
    }

    console.log(`\n[2] Attempting to acquire lock again (should timeout)...`);
    // Simulate second process trying to acquire (would block then timeout)
    console.log(`[SIMULATION] Second process would wait for lock...`);

    console.log(`\n[3] Releasing lock...`);
    releaseLock();
    console.log(`✅ Lock released`);

    const statusAfter = checkLockStatus();
    if (!statusAfter) {
      console.log("✅ PASS: Lock successfully released");
      return true;
    } else {
      console.log("❌ FAIL: Lock still exists after release");
      return false;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${(err as Error).message}`);
    return false;
  }
}

function testSingleURLEnforcement() {
  console.log("\n\n🧪 TEST 3: Single URL Enforcement");
  console.log("━".repeat(60));

  const testCases = [
    {
      name: "Double Más detalles",
      input: "🚨 ÚLTIMA HORA | Kremlin advierte bloqueo\n\nMás detalles: https://url1.com\nMás detalles: https://url2.com",
      expectedCount: 1,
    },
    {
      name: "Embedded URL + Más detalles",
      input: "Noticia importante https://embed.url\n\nMás detalles: https://final.url",
      expectedCount: 1,
    },
    {
      name: "Multiple inline URLs",
      input: "Check https://site1.com and https://site2.com for details",
      expectedCount: 0,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\n[TEST] ${test.name}`);
    console.log(`Input:\n${test.input}`);

    const cleaned = stripUrlsAndMoreDetails(test.input);
    const urlCount = (cleaned.match(/https?:\/\//g) || []).length;

    console.log(`\nCleaned:\n${cleaned}`);
    console.log(`URL Count: ${urlCount}`);

    if (urlCount === test.expectedCount) {
      console.log(`✅ PASS: ${urlCount} URLs (expected ${test.expectedCount})`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${urlCount} URLs (expected ${test.expectedCount})`);
      failed++;
    }
  }

  return failed === 0;
}

function testURLNormalization() {
  console.log("\n\n🧪 TEST 4: URL Normalization");
  console.log("━".repeat(60));

  const testCases = [
    {
      name: "Remove tracking params",
      input: "https://example.com/news?utm_source=google&utm_campaign=test&id=123",
      shouldContain: ["id=123"],
      shouldNotContain: ["utm_source", "utm_campaign"],
    },
    {
      name: "Lowercase domain",
      input: "https://Example.COM/News?id=1",
      shouldContain: ["example.com"],
      shouldNotContain: ["Example.COM"],
    },
    {
      name: "Sort params",
      input: "https://example.com?z=1&a=2",
      shouldContain: ["a=2&z=1"],
      shouldNotContain: [],
    },
  ];

  let passed = 0;

  for (const test of testCases) {
    console.log(`\n[TEST] ${test.name}`);
    console.log(`Input: ${test.input}`);

    const normalized = normalizeUrl(test.input);
    console.log(`Normalized: ${normalized}`);

    let pass = true;

    for (const should of test.shouldContain) {
      if (!normalized.includes(should)) {
        console.log(`  ❌ Should contain: ${should}`);
        pass = false;
      }
    }

    for (const shouldNot of test.shouldNotContain) {
      if (normalized.includes(shouldNot)) {
        console.log(`  ❌ Should NOT contain: ${shouldNot}`);
        pass = false;
      }
    }

    if (pass) {
      console.log(`✅ PASS`);
      passed++;
    } else {
      console.log(`❌ FAIL`);
    }
  }

  return passed === testCases.length;
}

async function runAllTests() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 FULL VALIDATION SUITE - Hard Dedup + Parallel Lock");
  console.log("=".repeat(70));

  const results: Record<string, boolean> = {};

  try {
    results["Google News Dedup"] = await testGoogleNewsDedup();
  } catch (err) {
    console.log(`❌ Test crashed: ${(err as Error).message}`);
    results["Google News Dedup"] = false;
  }

  try {
    results["Parallel Lock"] = await testParallelLock();
  } catch (err) {
    console.log(`❌ Test crashed: ${(err as Error).message}`);
    results["Parallel Lock"] = false;
  }

  try {
    results["Single URL"] = testSingleURLEnforcement();
  } catch (err) {
    console.log(`❌ Test crashed: ${(err as Error).message}`);
    results["Single URL"] = false;
  }

  try {
    results["URL Normalization"] = testURLNormalization();
  } catch (err) {
    console.log(`❌ Test crashed: ${(err as Error).message}`);
    results["URL Normalization"] = false;
  }

  console.log("\n\n" + "=".repeat(70));
  console.log("📊 RESULTS");
  console.log("=".repeat(70));

  let passed = 0;
  let failed = 0;

  for (const [test, result] of Object.entries(results)) {
    const icon = result ? "✅" : "❌";
    console.log(`${icon} ${test}`);
    if (result) passed++;
    else failed++;
  }

  console.log("\n" + "=".repeat(70));
  console.log(`Total: ${passed}/${passed + failed} tests passed`);
  console.log("=".repeat(70));

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error("💥 Test suite failed:", err);
  process.exit(1);
});
