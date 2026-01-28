/**
 * Quick local dedupe test
 * Usage: npx tsx test-dedupe-local.ts
 */

import { checkDuplicate, rememberDedup } from "./src/dedupe_store.js";

const samples = [
  {
    url: "https://www.theguardian.com/world/2026/jan/26/china-top-general-investigation",
    title: "China investigates top general amid military purge",
    snippet: "Beijing widens probe into top ranks",
    region: "GLOBAL",
  },
  {
    url: "https://www.bbc.com/news/world-asia-123456",
    title: "China investigates top general amid military purge",
    snippet: "Similar headline different source",
    region: "GLOBAL",
  },
  {
    url: "https://oncubanews.com/cuba/mexico-cancela-un-envio-de-petroleo-a-cuba/",
    title: "México cancela un envío de petróleo a Cuba tras presiones de EEUU",
    snippet: "Washington intensifica sanciones implícitas",
    region: "LATAM",
  },
  {
    url: "https://oncubanews.com/cuba/mexico-cancela-envio-petroleo-cuba/",
    title: "México cancela un envío de petróleo a Cuba por presión de EEUU",
    snippet: "Mismo evento con título ligeramente distinto",
    region: "LATAM",
  }
];

function run() {
  for (const s of samples) {
    const dup = checkDuplicate({
      url: s.url,
      title: s.title,
      snippet: s.snippet,
      region: s.region,
      source: "TEST"
    });
    console.log(`${dup.isDuplicate ? "DROP" : "KEEP"} | ${dup.reason ?? "OK"} | ${s.title}`);
    if (!dup.isDuplicate) {
      rememberDedup(s);
    }
  }
}

run();
