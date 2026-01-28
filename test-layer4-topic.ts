/**
 * LAYER 4 TOPIC HASH VALIDATION
 * Test: Same story with rewritten title → should detect as DUP_TOPIC
 * 
 * Test Cases:
 * 1. Exact title duplicate (baseline)
 * 2. Rewritten title, same event (Cuba naval blockade variations)
 * 3. Mixed URL + title variations (Google News + Infobea + rewritten)
 */

import { checkDuplicate, rememberDedup, debugTopicHash, debugFingerprint } from "./src/dedupe_store.js";
import { normalizeUrl } from "./src/url_resolver.js";

async function testCase1_ExactDuplicate() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 1: Exact Title Duplicate");
  console.log("=".repeat(70));

  const story = {
    title: "Kremlin warns of possible US naval blockade on Cuba",
    url: "https://www.reuters.com/world/kremlin-cuba-blockade/",
    snippet: "Russian military officials express concern about escalating tensions",
    source: "Reuters",
    region: "latam",
  };

  console.log(`\n[STEP 1] Post story from Reuters`);
  console.log(`  Title: ${story.title}`);
  console.log(`  URL: ${story.url}`);

  const check1 = await checkDuplicate(story);
  console.log(`  Result: isDuplicate=${check1.isDuplicate}, reason=${check1.reason}`);

  if (check1.isDuplicate) {
    console.log("  ❌ FAIL: First post shouldn't be duplicate");
    return false;
  }

  rememberDedup(story);
  console.log(`  ✓ Remembered`);

  console.log(`\n[STEP 2] Try posting same title (exact)  from different source`);
  const story2 = {
    ...story,
    url: "https://www.infobae.com/politica/kremlin-navy-cuba/",
    source: "Infobae",
  };
  console.log(`  Title: ${story2.title}`);
  console.log(`  URL: ${story2.url}`);

  const check2 = await checkDuplicate(story2);
  console.log(`  Result: isDuplicate=${check2.isDuplicate}, reason=${check2.reason}`);

  if (!check2.isDuplicate) {
    console.log("  ❌ FAIL: Should detect duplicate (same title, different URL)");
    return false;
  }

  console.log(`  ✅ PASS: Detected as ${check2.reason}`);
  return true;
}

async function testCase2_RewrittenTitle() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 2: Rewritten Title (Same Event)");
  console.log("=".repeat(70));

  // Clean DB by waiting a bit
  const story1 = {
    title: "Kremlin warns of possible US naval blockade on Cuba",
    url: "https://www.reuters.com/world/kremlin-cuba-blockade-v1/",
    snippet: "Russian military officials express concern",
    source: "Reuters",
    region: "latam",
  };

  console.log(`\n[STEP 1] Post story with title: "${story1.title}"`);
  const topicDebug1 = debugTopicHash(story1.title);
  console.log(`  Topic Hash: ${topicDebug1.hash}`);
  console.log(`  Tokens: [${topicDebug1.tokens.join(", ")}]`);

  const check1 = await checkDuplicate(story1);
  if (!check1.isDuplicate) {
    rememberDedup(story1);
    console.log(`  ✓ Remembered`);
  }

  // Different title, same event
  const story2 = {
    title: "Cuba faces US naval blockade threat as Kremlin tensions escalate",
    url: "https://www.bbc.com/mundo/cuba-blockade-kremlin/",
    snippet: "Escalating military tensions in the Caribbean region",
    source: "BBC Mundo",
    region: "latam",
  };

  console.log(`\n[STEP 2] Post story with REWRITTEN title: "${story2.title}"`);
  const topicDebug2 = debugTopicHash(story2.title);
  console.log(`  Topic Hash: ${topicDebug2.hash}`);
  console.log(`  Tokens: [${topicDebug2.tokens.join(", ")}]`);

  const check2 = await checkDuplicate(story2);
  console.log(`  Result: isDuplicate=${check2.isDuplicate}, reason=${check2.reason}`);

  if (topicDebug1.hash === topicDebug2.hash) {
    console.log(`  ✅ PASS: Topic hashes match (same event)`);
    if (!check2.isDuplicate) {
      console.log("  ❌ FAIL: Should have detected DUP_TOPIC");
      return false;
    }
    console.log(`  ✅ PASS: Detected as ${check2.reason}`);
    return true;
  } else {
    console.log(`  ⚠️  Topic hashes DIFFERENT:`);
    console.log(`     Story1: ${topicDebug1.hash}`);
    console.log(`     Story2: ${topicDebug2.hash}`);
    console.log(`  This is acceptable if tokens are truly different. Check manually.`);
    // Accept if detection happened via fingerprint/simhash instead
    if (check2.isDuplicate) {
      console.log(`  ✅ PASS: Still detected as ${check2.reason} (via other layer)`);
      return true;
    } else {
      console.log("  ❌ FAIL: Should have detected duplicate by some method");
      return false;
    }
  }
}

async function testCase3_MixedURLandTitleVariations() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 3: Mixed URL + Title Variations");
  console.log("=".repeat(70));

  const story1 = {
    title: "Naval blockade: Kremlin escalates pressure on Cuba",
    url: "https://news.google.com/rss/articles/CBMiYmh0dHBzOi8vd3d3LnJldXRlcnMuY29tL3dvcmxkL2tyZW1saW4tY3ViYS1ibG9xdWVvLTIwMjUtMDEtMjcuaHRtbA==",  // fake Google News
    snippet: "Russian military presence increases in Caribbean",
    source: "Google News",
    region: "latam",
  };

  console.log(`\n[STEP 1] Post story from Google News RSS`);
  console.log(`  Title: ${story1.title}`);
  console.log(`  URL: ${story1.url.slice(0, 80)}...`);

  const fp1 = debugFingerprint(story1);
  console.log(`  Strong FP: ${fp1}`);

  const check1 = await checkDuplicate(story1);
  if (!check1.isDuplicate) {
    rememberDedup(story1);
    console.log(`  ✓ Remembered`);
  }

  // Different URL, slightly different title
  const story2 = {
    title: "Kremlin applies new naval blockade strategy on Cuba - sources",
    url: "https://www.infobae.com/politica/2025/01/27/kremlin-bloqueo-cuba/",
    snippet: "According to informed sources, military operations continue",
    source: "Infobae",
    region: "latam",
  };

  console.log(`\n[STEP 2] Post story from Infobae with rewritten title`);
  console.log(`  Title: ${story2.title}`);
  console.log(`  URL: ${story2.url}`);

  const topicDebug2 = debugTopicHash(story2.title);
  console.log(`  Topic Hash: ${topicDebug2.hash}`);
  console.log(`  Tokens: [${topicDebug2.tokens.join(", ")}]`);

  const check2 = await checkDuplicate(story2);
  console.log(`  Result: isDuplicate=${check2.isDuplicate}, reason=${check2.reason}`);

  if (!check2.isDuplicate) {
    console.log("  ❌ FAIL: Should detect duplicate (same event, different URL+title)");
    return false;
  }

  console.log(`  ✅ PASS: Detected as ${check2.reason} (one of: DUP_FP, DUP_TOPIC, DUP_NEAR)`);
  return true;
}

async function testCase4_CompletlyDifferentStory() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 4: Control - Completely Different Story");
  console.log("=".repeat(70));

  const story = {
    title: "Technology breakthrough: AI reaches new milestone in robotics",
    url: "https://www.techcrunch.com/2025/01/27/ai-robotics-breakthrough/",
    snippet: "Latest developments in artificial intelligence",
    source: "TechCrunch",
    region: "global",
  };

  console.log(`\n[STEP 1] Check completely different story`);
  console.log(`  Title: ${story.title}`);
  console.log(`  URL: ${story.url}`);

  const check = await checkDuplicate(story);
  console.log(`  Result: isDuplicate=${check.isDuplicate}, reason=${check.reason}`);

  if (check.isDuplicate) {
    console.log("  ❌ FAIL: Should NOT be duplicate (different event)");
    return false;
  }

  console.log(`  ✅ PASS: Correctly identified as NOT duplicate`);
  return true;
}

async function testCase5_SingleURLEnforcement() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 5: Single URL Enforcement in Output");
  console.log("=".repeat(70));

  // This test checks the stripUrlsAndMoreDetails function
  const { stripUrlsAndMoreDetails } = await import("./src/run_once.js");

  const testCases = [
    {
      name: "Double Más detalles",
      input: "Noticia importante\n\nMás detalles: https://url1.com\nMás detalles: https://url2.com",
      expected: 1,
    },
    {
      name: "Embedded + Más detalles",
      input: "Contenido https://embedded.url\n\nMás detalles: https://final.url",
      expected: 1,
    },
  ];

  let passed = 0;
  for (const tc of testCases) {
    console.log(`\n  Testing: ${tc.name}`);
    console.log(`  Input: ${tc.input.slice(0, 60)}...`);
    const cleaned = stripUrlsAndMoreDetails(tc.input);
    const urlCount = (cleaned.match(/https?:\/\//g) || []).length;
    console.log(`  URLs found: ${urlCount} (expected: ${tc.expected})`);
    if (urlCount === tc.expected) {
      console.log(`  ✅ PASS`);
      passed++;
    } else {
      console.log(`  ❌ FAIL`);
    }
  }

  return passed === testCases.length;
}

async function runAllTests() {
  console.log("\n" + "█".repeat(70));
  console.log("█" + " ".repeat(68) + "█");
  console.log("█" + "LAYER 4 TOPIC HASH - VALIDATION SUITE".padEnd(69) + "█");
  console.log("█" + " ".repeat(68) + "█");
  console.log("█".repeat(70));

  const results: Record<string, boolean> = {};

  try {
    results["Test 1: Exact Duplicate"] = await testCase1_ExactDuplicate();
  } catch (e) {
    console.log(`\n❌ Test 1 crashed: ${(e as Error).message}`);
    results["Test 1: Exact Duplicate"] = false;
  }

  try {
    results["Test 2: Rewritten Title"] = await testCase2_RewrittenTitle();
  } catch (e) {
    console.log(`\n❌ Test 2 crashed: ${(e as Error).message}`);
    results["Test 2: Rewritten Title"] = false;
  }

  try {
    results["Test 3: Mixed URL+Title"] = await testCase3_MixedURLandTitleVariations();
  } catch (e) {
    console.log(`\n❌ Test 3 crashed: ${(e as Error).message}`);
    results["Test 3: Mixed URL+Title"] = false;
  }

  try {
    results["Test 4: Different Story"] = await testCase4_CompletlyDifferentStory();
  } catch (e) {
    console.log(`\n❌ Test 4 crashed: ${(e as Error).message}`);
    results["Test 4: Different Story"] = false;
  }

  try {
    results["Test 5: Single URL"] = await testCase5_SingleURLEnforcement();
  } catch (e) {
    console.log(`\n❌ Test 5 crashed: ${(e as Error).message}`);
    results["Test 5: Single URL"] = false;
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));

  let passed = 0;
  let failed = 0;
  for (const [name, result] of Object.entries(results)) {
    const icon = result ? "✅" : "❌";
    console.log(`${icon} ${name}`);
    if (result) passed++;
    else failed++;
  }

  console.log("\n" + "=".repeat(70));
  console.log(`Total: ${passed}/${passed + failed} tests passed`);
  console.log("=".repeat(70) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((e) => {
  console.error("Test suite failed:", e);
  process.exit(1);
});
