/**
 * TEST: Validación post-proceso de placeholders y frases cortadas
 * Verifica que el sistema detecta y rechaza tweets con errores
 */

import "dotenv/config";
import { generateThreadWithClaude } from "./src/claude.js";

// Test case 1: Noticia real de Petro/Maduro que debería usar portrait
const testPetroMaduro = {
  title: "Gustavo Petro afirmó este martes que Estados Unidos debe devolver a Nicolás Maduro a Venezuela y criticó el ataque militar del pasado 3 de enero en Caracas",
  url: "https://example.com/petro-maduro",
  source: "El Tiempo",
  snippet: `El presidente de Colombia, Gustavo Petro, reiteró su posición sobre la situación 
  venezolana y exigió a Washington que respete la soberanía del país vecino. Maduro agradeció 
  públicamente el apoyo del mandatario colombiano. La declaración se produce en medio de 
  crecientes tensiones entre Caracas y Washington por sanciones económicas.`,
};

// Test case 2: Noticia que debe rechazar plantillas genéricas
const testGenerico = {
  title: "Reunión entre líderes latinoamericanos",
  url: "https://example.com/reunion",
  source: "Reuters",
  snippet: "Los presidentes discutieron temas de interés regional",
};

async function testValidation(testCase: any, testName: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`🧪 TEST: ${testName}`);
  console.log("=".repeat(80));
  console.log(`Title: ${testCase.title.slice(0, 100)}...`);
  console.log(`Snippet: ${testCase.snippet.slice(0, 100)}...\n`);

  try {
    const result = await generateThreadWithClaude(testCase);
    
    console.log(`\n✅ Resultado:`);
    console.log(`Mode: ${result.mode}`);
    console.log(`Urgency: ${result.urgency_tag}`);
    console.log(`Hashtags: ${result.topic_hashtags.join(", ")}`);
    
    // Verificar todos los tweets
    const allTweets = [result.tweet.text, ...result.thread.map(t => t.text)];
    
    console.log(`\n📝 Tweets generados:`);
    allTweets.forEach((tweet, i) => {
      console.log(`\nT${i+1} (${tweet.length} chars):`);
      console.log(tweet);
      
      // Validaciones
      const errors: string[] = [];
      
      // Check 1: Frases cortadas
      if (/(\s+(en|y|con|de|para|a|o)\s*|[:,]\s*)$/.test(tweet)) {
        errors.push("❌ FRASE CORTADA (termina en preposición/puntuación)");
      }
      
      // Check 2: Placeholders
      if (/actor\s+[AB]/i.test(tweet)) {
        errors.push('❌ PLACEHOLDER: "actor A/B"');
      }
      if (/impacto\s+regional(?!\s+específico)/i.test(tweet)) {
        errors.push('❌ PLACEHOLDER: "impacto regional"');
      }
      if (/alianzas\s+en\s+juego/i.test(tweet)) {
        errors.push('❌ PLACEHOLDER: "alianzas en juego"');
      }
      if (/A\/B:/i.test(tweet)) {
        errors.push('❌ PLACEHOLDER: "A/B:"');
      }
      if (/Seguridad:\s*impacto|Economía:\s*presión|Política:\s*alianzas/i.test(tweet)) {
        errors.push('❌ PLANTILLA GENÉRICA: "Seguridad:/Economía:/Política:"');
      }
      
      // Check 3: "Qué vigilar" genérico
      if (/qué vigilar/i.test(tweet) && !/si.*confirma|si.*responde|próximos.*días|semana/i.test(tweet)) {
        errors.push('⚠️  "Qué vigilar" posiblemente genérico (sin triggers concretos)');
      }
      
      if (errors.length > 0) {
        console.log(`\n🚨 ERRORES DETECTADOS en T${i+1}:`);
        errors.forEach(err => console.log(`   ${err}`));
      } else {
        console.log(`✅ Sin errores de validación`);
      }
    });
    
    // Check visual
    console.log(`\n🖼️  Visual:`);
    console.log(`Headline: ${result.visual.headline}`);
    
    return allTweets.every(tweet => {
      const hasIncomplete = /(\s+(en|y|con|de|para|a|o)\s*|[:,]\s*)$/.test(tweet);
      const hasPlaceholder = /actor\s+[AB]|impacto\s+regional|alianzas\s+en\s+juego|A\/B:/i.test(tweet);
      return !hasIncomplete && !hasPlaceholder;
    });
    
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    return false;
  }
}

async function testPortraitDetection() {
  console.log("\n" + "=".repeat(80));
  console.log("🖼️  TEST: Detección de Portraits");
  console.log("=".repeat(80));
  
  const { extractEntities, decideImageMode } = await import("./src/image_mode.js");
  
  // Test 1: Petro
  const petroEntities = extractEntities([], 
    "Gustavo Petro afirmó que Estados Unidos debe devolver a Maduro",
    "El presidente de Colombia reiteró su posición"
  );
  console.log(`\nTest Petro/Maduro:`);
  console.log(`Entities: ${petroEntities.join(", ")}`);
  
  const petroDecision = decideImageMode(petroEntities);
  console.log(`Mode: ${petroDecision.mode}`);
  console.log(`Entity: ${petroDecision.entity || "NONE"}`);
  console.log(`Portrait: ${petroDecision.portraitPath || "none"}`);
  console.log(`Reason: ${petroDecision.reason}`);
  
  if (petroDecision.mode === "COMPOSED") {
    console.log(`✅ ÉXITO: Portrait detectado para Petro/Maduro`);
  } else {
    console.log(`⚠️  ADVERTENCIA: No se detectó portrait (debería detectar Petro o Maduro)`);
  }
  
  // Test 2: Trump
  const trumpEntities = extractEntities([], 
    "Trump afirma que Irán busca acuerdo",
    "El presidente Donald Trump dijo que..."
  );
  console.log(`\nTest Trump:`);
  console.log(`Entities: ${trumpEntities.join(", ")}`);
  
  const trumpDecision = decideImageMode(trumpEntities);
  console.log(`Mode: ${trumpDecision.mode}`);
  console.log(`Entity: ${trumpDecision.entity || "NONE"}`);
  console.log(`Portrait: ${trumpDecision.portraitPath || "none"}`);
}

async function main() {
  console.log("\n🚀 Testing Validación Post-Proceso + Portrait Detection\n");
  
  const results = [];
  
  results.push(await testValidation(testPetroMaduro, "Petro/Maduro (debería usar portrait)"));
  results.push(await testValidation(testGenerico, "Genérico (debería rechazar o minimal)"));
  
  await testPortraitDetection();
  
  console.log("\n" + "=".repeat(80));
  const passedCount = results.filter(Boolean).length;
  console.log(`\n📊 Resultados: ${passedCount}/${results.length} tests sin errores de validación`);
  
  if (passedCount === results.length) {
    console.log("✅ TODOS LOS TESTS PASARON VALIDACIÓN");
  } else {
    console.log("⚠️  Algunos tests detectaron placeholders o frases cortadas");
  }
  console.log("=".repeat(80));
}

main().catch(console.error);
