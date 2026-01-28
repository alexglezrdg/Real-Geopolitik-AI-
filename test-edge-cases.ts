/**
 * TEST: Casos edge para validar thread2 vs single
 */

import "dotenv/config";
import { generateThreadWithClaude } from "./src/claude.js";

// Caso 1: Noticia con múltiples ángulos distintos (debería ser thread2 o thread3)
const multiAngleCase = {
  title: "China anuncia nuevas sanciones contra empresas estadounidenses por ventas de armas a Taiwán",
  url: "https://example.com/china-sanciones",
  source: "Reuters",
  snippet: `El Ministerio de Comercio de China anunció el martes sanciones contra 
  cinco empresas estadounidenses de defensa por su participación en ventas de armas 
  a Taiwán por valor de 2.200 millones de dólares. Las empresas afectadas incluyen 
  Lockheed Martin y Raytheon. Paralelamente, el Ministerio de Relaciones Exteriores 
  convocó al embajador estadounidense para protestar formalmente. Estados Unidos respondió 
  calificando las medidas de "injustificadas" y reiteró su compromiso con la seguridad de Taiwán 
  bajo la Ley de Relaciones con Taiwán de 1979.`,
};

// Caso 2: Noticia simple de una sola acción (debería ser single)
const singleActionCase = {
  title: "Presidente de Ecuador firma acuerdo comercial con Perú",
  url: "https://example.com/ecuador-peru",
  source: "El Comercio",
  snippet: "El presidente de Ecuador y su homólogo peruano firmaron un acuerdo de libre comercio en Lima.",
};

// Caso 3: Noticia con dato numérico concreto (debería permitir thread2)
const numericCase = {
  title: "Rusia suspende suministro de gas a Polonia",
  url: "https://example.com/rusia-polonia",
  source: "BBC",
  snippet: `Gazprom anunció la suspensión inmediata del suministro de gas natural a Polonia 
  tras el rechazo de Varsovia a pagar en rublos. Polonia importaba el 48% de su gas desde Rusia, 
  equivalente a 9.000 millones de metros cúbicos anuales. El gobierno polaco activó el plan de 
  emergencia energética y anunciará medidas de racionamiento esta semana.`,
};

async function runTest(testCase: any, expectedMode: string, testName: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`🧪 TEST: ${testName}`);
  console.log(`📋 Expectativa: ${expectedMode}`);
  console.log("=".repeat(80));
  console.log(`Title: ${testCase.title.slice(0, 100)}...`);

  try {
    const result = await generateThreadWithClaude(testCase);
    
    const passed = result.mode === expectedMode || 
                   (expectedMode === "thread2+" && (result.mode === "thread2" || result.mode === "thread3"));
    
    console.log(`\n${passed ? "✅" : "⚠️"} Resultado: mode="${result.mode}" (esperado: ${expectedMode})`);
    
    if (result.mode === "single") {
      console.log(`\n📱 Tweet único (${result.tweet.text.length} chars):`);
      console.log(result.tweet.text);
    } else {
      console.log(`\n📱 T1 (${result.tweet.text.length} chars): ${result.tweet.text.slice(0, 120)}...`);
      if (result.thread && result.thread.length > 0) {
        result.thread.forEach((t, i) => {
          console.log(`📱 T${i+2} (${t.text.length} chars): ${t.text.slice(0, 120)}...`);
        });
        
        // Calcular similitud
        const t1Words = new Set(result.tweet.text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        const t2Words = new Set(result.thread[0].text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        const intersection = new Set([...t1Words].filter(x => t2Words.has(x)));
        const union = new Set([...t1Words, ...t2Words]);
        const similarity = union.size === 0 ? 0 : intersection.size / union.size;
        
        console.log(`\n📊 Similitud: ${(similarity * 100).toFixed(1)}% ${similarity <= 0.35 ? "✅" : "❌"}`);
      }
    }
    
    return passed;
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  console.log("\n🚀 Testing Thread2 Logic: Edge Cases\n");
  
  const results = [];
  
  results.push(await runTest(multiAngleCase, "thread2+", "Multi-ángulo (China/EEUU/Taiwán)"));
  results.push(await runTest(singleActionCase, "single", "Acción simple (Ecuador-Perú)"));
  results.push(await runTest(numericCase, "thread2+", "Con datos numéricos (Rusia-Polonia)"));
  
  console.log("\n" + "=".repeat(80));
  const passedCount = results.filter(Boolean).length;
  console.log(`\n📊 Resultados: ${passedCount}/${results.length} tests pasados`);
  
  if (passedCount === results.length) {
    console.log("✅ TODOS LOS TESTS EXITOSOS");
  } else {
    console.log("⚠️  Algunos tests no coincidieron con expectativas (puede ser variación del LLM)");
  }
  console.log("=".repeat(80));
}

main().catch(console.error);
