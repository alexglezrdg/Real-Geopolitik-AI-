import "dotenv/config";

// ============ TYPES ============
export type ThreadTweet = { text: string; source_urls?: string[] };

export interface ColorPalette {
  bg: string; // "#000000"
  text: string; // "#FCFCFA"
  accent: string; // "#E10600"
}

export interface VisualMetadata {
  format: "9:16";
  brand: "Real Geopolitik";
  palette: ColorPalette;
  header: "ÚLTIMA HORA" | "CLAVE" | "EN DESARROLLO";
  headline: string; // 12-16 words, MAYÚSCULAS
  subheadline: string; // 18-22 words
  source_line: string;
  date_line: string;
  image_brief: string;
  style_rules: string[];
  layout_lock: "header_pill_top_left|hero_60pct|red_rule|lower_third_text|footer_source_date";
}

export interface NewsPack {
  mode: "single" | "thread3";
  language: "es";
  urgency_tag: "ÚLTIMA HORA" | "CLAVE" | "EN DESARROLLO";
  topic_hashtags: string[]; // 1-2 max
  tweet: { text: string; url: string };
  thread: ThreadTweet[];
  visual: VisualMetadata;
}

const HOOK_LIBRARY = [
  "Lo que cambia el tablero:",
  "Esto escala si…",
  "La señal real es…",
  "La pregunta ahora:",
  "En claro:",
  "3 claves para entenderlo:",
];

const ENGLISH_MARKERS = [
  "breaking",
  "according to",
  "reported",
  "sources say",
  "sources claim",
  "breaking news",
  "just in",
  "thread",
  "account",
];

// ============ HELPERS ============
function safeTrim(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

function hasEnglish(text: string): boolean {
  const lower = text.toLowerCase();
  return ENGLISH_MARKERS.some((marker) => lower.includes(marker));
}

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============ MAIN FUNCTION ============
export async function generateThreadWithClaude(params: {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  language?: "en" | "es";
}): Promise<NewsPack> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  // Fallback: no API key
  if (!apiKey) {
    return buildFallbackNewsPack(params.title, params.url, params.source);
  }

  // System prompt: RG NewsPack Generator (Modo Producción)
  const system = `Actúa como Editor Jefe + Analyst para el autoposter de X/Twitter de "Real Geopolitik".

OBJETIVO
Publicar SOLO noticias con señal geopolítica REAL (política exterior, sanciones, seguridad, defensa, migración, elecciones, energía/commodities, tratados, guerra, diplomacia, inteligencia, crisis institucional). 
Si NO hay geopolítica clara: NO publiques.

INPUT (no asumas nada fuera de esto):
- title: ${params.title}
- snippet: ${params.snippet ?? "(no disponible)"}
- source: ${params.source}
- url: ${params.url ?? "null"}

REGLAS DURAS (si violas una, debes responder con mode=null, tweet.text="SKIP"):
1) NO inventes impacto. Todo claim debe derivarse de title/snippet. Si no está, no lo digas.
2) PROHIBIDO usar placeholders: "actor A/B", "tablero en 72h", "alianzas en juego", "impacto regional" genérico.
3) PROHIBIDO forzar geopolitics a cultura/deportes/farándula. 
   Si es cultura/música/deportes y no conecta explícitamente con Estado/sanciones/diplomacia/seguridad: mode=null, tweet.text="SKIP".
4) 1 sola URL total: SOLO al final del ÚLTIMO tuit como línea separada:
   "Más detalles: {url}"
   NO incluyas URL en tweet.text (se agrega automáticamente en código).
5) Hashtags: 0 a 3 máximo. DEBEN ser del TEMA/PAÍS mencionado en la noticia (ej: #Venezuela #Cuba #Iran #Ucrania #EEUU #China #Israel).
   NUNCA uses el nombre del medio/fuente como hashtag (ej: NO #France24, NO #Reuters, NO #DW, NO #RunRun, NO #ElPais).
   Solo hashtags de países, regiones, líderes o temas geopolíticos específicos.
6) Estilo: español, tono sobrio e imparcial, conciso. Cero relleno.
7) Formato: elige "single" o "thread3":
   - single: 1 tuit (<= 260 chars) en tweet.text. thread=[] vacío.
   - thread3: EXACTAMENTE 3 tuits DISTINTOS en campos separados:
     * tweet.text = TUIT 1: El titular/noticia principal en 1 frase concisa.
     * thread[0].text = TUIT 2: Contexto o reacción de otro actor. DIFERENTE a T1.
     * thread[1].text = TUIT 3: Qué vigilar o implicación + línea final URL.
   CRÍTICO: tweet.text y thread[0].text DEBEN ser textos COMPLETAMENTE DIFERENTES.
   NUNCA copies el mismo texto en tweet.text y thread[0].text.
   Nunca uses "A/B: …", ni CTA tipo "Sígueme para más".

SCORING INTERNO (solo para decidir post/skip):
- geopolitics_signal = 0..100
- Si geopolitics_signal < 60 => mode=null, tweet.text="SKIP"

METADATOS VISUALES (deben venir SIEMPRE):
- Paleta RG fuerte: bg #000000, text #FCFCFA, accent #E10600
- Layout lock: header_pill_top_left | hero_60pct | red_rule | lower_third_text | footer_source_date
- Titular en MAYÚSCULAS, 12–16 palabras máx.
- Subtítulo 18–22 palabras máx.
- image_brief describe solo visual (persona/escena/mapa/objeto). Prohibido logos terceros.

SALIDA: responde SOLO JSON VÁLIDO (sin markdown, sin texto extra):
{
  "mode": "single" | "thread3" | null,
  "language": "es",
  "urgency_tag": "ÚLTIMA HORA" | "CLAVE" | "EN DESARROLLO",
  "topic_hashtags": ["Venezuela", "EEUU"],
  "tweet": { "text": "TUIT 1 (siempre requerido)", "url": "${params.url ?? "null"}" },
  "thread": [{"text": "TUIT 2 (solo si mode=thread3)"}, {"text": "TUIT 3 (solo si mode=thread3)"}],
  "visual": {
    "format": "9:16",
    "brand": "Real Geopolitik",
    "palette": { "bg": "#000000", "text": "#FCFCFA", "accent": "#E10600" },
    "layout_lock": "header_pill_top_left | hero_60pct | red_rule | lower_third_text | footer_source_date",
    "header": "ÚLTIMA HORA" | "CLAVE" | "EN DESARROLLO",
    "headline": "string",
    "subheadline": "string",
    "source_line": "Fuente: ${params.source}",
    "date_line": "Fecha: ${getTodayDate()}",
    "image_brief": "string",
    "style_rules": [
      "alto contraste",
      "fondo negro/carbón",
      "acento rojo #E10600 solo en header y línea",
      "tipografía sans condensada bold, MAYÚSCULAS",
      "sin logos de terceros, sin marcas de agua"
    ]
  }
}

CHECK FINAL antes de responder:
- ¿Hay geopolítica explícita? Si no: mode=null, tweet.text="SKIP".
- ¿Hay algún claim no sustentado por title/snippet? Si sí: mode=null, tweet.text="SKIP" o reescribe sin ese claim.
- ¿Hay placeholders o frases genéricas? Si sí: reescribe con hechos concretos del title/snippet.
- ¿Hay más de una URL o "Más detalles" repetido? Si sí: reescribe (SOLO 1 URL al final).
- ¿tweet.text contiene URL? Si sí: elimínala (se agrega en código).

GENERA EL JSON AHORA.`;

  const user = `NOTICIA:
TÍTULO: ${params.title}
FUENTE: ${params.source}
URL: ${params.url ?? "null"}
SNIPPET: ${params.snippet ?? "(no disponible)"}
FECHA_ISO: ${getTodayDate()}

GENERA EL JSON AHORA (sin markdown, solo JSON válido).`;

  async function fetchFromClaude(systemPrompt: string, userMsg: string, retryCount = 0): Promise<NewsPack> {
    const maxRetries = 3;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 800,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
        signal: controller.signal as any,
      });

      // Retry on transient errors (429, 500, 502, 503, 529)
      if ([429, 500, 502, 503, 529].includes(res.status) && retryCount < maxRetries) {
        clearTimeout(timeoutId);
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.warn(`⚠️  API error ${res.status}, retrying in ${Math.round(delay/1000)}s... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchFromClaude(systemPrompt, userMsg, retryCount + 1);
      }

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data: any = await res.json();
      let text: string =
        data?.content?.map((c: any) => c?.text).filter(Boolean).join("\n") ?? "";

      // Remove markdown code blocks if present
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\s*```$/, "").trim();

      // Extract JSON - more flexible parsing
      let parsed: any;
      
      try {
        // Try 1: Exact JSON_START/JSON_END markers
        const marked = text.match(/JSON_START\s*([\s\S]*?)\s*JSON_END/);
        if (marked?.[1]) {
          parsed = JSON.parse(marked[1].trim());
        } else {
          // Try 2: Direct parse (full response is JSON)
          parsed = JSON.parse(text);
        }
      } catch (err) {
        // Try 3: Extract first valid JSON object from text
        const jsonMatch = text.match(/\{[\s\S]*\}\s*$/);
        if (!jsonMatch) {
          console.error("[JSON Parse Error] Response:", text.slice(0, 300));
          throw new Error("No valid JSON found");
        }
        parsed = JSON.parse(jsonMatch[0]);
      }

      // Ensure parsed is valid NewsPack
      if (!parsed.tweet || !parsed.visual) {
        throw new Error("Invalid NewsPack structure");
      }

      // IMPORTANT: tweet.text should NOT contain URL (it's added in run_once.ts)
      // Remove URL if LLM accidentally included it
      if (parsed.tweet?.text?.includes(params.url)) {
        parsed.tweet.text = parsed.tweet.text.replace(params.url, "").trim();
      }
      // Store URL separately (not in text)
      parsed.tweet.url = params.url;

      // Ensure thread is array
      if (!Array.isArray(parsed.thread)) {
        parsed.thread = [];
      }

      // Ensure thread tweets are proper objects
      parsed.thread = parsed.thread.map((t: any) => ({
        text: String(t?.text ?? ""),
      }));

      return parsed as NewsPack;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Strict prompt fallback
  const systemStrict = `JSON puro. ESPAÑOL ÚNICO. Sin inglés. Sin placeholders. Solo hechos verificables.
{"mode":"single","language":"es","urgency_tag":"ÚLTIMA HORA","topic_hashtags":["Cuba"],"tweet":{"text":"🚨 ÚLTIMA HORA | [Hecho verificable del title]. [Implicación concreta].","url":"${params.url}"},"thread":[],"visual":{"format":"9:16","brand":"Real Geopolitik","palette":{"bg":"#000000","text":"#FCFCFA","accent":"#E10600"},"header":"ÚLTIMA HORA","headline":"TITULAR EN MAYÚSCULAS","subheadline":"Subtítulo descriptivo","source_line":"Fuente: ${params.source}","date_line":"Fecha: ${getTodayDate()}","image_brief":"Descripción visual sin logos","style_rules":["alto contraste","fondo negro","acento rojo"],"layout_lock":"header_pill_top_left|hero_60pct|red_rule|lower_third_text|footer_source_date"}}
SOLO JSON entre JSON_START/JSON_END. NO inventes datos.`;

  try {
    // Attempt 1: Normal prompt
    let output = await fetchFromClaude(system, user);

    // Validate Spanish
    if (hasEnglish(output.tweet.text)) {
      console.warn(`⚠️  English detected. Retrying strict...`);
      output = await fetchFromClaude(systemStrict, user);
    }

    // Validate length
    if (output.tweet.text.length > 270) {
      console.warn(`⚠️  Tweet too long (${output.tweet.text.length}). Trimming...`);
      output.tweet.text = safeTrim(output.tweet.text, 270);
    }

    // Validate mode
    if (!["single", "thread3"].includes(output.mode)) {
      output.mode = "single";
    }

    // Validate thread count (max 3 total including tweet 1)
    if (output.mode === "thread3" && output.thread.length > 2) {
      output.thread = output.thread.slice(0, 2);
    }

    // Validate hashtags (1-2 max)
    if (output.topic_hashtags.length > 2) {
      output.topic_hashtags = output.topic_hashtags.slice(0, 2);
    }

    // Ensure visual metadata
    if (!output.visual) {
      output.visual = {
        format: "9:16",
        brand: "Real Geopolitik",
        palette: { bg: "#000000", text: "#FCFCFA", accent: "#E10600" },
        header: output.urgency_tag,
        headline: safeTrim(params.title.toUpperCase(), 70),
        subheadline: safeTrim(params.snippet ?? params.source, 110),
        source_line: `Fuente: ${params.source}`,
        date_line: `Fecha: ${getTodayDate()}`,
        image_brief: "Imagen relacionada a la noticia",
        style_rules: [
          "alto contraste",
          "bloque inferior negro sólido",
          "línea roja separadora",
          "tipografía sans condensada bold",
          "sin logos de terceros",
        ],
        layout_lock: "header_pill_top_left|hero_60pct|red_rule|lower_third_text|footer_source_date",
      };
    }

    console.log(
      `✅ Generated: mode="${output.mode}" urgency="${output.urgency_tag}" hashtags=[${output.topic_hashtags.join(",")}]`
    );

    return output;
  } catch (error) {
    console.error(`❌ Generation error: ${(error as Error).message}`);
    return buildFallbackNewsPack(params.title, params.url, params.source);
  }
}

// ============ SPECIALIZED: Cuba + Trump Naval Blockade Template ============
/**
 * Specialized prompt template for "Cuba + naval blockade" stories.
 * CRITICAL: Uses conditional language ("evalúa", "considera", "según reportes")
 * if source does NOT explicitly confirm naval blockade.
 * Always verifiable URL required.
 */
export async function generateCubaTrumpBlockadeNewsPack(params: {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  date?: string;
}): Promise<NewsPack> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  if (!apiKey) {
    return buildFallbackNewsPack(params.title, params.url, params.source);
  }

  // Check if snippet/title explicitly confirms naval blockade
  const text = `${params.title} ${params.snippet ?? ""}`.toLowerCase();
  const explicitBlockade = text.includes("bloqueo naval") || text.includes("bloqueo marítimo") || text.includes("cerco naval");

  const system = `Eres editor de geopolítica para Real Geopolitik.

OBJETIVO
Generar JSON "NewsPack" para X sobre Cuba + endurecimiento de medidas (sanciones, energía, posible cerco marítimo).

REGLAS CRÍTICAS
- 100% español. Prohibido inglés.
- IMPORTANTE: Si la fuente NO confirma explícitamente "bloqueo naval", usa CONDICIONAL: "evalúa", "considera", "según reportes", "plantea".
- Nunca afirmar como hecho sin fuente verificable.
- Default: mode="single" (1 tuit).
- Solo mode="thread3" si hay 2+ actores o contexto crítico.
- Máx 270 caracteres por tuit.
- Hashtags 1-2.

ESTRUCTURA
- Empieza: "${explicitBlockade ? "🚨 ÚLTIMA HORA" : "⚠️ EN DESARROLLO"} |"
- 1 frase: hecho/evaluación según fuente
- 1 frase: implicación geopolítica
- NO incluyas URL (se agrega en código después)
- Hashtags: #Cuba #EEUU (o #Trump si aporta)

METADATOS VISUALES
- Paleta: bg #000000, text #FCFCFA, accent #E10600
- Titular MAYÚSCULAS 12-16 palabras
- Subtítulo 18-22 palabras
- Layout: header_pill_top_left | hero_60pct | red_rule | lower_third_text | footer_source_date
- Prohibido logos terceros

OUTPUT JSON EXACTO
{
  "mode": "single|thread3",
  "language": "es",
  "urgency_tag": "${explicitBlockade ? "ÚLTIMA HORA" : "EN DESARROLLO"}",
  "topic_hashtags": ["Cuba", "EEUU"],
  "tweet": { "text": "...", "url": "${params.url}" },
  "thread": [],
  "visual": {
    "format": "9:16",
    "brand": "Real Geopolitik",
    "palette": { "bg": "#000000", "text": "#FCFCFA", "accent": "#E10600" },
    "header": "${explicitBlockade ? "ÚLTIMA HORA" : "EN DESARROLLO"}",
    "headline": "TITULAR",
    "subheadline": "Subtítulo",
    "source_line": "Fuente: ${params.source}",
    "date_line": "Fecha: ${params.date ?? getTodayDate()}",
    "image_brief": "Descripción visual (sin logos)",
    "style_rules": ["alto contraste", "fondo negro", "acento rojo", "MAYÚSCULAS"],
    "layout_lock": "header_pill_top_left|hero_60pct|red_rule|lower_third_text|footer_source_date"
  }
}`;

  const user = `NOTICIA
TÍTULO: ${params.title}
FUENTE: ${params.source}
URL: ${params.url}
FECHA: ${params.date ?? getTodayDate()}
SNIPPET: ${params.snippet ?? "(no disponible)"}

${explicitBlockade ? "[CONFIRMADO: Fuente menciona 'bloqueo naval' explícitamente]" : "[SIN CONFIRMACIÓN: Usa condicional si no está explícito]"}

Genera el JSON ahora.`;

  async function fetchFromClaude(systemPrompt: string, userMsg: string, retryCount = 0): Promise<NewsPack> {
    const maxRetries = 3;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 800,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
        signal: controller.signal as any,
      });

      // Retry on transient errors (429, 500, 502, 503, 529)
      if ([429, 500, 502, 503, 529].includes(res.status) && retryCount < maxRetries) {
        clearTimeout(timeoutId);
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.warn(`⚠️  API error ${res.status}, retrying in ${Math.round(delay/1000)}s... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchFromClaude(systemPrompt, userMsg, retryCount + 1);
      }

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data: any = await res.json();
      let text: string = data?.content?.map((c: any) => c?.text).filter(Boolean).join("\n") ?? "";

      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\s*```$/, "").trim();

      let parsed: any;
      try {
        const marked = text.match(/JSON_START\s*([\s\S]*?)\s*JSON_END/);
        if (marked?.[1]) {
          parsed = JSON.parse(marked[1].trim());
        } else {
          parsed = JSON.parse(text);
        }
      } catch (err) {
        const jsonMatch = text.match(/\{[\s\S]*\}\s*$/);
        if (!jsonMatch) {
          throw new Error("No valid JSON found");
        }
        parsed = JSON.parse(jsonMatch[0]);
      }

      if (!parsed.tweet || !parsed.visual) {
        throw new Error("Invalid NewsPack structure");
      }

      parsed.tweet.url = params.url;

      if (!Array.isArray(parsed.thread)) {
        parsed.thread = [];
      }

      parsed.thread = parsed.thread.map((t: any) => ({
        text: String(t?.text ?? ""),
      }));

      return parsed as NewsPack;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  try {
    let output = await fetchFromClaude(system, user);

    if (hasEnglish(output.tweet.text)) {
      console.warn(`⚠️  English detected in Cuba+Trump template. Retrying...`);
      output = await fetchFromClaude(system, user);
    }

    if (output.tweet.text.length > 270) {
      console.warn(`⚠️  Cuba+Trump tweet too long (${output.tweet.text.length}). Trimming...`);
      output.tweet.text = safeTrim(output.tweet.text, 270);
    }

    if (!["single", "thread3"].includes(output.mode)) {
      output.mode = "single";
    }

    if (output.mode === "thread3" && output.thread.length > 2) {
      output.thread = output.thread.slice(0, 2);
    }

    if (output.topic_hashtags.length > 2) {
      output.topic_hashtags = output.topic_hashtags.slice(0, 2);
    }

    if (!output.visual) {
      output.visual = {
        format: "9:16",
        brand: "Real Geopolitik",
        palette: { bg: "#000000", text: "#FCFCFA", accent: "#E10600" },
        header: output.urgency_tag,
        headline: safeTrim(`CUBA: ${params.title.toUpperCase()}`, 70),
        subheadline: safeTrim(params.snippet ?? params.source, 110),
        source_line: `Fuente: ${params.source}`,
        date_line: `Fecha: ${params.date ?? getTodayDate()}`,
        image_brief: "Escena geopolítica: mapa región Caribe, banderas Cuba/EEUU",
        style_rules: [
          "alto contraste",
          "paleta RG: negro/rojo",
          "tipografía bold condensada",
          "sin logos terceros",
        ],
        layout_lock: "header_pill_top_left|hero_60pct|red_rule|lower_third_text|footer_source_date",
      };
    }

    console.log(
      `✅ Cuba+Trump NewsPack: mode="${output.mode}" urgency="${output.urgency_tag}" explicit_blockade=${explicitBlockade}`
    );

    return output;
  } catch (error) {
    console.error(`❌ Cuba+Trump generation error: ${(error as Error).message}`);
    return buildFallbackNewsPack(params.title, params.url, params.source);
  }
}
function buildFallbackNewsPack(title: string, url: string, source: string): NewsPack {
  // Add variation to avoid X duplicate detection
  const hooks = [
    "🚨 ÚLTIMA HORA |",
    "⚡ ALERTA |",
    "🔴 AHORA |",
    "📍 NOTICIA |",
    "🌍 GEOPOLÍTICA |",
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  const timestamp = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const tweet = safeTrim(`${hook} ${title} [${timestamp}]`, 270);

  const deriveFallbackHashtagsFromTitle = (rawTitle: string): string[] => {
    const t = (rawTitle || "").toLowerCase();
    const rules: Array<[RegExp, string]> = [
      [/cuba|havana|habana/, "Cuba"],
      [/venezuela|caracas|maduro/, "Venezuela"],
      [/trump/, "Trump"],
      [/iran|teheran|tehran/, "Iran"],
      [/ucrania|kiev|kyiv|rusia|moscu|donbas/, "Ucrania"],
      [/china|beijing|taiwan/, "China"],
      [/israel|gaza|hamas/, "Israel"],
      [/palestina|cisjordania|west bank/, "Palestina"],
      [/sancion|bloqueo|embargo/, "Sanciones"],
      [/otan|nato/, "OTAN"],
    ];

    const tags: string[] = [];
    for (const [re, tag] of rules) {
      if (re.test(t)) tags.push(tag);
    }

    const unique = [...new Set(tags)].slice(0, 2);
    return unique.length > 0 ? unique : ["Geopolitica"];
  };

  return {
    mode: "single",
    language: "es",
    urgency_tag: "ÚLTIMA HORA",
    topic_hashtags: deriveFallbackHashtagsFromTitle(title),
    tweet: { text: tweet, url },
    thread: [],
    visual: {
      format: "9:16",
      brand: "Real Geopolitik",
      palette: { bg: "#000000", text: "#FCFCFA", accent: "#E10600" },
      header: "ÚLTIMA HORA",
      headline: safeTrim(title.toUpperCase(), 70),
      subheadline: safeTrim(source, 110),
      source_line: `Fuente: ${source}`,
      date_line: `Fecha: ${getTodayDate()}`,
      image_brief: "Imagen de la noticia",
      style_rules: [
        "alto contraste",
        "bloque inferior negro sólido",
        "línea roja separadora",
        "tipografía sans condensada bold",
        "sin logos de terceros",
      ],
      layout_lock: "header_pill_top_left|hero_60pct|red_rule|lower_third_text|footer_source_date",
    },
  };
}
