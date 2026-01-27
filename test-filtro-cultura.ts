#!/usr/bin/env tsx
/**
 * Test: Hard-ban cultura/deportes filter
 * Tests that non-geopolitical culture/sports/entertainment stories are rejected
 */

import "dotenv/config";
import { generateThreadWithClaude } from "./src/claude.js";

async function testCulturaFilter() {
  console.log("🧪 TEST: Filtro Hard-Ban Cultura/Deportes/Farándula\n");
  console.log("=" .repeat(70));

  const testCases = [
    {
      name: "❌ DEBE RECHAZAR: Músico jazz en Cuba (no geopolítica)",
      title: "Jazzista cubano feliz de estar en Cuba para nuevo concierto",
      snippet: "El famoso músico cubano celebra su regreso a La Habana para un concierto especial de jazz. 'Estoy feliz de estar en casa', declaró.",
      source: "Cubanet",
      url: "https://example.com/jazz-cuba-1",
      expectedReject: true,
    },
    {
      name: "✅ DEBE ACEPTAR: Músico disidente + diplomacia",
      title: "Músico cubano disidente se refugia en embajada de EEUU, genera tensión diplomática",
      snippet: "Un reconocido cantante cubano que criticó al régimen se refugió en la embajada estadounidense en La Habana, generando una crisis diplomática entre ambos países.",
      source: "Reuters",
      url: "https://example.com/musician-embassy-1",
      expectedReject: false,
    },
    {
      name: "❌ DEBE RECHAZAR: Partido de fútbol (no geopolítica)",
      title: "Real Madrid vence al Barcelona 3-1 en clásico español",
      snippet: "El Real Madrid derrotó al Barcelona en un emocionante partido en el estadio Santiago Bernabéu.",
      source: "Marca",
      url: "https://example.com/futbol-1",
      expectedReject: true,
    },
    {
      name: "✅ DEBE ACEPTAR: Sanciones deportivas por razones políticas",
      title: "FIFA suspende a Rusia de todas las competiciones internacionales tras invasión de Ucrania",
      snippet: "La FIFA y la UEFA han excluido a todos los equipos rusos de las competiciones internacionales como sanción por la invasión de Ucrania.",
      source: "BBC",
      url: "https://example.com/fifa-russia-sanctions",
      expectedReject: false,
    },
    {
      name: "❌ DEBE RECHAZAR: Festival de cine (no geopolítica)",
      title: "Festival de Cine de La Habana premia nueva película cubana",
      snippet: "El Festival Internacional del Nuevo Cine Latinoamericano premió una nueva producción cubana sobre la vida en La Habana.",
      source: "OnCuba",
      url: "https://example.com/cine-festival-1",
      expectedReject: true,
    },
    {
      name: "✅ DEBE ACEPTAR: Censura cinematográfica (geopolítica)",
      title: "China censura película sobre Tiananmen, genera protestas internacionales",
      snippet: "El gobierno chino prohibió la proyección de un documental sobre las protestas de Tiananmen, generando condenas de gobiernos occidentales y organizaciones de derechos humanos.",
      source: "The Guardian",
      url: "https://example.com/china-censorship-film",
      expectedReject: false,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`\n${tc.name}`);
    console.log(`Title: ${tc.title}`);
    console.log(`Expected: ${tc.expectedReject ? "SKIP" : "POST"}`);

    try {
      const result = await generateThreadWithClaude({
        title: tc.title,
        snippet: tc.snippet,
        source: tc.source,
        url: tc.url,
      });

      const wasRejected = !result.mode || result.mode === null || result.tweet?.text?.toUpperCase().includes("SKIP");
      const actualResult = wasRejected ? "SKIP" : "POST";

      console.log(`Actual: ${actualResult}`);

      if ((wasRejected && tc.expectedReject) || (!wasRejected && !tc.expectedReject)) {
        console.log("✅ PASS");
        passed++;
      } else {
        console.log(`❌ FAIL - Expected ${tc.expectedReject ? "SKIP" : "POST"}, got ${actualResult}`);
        if (!wasRejected && tc.expectedReject) {
          console.log(`   Generated tweet: ${result.tweet?.text?.slice(0, 100)}...`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`⚠️  ERROR: ${(error as Error).message}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`\n📊 RESULTADOS: ${passed}/${testCases.length} pasaron`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n⚠️  Algunos tests fallaron. Revisa el prompt o los umbrales.");
    process.exit(1);
  } else {
    console.log("\n🎉 ¡Todos los tests pasaron!");
    process.exit(0);
  }
}

testCulturaFilter();
