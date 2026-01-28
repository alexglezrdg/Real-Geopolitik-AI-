#!/usr/bin/env node
/**
 * Test Script: Validar Filtro Editorial Mejorado
 * 
 * Prueba el nuevo sistema de curado con casos de test específicos:
 * - Cultura/música (debe SKIP)
 * - Deportes (debe SKIP)
 * - Geopolítica real (debe POST)
 */

import { refineCandidatesWithLLM } from "./curator-llm.js";

// Test cases
const TEST_CASES = [
  {
    name: "❌ CULTURA: Jazzista en Cuba",
    candidate: {
      title: "Jazzista cubano feliz de estar en Cuba tras gira internacional",
      url: "https://example.com/jazz-cuba",
      source: "CiberCuba",
      snippet: "El músico expresó su alegría de regresar a la isla después de su exitosa gira por Europa",
    },
    expected: "SHOULD_DROP",
  },
  {
    name: "❌ DEPORTES: Campeonato de béisbol",
    candidate: {
      title: "Cuba gana campeonato de béisbol en Serie del Caribe",
      url: "https://example.com/baseball-cuba",
      source: "ESPN",
      snippet: "La selección cubana venció 5-3 en la final del torneo celebrado en México",
    },
    expected: "SHOULD_DROP",
  },
  {
    name: "❌ ENTRETENIMIENTO: Premios de cine",
    candidate: {
      title: "Actriz venezolana gana premio en Festival de Cine Latinoamericano",
      url: "https://example.com/premio-cine",
      source: "El Universal",
      snippet: "La actriz María González recibió el premio a mejor actriz por su papel en 'La Casa'",
    },
    expected: "SHOULD_DROP",
  },
  {
    name: "✅ GEOPOLÍTICA: Sanciones EEUU-Cuba",
    candidate: {
      title: "EEUU anuncia nuevas sanciones contra empresas estatales cubanas por comercio con Venezuela",
      url: "https://example.com/sanctions",
      source: "Reuters",
      snippet: "El Departamento del Tesoro designó a 5 empresas cubanas vinculadas al transporte de petróleo venezolano. Las medidas entran en vigor en 60 días.",
    },
    expected: "SHOULD_POST",
  },
  {
    name: "✅ GEOPOLÍTICA: Migración",
    candidate: {
      title: "México reporta aumento del 180% en detenciones de migrantes cubanos en frontera norte",
      url: "https://example.com/migracion",
      source: "El País",
      snippet: "Autoridades mexicanas registraron 45,000 detenciones en los últimos 3 meses, cifra récord desde 2015",
    },
    expected: "SHOULD_POST",
  },
  {
    name: "✅ GEOPOLÍTICA: Defensa / Seguridad",
    candidate: {
      title: "Pentágono evalúa reforzar vigilancia naval en Estrecho de Florida ante tensiones con Cuba",
      url: "https://example.com/pentagon-florida",
      source: "Defense News",
      snippet: "Funcionarios del Comando Sur consideran aumentar patrullajes tras reportes de actividad naval inusual",
    },
    expected: "SHOULD_POST",
  },
  {
    name: "✅ LISTA BLANCA: Músico + nexo político explícito",
    candidate: {
      title: "Músico disidente cubano refugiado en embajada española genera tensión diplomática entre Madrid y La Habana",
      url: "https://example.com/musician-embassy",
      source: "El País",
      snippet: "El cantante y activista político solicitó asilo político tras amenazas del gobierno cubano. Cancillería española convocó reunión urgente.",
    },
    expected: "SHOULD_POST",
  },
  {
    name: "❌ LISTA BLANCA NO CUMPLE: Actor + mención política débil",
    candidate: {
      title: "Actor venezolano habla sobre situación política en entrevista",
      url: "https://example.com/actor-interview",
      source: "Telemundo",
      snippet: "El actor comentó brevemente sobre la crisis venezolana durante promoción de su nueva película",
    },
    expected: "SHOULD_DROP",
  },
];

async function runTests() {
  console.log("\n🧪 INICIANDO TESTS DEL FILTRO EDITORIAL\n");
  console.log("=" .repeat(80) + "\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`   Título: ${testCase.candidate.title.slice(0, 80)}...`);

    try {
      const result = await refineCandidatesWithLLM({
        candidates: [testCase.candidate],
        k: 1,
        debug: false,
      });

      if (!result) {
        console.log("   ⚠️  LLM no disponible (sin API key)\n");
        continue;
      }

      const wasDropped = result.dropped.some(
        (d) => d.url === testCase.candidate.url
      );
      const wasSelected = result.best_pick?.url === testCase.candidate.url;

      if (testCase.expected === "SHOULD_DROP" && wasDropped) {
        console.log(`   ✅ PASS: Correctamente marcado como dropped`);
        console.log(`   Razón: ${result.dropped[0]?.reason || "unknown"}\n`);
        passed++;
      } else if (testCase.expected === "SHOULD_POST" && wasSelected) {
        console.log(`   ✅ PASS: Correctamente seleccionado como best_pick`);
        console.log(`   Score: ${result.best_pick?.score || 0}/100`);
        console.log(`   Razones: ${result.best_pick?.why_this?.join(", ") || "N/A"}\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: Resultado inesperado`);
        console.log(`   Esperado: ${testCase.expected}`);
        console.log(`   Obtenido: ${wasDropped ? "DROPPED" : wasSelected ? "SELECTED" : "NEITHER"}`);
        if (wasSelected && result.best_pick) {
          console.log(`   Score obtenido: ${result.best_pick.score}/100`);
          console.log(`   Razones: ${result.best_pick.why_this?.join(", ")}`);
        }
        console.log("");
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${(error as Error).message}\n`);
      failed++;
    }
  }

  console.log("=" .repeat(80));
  console.log(`\n📊 RESULTADOS:`);
  console.log(`   ✅ Tests pasados: ${passed}/${TEST_CASES.length}`);
  console.log(`   ❌ Tests fallidos: ${failed}/${TEST_CASES.length}`);
  console.log(`   📈 Tasa de éxito: ${Math.round((passed / TEST_CASES.length) * 100)}%\n`);

  if (failed === 0) {
    console.log("🎉 ¡TODOS LOS TESTS PASARON! El filtro editorial está funcionando correctamente.\n");
  } else {
    console.log("⚠️  Algunos tests fallaron. Revisa los prompts en curator-llm.ts\n");
  }
}

// Run tests
runTests().catch((error) => {
  console.error("💥 Error fatal:", error);
  process.exit(1);
});
