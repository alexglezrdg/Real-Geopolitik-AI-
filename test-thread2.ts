/**
 * TEST: Thread2 con validación de similitud
 * Verifica que:
 * 1. Se genera thread2 correctamente
 * 2. Se valida similitud entre T1 y T2
 * 3. Se degrada a single si hay >35% overlap
 */

import "dotenv/config";
import { generateThreadWithClaude } from "./src/claude.js";

// Test case 1: Noticia con info suficiente para thread2
const testCase1 = {
  title: "Trump afirma que Irán busca acuerdo con Estados Unidos mientras despliega 'gran armada' naval en la región.",
  url: "https://jornada.com.mx/2026/01/27/mundo/ejemplo",
  source: "La Jornada",
  snippet: "El presidente Donald Trump afirmó el lunes que Irán busca un acuerdo con Estados Unidos. Axios informó que la armada iraní es 'más grande que la de Venezuela', según reportes desde Dubái.",
};

// Test case 2: Noticia con poca info (debería ser single)
const testCase2 = {
  title: "Reunión bilateral entre Francia y Alemania",
  url: "https://example.com/reunion",
  source: "Reuters",
  snippet: "Los líderes de Francia y Alemania se reunieron hoy en París.",
};

async function runTest(testCase: any, testName: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`🧪 TEST: ${testName}`);
  console.log("=".repeat(60));
  console.log(`Title: ${testCase.title}`);
  console.log(`Snippet: ${testCase.snippet}\n`);

  try {
    const result = await generateThreadWithClaude(testCase);
    
    console.log(`\n✅ Result:`);
    console.log(`Mode: ${result.mode}`);
    console.log(`Urgency: ${result.urgency_tag}`);
    console.log(`Hashtags: ${result.topic_hashtags.join(", ")}`);
    console.log(`\n📝 Tweet 1 (${result.tweet.text.length} chars):`);
    console.log(result.tweet.text);
    
    if (result.thread && result.thread.length > 0) {
      result.thread.forEach((t, i) => {
        console.log(`\n📝 Tweet ${i + 2} (${t.text.length} chars):`);
        console.log(t.text);
      });
    }
    
    console.log(`\n🖼️  Visual:`);
    console.log(`Headline: ${result.visual.headline}`);
    console.log(`Subheadline: ${result.visual.subheadline}`);
    
    // Validación manual de similitud
    if (result.mode === "thread2" || result.mode === "thread3") {
      const t1Words = new Set(result.tweet.text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const t2Words = new Set(result.thread[0].text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const intersection = new Set([...t1Words].filter(x => t2Words.has(x)));
      const union = new Set([...t1Words, ...t2Words]);
      const similarity = union.size === 0 ? 0 : intersection.size / union.size;
      
      console.log(`\n📊 Similitud T1↔T2: ${(similarity * 100).toFixed(1)}%`);
      if (similarity > 0.35) {
        console.log(`⚠️  ADVERTENCIA: Similitud alta (>${35}%). Debería degradar a single.`);
      } else {
        console.log(`✅ Similitud aceptable (<=${35}%)`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

async function main() {
  console.log("\n🚀 Testing Thread2 con validación de similitud\n");
  
  await runTest(testCase1, "Noticia con contenido para thread2");
  await runTest(testCase2, "Noticia simple (debería ser single)");
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Tests completados");
  console.log("=".repeat(60));
}

main().catch(console.error);
