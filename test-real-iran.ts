/**
 * TEST REALISTA: Caso Irán + Trump (del screenshot)
 * Simula el caso real que el usuario reportó
 */

import "dotenv/config";
import { generateThreadWithClaude } from "./src/claude.js";

const realCase = {
  title: "Trump afirma que Irán busca acuerdo con Estados Unidos mientras despliega 'gran armada' naval en la región.",
  url: "https://jornada.com.mx/2026/01/27/mundo/017n1mun",
  source: "La Jornada",
  snippet: `El presidente Donald Trump afirmó el lunes que Irán busca un acuerdo con Estados Unidos, 
  en un momento en que las tensiones entre ambos países se incrementan debido al despliegue de una 
  importante flota naval iraní en la región del Golfo Pérsico. Según información reportada por Axios 
  desde Dubái, la armada desplegada por Irán es "más grande que la de Venezuela". La situación genera 
  una paradoja diplomática-militar: mientras Teherán envía señales de apertura al diálogo, simultáneamente 
  realiza una demostración de fuerza naval que podría interpretarse como una advertencia a Washington 
  sobre sus capacidades militares en la región.`,
};

async function testRealCase() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 TEST REALISTA: Caso Irán + Trump");
  console.log("=".repeat(80));
  console.log(`\n📰 NOTICIA:`);
  console.log(`Title: ${realCase.title}`);
  console.log(`Source: ${realCase.source}`);
  console.log(`URL: ${realCase.url}`);
  console.log(`\n📄 SNIPPET:\n${realCase.snippet}\n`);

  try {
    const result = await generateThreadWithClaude(realCase);
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ RESULTADO GENERADO");
    console.log("=".repeat(80));
    console.log(`\n🎯 Mode: ${result.mode}`);
    console.log(`⚡ Urgency: ${result.urgency_tag}`);
    console.log(`#️⃣  Hashtags: ${result.topic_hashtags.join(", ")}`);
    
    console.log(`\n${"—".repeat(80)}`);
    console.log(`📱 TWEET 1 (${result.tweet.text.length} chars)`);
    console.log(`${"—".repeat(80)}`);
    console.log(result.tweet.text);
    
    if (result.thread && result.thread.length > 0) {
      result.thread.forEach((t, i) => {
        console.log(`\n${"—".repeat(80)}`);
        console.log(`📱 TWEET ${i + 2} (${t.text.length} chars)`);
        console.log(`${"—".repeat(80)}`);
        console.log(t.text);
      });
    }
    
    console.log(`\n${"—".repeat(80)}`);
    console.log(`🔗 URL (agregada automáticamente)`);
    console.log(`${"—".repeat(80)}`);
    console.log(`Más detalles: ${realCase.url}`);
    
    // Análisis de similitud
    if (result.mode === "thread2" || result.mode === "thread3") {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`📊 ANÁLISIS DE SIMILITUD`);
      console.log(`${"=".repeat(80)}`);
      
      const t1Words = new Set(
        result.tweet.text.toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 2)
      );
      const t2Words = new Set(
        result.thread[0].text.toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 2)
      );
      
      const intersection = new Set([...t1Words].filter(x => t2Words.has(x)));
      const union = new Set([...t1Words, ...t2Words]);
      const similarity = union.size === 0 ? 0 : intersection.size / union.size;
      
      console.log(`\n📈 Similitud Jaccard T1↔T2: ${(similarity * 100).toFixed(1)}%`);
      console.log(`📊 Umbral máximo: 35.0%`);
      
      if (similarity > 0.35) {
        console.log(`❌ FALLO: Similitud demasiado alta (sistema debería degradar a single)`);
      } else {
        console.log(`✅ ÉXITO: Similitud aceptable (tweets son suficientemente distintos)`);
      }
      
      console.log(`\n🔤 Palabras únicas en T1: ${t1Words.size}`);
      console.log(`🔤 Palabras únicas en T2: ${t2Words.size}`);
      console.log(`🔗 Palabras en común: ${intersection.size}`);
      console.log(`📦 Total palabras (unión): ${union.size}`);
      
      console.log(`\n🎯 Palabras en común:`);
      const commonWords = [...intersection].sort();
      console.log(commonWords.slice(0, 15).join(", ") + (commonWords.length > 15 ? "..." : ""));
    }
    
    // Análisis de contenido
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🧠 ANÁLISIS DE CONTENIDO`);
    console.log(`${"=".repeat(80)}`);
    
    const t1Topics = [
      result.tweet.text.toLowerCase().includes("trump") && "✅ Trump",
      result.tweet.text.toLowerCase().includes("irán") && "✅ Irán",
      result.tweet.text.toLowerCase().includes("acuerdo") && "✅ Acuerdo",
      result.tweet.text.toLowerCase().includes("armada") && "✅ Armada/Naval",
    ].filter(Boolean);
    
    console.log(`\n📝 Tweet 1 menciona:`);
    t1Topics.forEach(t => console.log(`   ${t}`));
    
    if (result.thread && result.thread.length > 0) {
      const t2Topics = [
        result.thread[0].text.toLowerCase().includes("venezuela") && "✅ Comparación Venezuela",
        result.thread[0].text.toLowerCase().includes("dubái") && "✅ Fuente (Dubái)",
        result.thread[0].text.toLowerCase().includes("axios") && "✅ Medio (Axios)",
        result.thread[0].text.toLowerCase().includes("paradoja") && "✅ Análisis (paradoja)",
        result.thread[0].text.toLowerCase().includes("señal") && "✅ Señales diplomáticas",
      ].filter(Boolean);
      
      console.log(`\n📝 Tweet 2 aporta:`);
      t2Topics.forEach(t => console.log(`   ${t}`));
      
      if (t2Topics.length === 0) {
        console.log(`   ⚠️  WARNING: T2 no parece agregar información nueva`);
      }
    }
    
    // Visual metadata
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🖼️  METADATOS VISUALES`);
    console.log(`${"=".repeat(80)}`);
    console.log(`Header: ${result.visual.header}`);
    console.log(`Headline: ${result.visual.headline}`);
    console.log(`Subheadline: ${result.visual.subheadline}`);
    console.log(`Image Brief: ${result.visual.image_brief}`);
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${(error as Error).message}`);
    console.error((error as Error).stack);
  }
  
  console.log(`\n${"=".repeat(80)}`);
  console.log(`✅ TEST COMPLETADO`);
  console.log(`${"=".repeat(80)}\n`);
}

testRealCase().catch(console.error);
