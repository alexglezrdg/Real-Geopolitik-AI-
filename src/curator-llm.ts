/**
 * LLM-Based Editorial Curator - Real Geopolitik
 *
 * Secondary validator/refiner after deterministic curator.
 * Uses Claude to:
 * - Aggressively deduplicate URLs (tracking params, duplicate stories)
 * - Enforce Spanish-only content
 * - Validate geopolitical relevance (75%+ target)
 * - Return best_pick with detailed scoring
 */

import "dotenv/config";

// ============ TYPES ============
export type LLMCandidate = {
  title: string;
  url: string;
  source: string;
  published_at?: string;
  snippet?: string;
  tags?: string[];
};

export type LLMCuratedItem = {
  title: string;
  url: string;
  source: string;
  region_bucket: "US" | "LATAM" | "MIDDLE_EAST" | "GLOBAL_GEO" | "OTHER" | "CARIBBEAN" | "GLOBAL";
  geopolitics_ratio_bucket: "GEO_75" | "GEO_50" | "NON_GEO";
  score: number; // 0-100
  why_this: string[];
  suggested_hashtags?: string[];
};

export type TweetGuidance = {
  one_link_only: boolean;
  no_duplicate_link_lines: boolean;
  max_hashtags: number;
  tone: string;
};

export type LLMCurationResult = {
  best_pick: LLMCuratedItem & { tweet_guidance: TweetGuidance };
  ranked: Array<Omit<LLMCuratedItem, "tweet_guidance">>;
  dropped: Array<{
    title: string;
    url: string;
    reason: "duplicate" | "low_geopolitics" | "low_signal" | "unclear" | "other";
  }>;
};

export type RefineCandidatesParams = {
  candidates: LLMCandidate[];
  k?: number; // default 5, top K items to rank
  timeoutMs?: number; // default 8000ms
  debug?: boolean;
};

// ============ URL NORMALIZATION ============
/**
 * Canonical URL: removes tracking params and normalizes
 */
function canonicalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove common tracking params
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
      "ref",
      "refid",
      "source",
      "medium",
      "campaign",
      "content",
      "term",
    ];
    paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

    // Normalize: https + remove trailing slash
    const canonical = urlObj.toString().replace(/\/$/, "").split("#")[0]; // remove anchors
    return canonical;
  } catch {
    // If URL parse fails, return as-is
    return url;
  }
}

/**
 * Similarity score: rough check if two URLs point to same story
 * (same domain + similar title)
 */
function urlSimilarity(url1: string, url2: string, title1: string, title2: string): number {
  const canon1 = canonicalizeUrl(url1);
  const canon2 = canonicalizeUrl(url2);

  // Exact match
  if (canon1 === canon2) return 1.0;

  // Check domain + path
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);

    if (u1.hostname !== u2.hostname) return 0; // different domain = not similar

    // Same domain: check title similarity
    const t1Lower = title1.toLowerCase().replace(/[^\w\s]/g, "").trim();
    const t2Lower = title2.toLowerCase().replace(/[^\w\s]/g, "").trim();

    // Count matching words (rough)
    const words1 = new Set(t1Lower.split(/\s+/));
    const words2 = new Set(t2Lower.split(/\s+/));

    let matches = 0;
    words1.forEach((w) => {
      if (words2.has(w) && w.length > 3) matches++;
    });

    const totalUnique = new Set([...words1, ...words2]).size;
    return totalUnique > 0 ? matches / totalUnique : 0;
  } catch {
    return 0;
  }
}

// ============ CLAUDE INTEGRATION ============
async function callClaude(
  candidates: LLMCandidate[],
  k: number,
  timeoutMs: number,
  debug: boolean
): Promise<LLMCurationResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  if (!apiKey) {
    if (debug) console.log("[CURATOR-LLM] No API key, returning null");
    return null;
  }

  const systemPrompt = `Actúas como Editor Jefe + Analyst para el autoposter de X/Twitter de "Real Geopolitik".

OBJETIVO
Publicar SOLO noticias con señal geopolítica REAL (política exterior, sanciones, seguridad, defensa, migración, elecciones, energía/commodities, tratados, guerra, diplomacia, inteligencia, crisis institucional).
Si NO hay geopolítica clara: NO selecciones.

PRIORIDAD REGIONAL (dentro de geopolítica)
1) **Estados Unidos**
2) **América Latina & Caribe**
3) **Medio Oriente**
4) Secundario: Europa / Rusia / China solo si es globalmente significativo o afecta directamente a las Américas/Medio Oriente.

INPUT
Recibirás un JSON array \`candidates\` (de RSS/feeds). Cada item puede incluir:
- title (string)
- url (string)
- source (string)
- published_at (string o null)
- snippet/summary (string o null)
- tags (array o null)

REGLAS DURAS (si violas una, debes marcar como dropped):
1) NO inventes impacto. Todo claim debe derivarse de title/summary. Si no está, no lo asumas.
2) PROHIBIDO usar placeholders: "actor A/B", "tablero en 72h", "alianzas en juego", "impacto regional" genérico.
3) PROHIBIDO forzar geopolitics a cultura/deportes/farándula/música/cine/entretenimiento.
   Si es cultura/música/deportes y NO conecta explícitamente con Estado/sanciones/diplomacia/seguridad: DROP con reason="low_geopolitics".
4) KEYWORDS HARD-BAN (auto-drop si title/summary contiene estos sin contexto geopolítico claro):
   - cultura, música, cine, deportes, fútbol, baloncesto, béisbol, actor, actriz, cantante, artista, concierto, festival, farándula
   - Si aparecen PERO hay conexión clara con sanciones/diplomacia/Estado (ej: "Cantante cubano en evento oficial con diplomáticos"), entonces evalúa normalmente.
5) Deduplicación agresiva:
   - Eliminar URLs duplicadas exactas.
   - Eliminar URLs que difieren solo en tracking params (utm_, fbclid, gclid, etc.).
   - Si dos items son la misma historia (título muy similar + mismo evento), mantener la mejor fuente / más fresca.
6) Español 100%: Si title original está en inglés, traduce fielmente (sin sensacionalismo).
7) Hashtags: 0–2 máximo, solo si son relevantes y específicos (ej: #Cuba #EEUU #Venezuela #Sanciones).

SCORING INTERNO (0-100, para decidir qué publicar):
- Relevancia geopolítica: 0–40 puntos
- Prioridad regional (US/LatAm/Medio Oriente): 0–20 puntos
- Tendencia/significancia: 0–20 puntos
- Novedad: 0–10 puntos
- Claridad para post corto en X: 0–10 puntos
- Penalización: -0 a -25 (clickbait, poco claro, opinión sin implicación geopolítica clara, cultura/deportes sin nexo político)

UMBRAL MÍNIMO:
- Si geopolitics_signal < 70 => marca como dropped con reason="low_geopolitics" o "low_signal"
- Si es cultura/deportes/música sin conexión política explícita => dropped reason="low_geopolitics"

EXCEPCIONES (lista blanca - solo si se cumplen AMBAS condiciones):
- Cultura/deportes/música + Mención explícita de: diplomacia, sanciones, política exterior, Estado, gobierno, ministro, embajador, tratado, o acuerdo oficial
- Y tiene actores estatales verificables (países, gobiernos, instituciones oficiales)
- Ejemplo válido: "Cantante cubano en gira diplomática oficial con ministro de exteriores"
- Ejemplo inválido: "Cantante cubano feliz en Cuba" (no hay nexo político verificable)

SALIDA: responde SOLO JSON VÁLIDO (sin markdown, sin texto extra):
{
  "best_pick": {
    "title": "...",
    "url": "...",
    "source": "...",
    "region_bucket": "US|LATAM|MIDDLE_EAST|GLOBAL_GEO|OTHER|CARIBBEAN|GLOBAL",
    "geopolitics_ratio_bucket": "GEO_75|GEO_50|NON_GEO",
    "score": 0-100,
    "why_this": ["razón 1 verificable del texto", "razón 2 verificable", "razón 3 verificable"],
    "suggested_hashtags": ["#...","#..."],
    "tweet_guidance": {
      "one_link_only": true,
      "no_duplicate_link_lines": true,
      "max_hashtags": 2,
      "tone": "imparcial, analítico, breve, sobrio"
    }
  },
  "ranked": [
    { "title":"...", "url":"...", "source":"...", "region_bucket":"...", "geopolitics_ratio_bucket":"...", "score":0-100, "why_this":["..."] }
  ],
  "dropped": [
    { "title":"...", "url":"...", "reason":"duplicate|low_geopolitics|low_signal|unclear|culture_sports_no_politics|other" }
  ]
}

CHECK FINAL antes de responder:
- ¿Hay geopolítica explícita en best_pick? Si no: reconsiderar o marcar todos como dropped.
- ¿Hay algún claim no sustentado por title/summary en why_this? Si sí: reescribir.
- ¿Hay placeholders o frases genéricas en why_this? Si sí: reescribir con hechos concretos.
- ¿El score refleja el umbral (< 70 = low signal)? Verificar consistencia.
- ¿El best_pick es cultura/deportes? Si sí: verificar que cumple excepciones de lista blanca, si no: DROP.

Ahora cura basándote en los candidatos proporcionados.`;

  const userMsg = `Here are the candidates:\n\n${JSON.stringify(candidates, null, 2)}\n\nReturn ONLY valid JSON with best_pick, ranked, and dropped.`;

  if (debug) {
    console.log(`[CURATOR-LLM] User message length: ${userMsg.length} chars`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    if (debug) console.log(`[CURATOR-LLM] Timeout triggered after ${timeoutMs}ms`);
    controller.abort();
  }, timeoutMs);

  try {
    if (debug) console.log(`[CURATOR-LLM] Sending request to Claude...`);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      if (debug) console.log(`[CURATOR-LLM] Claude error: ${errText}`);
      return null;
    }

    const data: any = await res.json();
    let text: string =
      data?.content?.map((c: any) => c?.text).filter(Boolean).join("\n") ?? "";

    // Clean markdown
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\s*```$/, "").trim();

    if (debug) console.log(`[CURATOR-LLM] Raw response length: ${text.length}`);

    // Try to parse JSON
    let parsed: LLMCurationResult;
    try {
      parsed = JSON.parse(text);
      if (debug) console.log(`[CURATOR-LLM] Parsed successfully`);
    } catch (parseErr) {
      // Retry: ask for JSON only
      if (debug)
        console.log(`[CURATOR-LLM] Parse failed, retrying with "Return ONLY JSON"`);

      const retryRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          temperature: 0.1,
          system: systemPrompt,
          messages: [
            { role: "user", content: userMsg },
            { role: "assistant", content: text },
            { role: "user", content: "Return ONLY the valid JSON, no explanation." },
          ],
        }),
        signal: controller.signal as any,
      });

      if (!retryRes.ok) {
        if (debug) console.log(`[CURATOR-LLM] Retry failed, giving up`);
        return null;
      }

      const retryData: any = await retryRes.json();
      const retryText: string =
        retryData?.content?.map((c: any) => c?.text).filter(Boolean).join("\n") ?? "";

      const cleanedRetry = retryText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\s*```$/, "")
        .trim();

      try {
        parsed = JSON.parse(cleanedRetry);
        if (debug) console.log(`[CURATOR-LLM] Retry parsed successfully`);
      } catch (retryParseErr) {
        if (debug) console.log(`[CURATOR-LLM] Retry parse also failed`);
        return null;
      }
    }

    // Validate structure
    if (!parsed?.best_pick || !parsed?.ranked || !Array.isArray(parsed?.dropped)) {
      if (debug) console.log(`[CURATOR-LLM] Invalid structure`);
      return null;
    }

    return parsed;
  } catch (err) {
    const errMsg = (err as Error)?.message ?? String(err);
    if (debug && !errMsg.includes("abort"))
      console.log(`[CURATOR-LLM] Fetch error: ${errMsg}`);
    if (debug && errMsg.includes("abort"))
      console.log(`[CURATOR-LLM] Timeout (${timeoutMs}ms)`);
    return null;
  }
}

// ============ MAIN EXPORT ============
export async function refineCandidatesWithLLM(
  params: RefineCandidatesParams
): Promise<LLMCurationResult | null> {
  const {
    candidates,
    k = 5,
    timeoutMs = 8000,
    debug = false,
  } = params;

  if (!candidates || candidates.length === 0) {
    if (debug) console.log("[CURATOR-LLM] No candidates provided");
    return null;
  }

  if (debug) {
    console.log(`[CURATOR-LLM] Starting refinement...`);
    console.log(`[CURATOR-LLM]   Candidates: ${candidates.length}`);
    console.log(`[CURATOR-LLM]   K: ${k}`);
    console.log(`[CURATOR-LLM]   Timeout: ${timeoutMs}ms`);
  }

  const result = await callClaude(candidates, k, timeoutMs, debug);

  if (result && debug) {
    console.log(
      `[CURATOR-LLM] ✅ Curation succeeded (best_pick score: ${result.best_pick.score})`
    );
  } else if (!result && debug) {
    console.log(`[CURATOR-LLM] ❌ Curation failed, returning null`);
  }

  return result;
}

/**
 * Helper: canonicalize URL for comparison
 * Exported for use in other modules
 */
export { canonicalizeUrl };
