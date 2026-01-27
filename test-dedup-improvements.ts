/**
 * Test script for improved deduplication system
 * Tests:
 * 1. Topic hash deduplication with similar news
 * 2. DALL-E image generation without visible text
 * 3. New RSS sources availability
 */

import "dotenv/config";
import { buildTopicHash, debugTopicHash, checkDuplicate, rememberDedup, isTopicOnCooldown, recordTopicPosted } from "./src/dedupe_store.js";
import { NEWS_SOURCES } from "./src/news_sources.js";
import { generateNewsImage } from "./src/openai_image.js";
import type { VisualMetadata } from "./src/claude.js";

// ============ TEST 1: TOPIC HASH DEDUPLICATION ============
console.log("\n🧪 TEST 1: Topic Hash Deduplication");
console.log("=" .repeat(70));

const cubaNews = [
  "Rusia en estado de alarma por reportes de posible bloqueo naval estadounidense a Cuba",
  "Russia cataloga de alarmante posible bloqueo naval de EEUU para cambiar el régimen en Cuba",
  "EEUU considera bloqueo naval a Cuba según fuentes del Kremlin",
  "Kremlin advierte sobre bloqueo naval estadounidense a Cuba",
  "Cuba: Rusia denuncia posible bloqueo naval de Estados Unidos"
];

console.log("\n📊 Testing topic hash for Cuba/Russia blockade news:");
const hashes = cubaNews.map((title, idx) => {
  const debug = debugTopicHash(title);
  console.log(`\n[${idx + 1}] "${title.slice(0, 60)}..."`);
  console.log(`    Hash: ${debug.hash}`);
  console.log(`    Tokens: ${debug.tokens.slice(0, 8).join(", ")}`);
  return debug.hash;
});

// Check if all hashes are the same (they should be for duplicate topics)
const uniqueHashes = new Set(hashes);
console.log(`\n✅ Result: ${uniqueHashes.size} unique hash(es) from ${hashes.length} titles`);
if (uniqueHashes.size === 1) {
  console.log("✅ PASS: All similar Cuba news have the same topic hash (will be deduplicated)");
} else {
  console.log(`⚠️  PARTIAL: ${uniqueHashes.size} different hashes detected. May still catch some duplicates.`);
}

// ============ TEST 2: DUPLICATE CHECK ============
console.log("\n\n🧪 TEST 2: Duplicate Check System");
console.log("=".repeat(70));

async function testDuplicateDetection() {
  const testArticles = [
    {
      url: "https://test.com/cuba-blockade-1",
      title: cubaNews[0],
      snippet: "Washington podría estar preparando una escalada en el Caribe",
      source: "Test Source 1"
    },
    {
      url: "https://test.com/cuba-blockade-2",
      title: cubaNews[1],
      snippet: "La señal real es que Washington podría escalar en el Caribe",
      source: "Test Source 2"
    }
  ];

  console.log("\n📝 Testing first article...");
  const check1 = await checkDuplicate(testArticles[0]);
  console.log(`   Result: ${check1.isDuplicate ? `DUPLICATE (${check1.reason})` : "NOT DUPLICATE"}`);
  
  if (!check1.isDuplicate) {
    console.log("   📌 Remembering article 1...");
    rememberDedup(testArticles[0]);
    
    const topicHash = buildTopicHash(testArticles[0].title);
    recordTopicPosted({
      topic_hash: topicHash,
      title: testArticles[0].title,
      url: testArticles[0].url
    });
  }

  console.log("\n📝 Testing second article (similar topic)...");
  const check2 = await checkDuplicate(testArticles[1]);
  console.log(`   Result: ${check2.isDuplicate ? `DUPLICATE (${check2.reason})` : "NOT DUPLICATE"}`);
  
  if (check2.isDuplicate) {
    console.log("✅ PASS: Second article correctly detected as duplicate");
  } else {
    console.log("⚠️  FAIL: Second article should be detected as duplicate");
  }

  // Check topic cooldown
  const topicHash = buildTopicHash(testArticles[1].title);
  const onCooldown = await isTopicOnCooldown(topicHash);
  console.log(`   Topic cooldown check: ${onCooldown ? "ON COOLDOWN ✅" : "NOT ON COOLDOWN"}`);
}

await testDuplicateDetection();

// ============ TEST 3: NEW RSS SOURCES ============
console.log("\n\n🧪 TEST 3: RSS Sources");
console.log("=".repeat(70));

console.log(`\n📡 Total RSS sources: ${NEWS_SOURCES.length}`);
console.log("\n📊 Sources by region:");
const byRegion = NEWS_SOURCES.reduce((acc, src) => {
  acc[src.region] = (acc[src.region] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

for (const [region, count] of Object.entries(byRegion)) {
  console.log(`   ${region.toUpperCase()}: ${count} sources`);
}

console.log("\n🆕 Recent additions (last 10):");
NEWS_SOURCES.slice(-10).forEach((src, idx) => {
  console.log(`   [${NEWS_SOURCES.length - 10 + idx + 1}] ${src.name} (${src.region}) - ${src.url.slice(0, 50)}...`);
});

// ============ TEST 4: IMAGE GENERATION (OPTIONAL) ============
console.log("\n\n🧪 TEST 4: Image Generation (Optional - Requires OPENAI_API_KEY)");
console.log("=".repeat(70));

const IMAGE_LIVE = process.env.IMAGE_LIVE === "1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!IMAGE_LIVE) {
  console.log("⏭️  SKIP: IMAGE_LIVE is not enabled (set IMAGE_LIVE=1 to test)");
} else if (!OPENAI_API_KEY) {
  console.log("⏭️  SKIP: OPENAI_API_KEY not set");
} else {
  console.log("\n🎨 Testing image generation with improved prompt...");
  console.log("   Topic: Cuba naval blockade scenario");
  
  const testVisual: VisualMetadata = {
    format: "9:16",
    header: "ÚLTIMA HORA",
    headline: "RUSIA ADVIERTE BLOQUEO NAVAL A CUBA",
    subheadline: "Kremlin cataloga de alarmante posible escalada de EEUU",
    source_line: "Fuentes: BBC Mundo, RFI",
    date_line: `Fecha: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    image_brief: "Caribbean waters, US naval vessels approaching Cuba, Cuban flag visible, dramatic stormy sky, cinematic wide shot, photojournalistic style",
    style_rules: ["Alto contraste", "Paleta: azul oceánico, rojo, dramático"]
  };

  try {
    const imagePath = await generateNewsImage(
      testVisual,
      "https://test.com/cuba-blockade",
      { filename: "test-cuba-blockade.png" }
    );
    
    if (imagePath) {
      console.log(`✅ Image generated successfully: ${imagePath}`);
      console.log("   ℹ️  Check the image to verify NO text appears in the generated image");
      console.log("   ℹ️  All text should be added as overlay, not baked into DALL-E output");
    } else {
      console.log("❌ Image generation returned null");
    }
  } catch (error) {
    console.error(`❌ Image generation error: ${(error as Error).message}`);
  }
}

// ============ SUMMARY ============
console.log("\n\n" + "=".repeat(70));
console.log("📋 SUMMARY OF IMPROVEMENTS");
console.log("=".repeat(70));
console.log(`
✅ Topic hash deduplication: Enhanced with more tokens (12) and bigrams (6)
✅ Topic cooldown: Reduced from 72h to 48h for faster topic rotation
✅ DALL-E prompt: Strengthened NO TEXT rules to prevent visible prompt text
✅ RSS sources: Added ${NEWS_SOURCES.length} sources (includes diverse LatAm + global feeds)

🔧 CONFIGURATION:
   - TOPIC_COOLDOWN_HOURS: 48 (env override available)
   - DEDUPE_TTL_DAYS: 14 days
   - Topic hash uses: top 12 tokens + top 6 bigrams
   - New RSS sources: TeleSUR, Mexico News Daily, Brasil Wire, EFE, ANSA, RT, Sputnik, SCMP, CGTN

📝 NEXT STEPS:
   1. Monitor autoposts for duplicate Cuba/Russia news
   2. Check generated images for any visible text artifacts
   3. Verify diverse news topics from new sources
   4. Adjust TOPIC_COOLDOWN_HOURS if needed (env: TOPIC_COOLDOWN_HOURS=24)
`);
