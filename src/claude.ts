import "dotenv/config";

export type ThreadTweet = { text: string; source_urls?: string[] };

function safeTrim(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

export async function generateThreadWithClaude(params: {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  language?: "en" | "es";
}): Promise<ThreadTweet[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Use a model that exists in your account (from your /v1/models output)
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  const lang = params.language || (process.env.LANGUAGE as "en" | "es") || "en";

  // If no key, fallback (so dry-run still works)
  if (!apiKey) {
    const t1 = safeTrim(`🚨 ${params.title}\nSource: ${params.url}`, 270);
    return [
      { text: t1, source_urls: [params.url] },
      { text: safeTrim("Context: developing story. More details soon.", 270) },
      {
        text: safeTrim(
          "What to watch: official statements, verified confirmations, and next moves.",
          270
        ),
      },
    ];
  }

  const system = `You are a geopolitics news desk assistant.
Return ONLY valid JSON. No extra text.

Rules:
- Use ONLY the provided input. If unknown, say so.
- Neutral tone.
- 3 to 7 tweets.
- Each tweet <= 270 chars.
- Tweet 1 must include the source URL.

Return ONLY the JSON payload BETWEEN these markers (no markdown):

JSON_START
{"thread":[{"text":"", "source_urls":[""]}]}
JSON_END`;

  const user = `LANGUAGE: ${lang}
SOURCE: ${params.source}
TITLE: ${params.title}
URL: ${params.url}
SNIPPET: ${params.snippet ?? ""}

Task:
Generate a short X thread (3-7 tweets) with a strong hook and clear facts.
Tweet 1 MUST include the URL.
Output JSON ONLY with key "thread".`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.6,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const text: string =
    data?.content?.map((c: any) => c?.text).filter(Boolean).join("\n") ?? "";

  // Prefer extracting JSON between markers (more reliable)
  let parsed: any;
  const marked = text.match(/JSON_START\s*([\s\S]*?)\s*JSON_END/);
  try {
    if (marked?.[1]) {
      parsed = JSON.parse(marked[1].trim());
    } else {
      parsed = JSON.parse(text);
    }
  } catch {
    // last-resort: attempt to extract last JSON object
    const m = text.match(/\{[\s\S]*\}\s*$/);
    if (!m) throw new Error("Claude did not return valid JSON.");
    parsed = JSON.parse(m[0]);
  }

  const thread = Array.isArray(parsed.thread) ? parsed.thread : [];
  const cleaned: ThreadTweet[] = thread
    .map((t: any) => ({
      text: safeTrim(String(t?.text ?? ""), 270),
      source_urls: Array.isArray(t?.source_urls) ? t.source_urls : undefined,
    }))
    .filter((t: ThreadTweet) => t.text.length > 0);

  if (!cleaned.length) throw new Error("Claude returned empty thread.");

  // Ensure tweet 1 has URL
  if (!cleaned[0].text.includes(params.url)) {
    cleaned[0].text = safeTrim(`${cleaned[0].text}\n${params.url}`, 270);
  }

  return cleaned;
}

