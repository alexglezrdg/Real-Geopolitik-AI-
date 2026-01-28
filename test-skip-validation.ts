#!/usr/bin/env npx tsx
/**
 * Test para validar que el sistema SKIP funciona correctamente
 * Casos que deben ser SKIP:
 * 1. Noticias sin geopolítica (finanzas, cultura, deportes)
 * 2. Plantillas detectadas
 */

import { generateThreadWithClaude } from "./src/claude.js";

const TEST_CASES = [
  {
    name: "CASO 1: Educación financiera (NO geopolítica)",
    title: "Cuba lanza programa de educación financiera para jóvenes",
    source: "PanamPost",
    snippet: "El Banco Central de Cuba anunció un nuevo programa educativo para enseñar finanzas personales a estudiantes universitarios.",
    url: "https://example.com/cuba-finanzas",
    expectedSkip: true,
  },
  {
    name: "CASO 2: Deportes (NO geopolítica)",
    title: "Argentina gana partido amistoso contra Brasil",
    source: "ESPN",
    snippet: "La selección argentina venció 2-1 a Brasil en un partido amistoso celebrado en Buenos Aires.",
    url: "https://example.com/futbol",
    expectedSkip: true,
  },
  {
    name: "CASO 3: Sanciones (SÍ geopolítica)",
    title: "EEUU impone nuevas sanciones a funcionarios de Venezuela",
    source: "Reuters",
    snippet: "El Departamento del Tesoro de Estados Unidos anunció sanciones contra 10 funcionarios del gobierno de Maduro por violaciones de derechos humanos.",
    url: "https://example.com/sanciones-vzla",
    expectedSkip: false,
  },
  {
    name: "CASO 4: Trump-Milei (SÍ geopolítica)",
    title: "Trump y Milei acuerdan cooperación militar bilateral",
    source: "AFP",
    snippet: "En reunión en Washington, ambos mandatarios firmaron un acuerdo de cooperación en defensa y seguridad.",
    url: "https://example.com/trump-milei",
    expectedSkip: false,
  },
];

async function runTests() {
  console.log("=" .repeat(80));
  console.log("TEST DE VALIDACIÓN SKIP - 3 CAPAS DE PROTECCIÓN");
  console.log("=".repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  for (const tc of TEST_CASES) {
    console.log(`\n>>> ${tc.name}`);
    console.log(`Título: ${tc.title}`);
    console.log(`Esperado SKIP: ${tc.expectedSkip}`);
    
    try {
      const result = await generateThreadWithClaude({
        title: tc.title,
        source: tc.source,
        snippet: tc.snippet,
        url: tc.url,
      });
      
      const isSkip = 
        !result.mode || 
        result.mode === null || 
        result.tweet?.text?.toUpperCase().includes("SKIP") ||
        (result as any).action === "SKIP";
      
      console.log(`Resultado mode: ${result.mode}`);
      console.log(`Resultado action: ${(result as any).action || "N/A"}`);
      console.log(`Resultado tweet.text: ${result.tweet?.text?.substring(0, 100)}...`);
      
      if (isSkip === tc.expectedSkip) {
        console.log(`✅ PASS - ${tc.expectedSkip ? "Correctamente SKIP" : "Correctamente POST"}`);
        passed++;
      } else {
        console.log(`❌ FAIL - Esperaba SKIP=${tc.expectedSkip}, obtuvo SKIP=${isSkip}`);
        failed++;
      }
      
      // Verificar frases prohibidas
      if (!isSkip && result.tweet?.text) {
        const BANNED = /(mover el tablero|mueve el tablero|tablero en \d+h|impacto regional|alianzas en juego|presión\/sanciones|actor [AB]|A\/B:|Sígu[ea].*para más|Seguridad:\s*impacto|Economía:\s*presión|Política:\s*alianzas|economía en bancarrota)/gi;
        const match = result.tweet.text.match(BANNED);
        if (match) {
          console.log(`⚠️ FRASE PROHIBIDA DETECTADA: "${match[0]}"`);
          failed++;
          passed--;
        }
      }
      
    } catch (err: any) {
      console.log(`⚠️ ERROR: ${err.message}`);
      failed++;
    }
    
    console.log("-".repeat(80));
  }
  
  console.log("\n" + "=".repeat(80));
  console.log(`RESULTADO FINAL: ${passed}/${TEST_CASES.length} tests pasaron`);
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  console.log("=".repeat(80));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
