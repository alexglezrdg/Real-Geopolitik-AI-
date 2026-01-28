#!/usr/bin/env npx tsx
import { buildTopicHash, debugTopicHash } from './src/dedupe_store.js';

const titles = [
  'Cuba denuncia amenaza de bloqueo naval de EEUU a sus suministros de petróleo',
  'ÚLTIMA HORA | Cuba acusa a EEUU de planear bloqueo naval al petróleo',
  'Cuba denuncia bloqueo naval estadounidense',
  'Rusia envía 330.000 barriles de petróleo a Cuba',
  // Títulos exactos de la DB:
  'Cuba acusa a EEUU de planear bloqueo naval al petróleo y califica la medida de "acto de guerra" - América TeVé',
  'Cuba denuncia amenaza de bloqueo naval de EEUU a sus suministros de petróleo - OnCubaNews',
];

console.log("=== Topic Hash Debug ===\n");
for (const t of titles) {
  const hash = buildTopicHash(t);
  console.log('---');
  console.log('Title:', t.slice(0, 60));
  console.log('Hash:', hash?.slice(0, 12) || 'null');
}

// Check if similar titles produce same hash
console.log("\n=== Same Hash Check ===");
const h1 = buildTopicHash(titles[4]);
const h2 = buildTopicHash(titles[5]);
console.log("Title 4 hash:", h1?.slice(0, 12));
console.log("Title 5 hash:", h2?.slice(0, 12));
console.log("Same?", h1 === h2);
