import crypto from "crypto";
import OAuth from "oauth-1.0a";

const API_BASE = "https://api.x.com/2";

type PostResult = { success: boolean; tweetIds: string[]; errors: string[] };
type XEnvCheck = { ok: boolean; missing: string[] };

const REQUIRED_X_ENV = [
  "X_CONSUMER_KEY",
  "X_CONSUMER_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
] as const;

export function validateXEnv(env: NodeJS.ProcessEnv = process.env): XEnvCheck {
  const missing = REQUIRED_X_ENV.filter((k) => !env[k] || String(env[k]).trim().length === 0);
  return { ok: missing.length === 0, missing: [...missing] };
}

function isArmedForLive(): boolean {
  const hasCli = process.argv.includes("--live") || process.argv.includes("-l");
  const v = (process.env.X_LIVE ?? "").toLowerCase().trim();
  const hasEnv = v === "1" || v === "true" || v === "yes";
  return hasCli && hasEnv;
}

function oauthClient() {
  const key = process.env.X_CONSUMER_KEY!;
  const secret = process.env.X_CONSUMER_SECRET!;
  if (!key || !secret) throw new Error("Missing X_CONSUMER_KEY / X_CONSUMER_SECRET");

  return new OAuth({
    consumer: { key, secret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, keyStr: string) {
      return crypto.createHmac("sha1", keyStr).update(baseString).digest("base64");
    },
  });
}

function token() {
  const key = process.env.X_ACCESS_TOKEN!;
  const secret = process.env.X_ACCESS_TOKEN_SECRET!;
  if (!key || !secret) throw new Error("Missing X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET");
  return { key, secret };
}

async function xRequest(method: "GET" | "POST", url: string, body?: any) {
  const oauth = oauthClient();
  const auth = oauth.toHeader(oauth.authorize({ url, method }, token()));

  const res = await fetch(url, {
    method,
    headers: {
      ...auth,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return json;
}

export async function postTweet(text: string, inReplyTo?: string) {
  const payload: any = { text };
  if (inReplyTo) payload.reply = { in_reply_to_tweet_id: inReplyTo };
  const json = await xRequest("POST", `${API_BASE}/tweets`, payload);
  return json?.data?.id as string;
}

/**
 * SAFE BY DEFAULT:
 * - dryRun => never posts
 * - live requires BOTH: (--live or -l) AND X_LIVE=1
 */
export async function postThread(texts: string[], dryRun = true): Promise<PostResult> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return { success: false, tweetIds: [], errors: ["Thread is empty"] };
  }

  // 1) dryRun blocks everything
  if (dryRun) {
    console.log("[X] DRY RUN: posting disabled.");
    return { success: true, tweetIds: ["dry-run"], errors: [] };
  }

  // 2) live arming switch
  if (!isArmedForLive()) {
    console.log("[X] SAFE MODE: live not armed (need --live AND X_LIVE=1). Posting blocked.");
    return { success: true, tweetIds: ["safe-mode"], errors: [] };
  }

  // 3) env validation
  const envCheck = validateXEnv();
  if (!envCheck.ok) {
    console.error("[X] Missing required env vars (names only):");
    envCheck.missing.forEach((n) => console.error(`  - ${n}`));
    return {
      success: false,
      tweetIds: [],
      errors: [`Missing env vars: ${envCheck.missing.join(", ")}`],
    };
  }

  // 4) post
  const ids: string[] = [];
  let prev: string | undefined;

  for (let i = 0; i < texts.length; i++) {
    const t = String(texts[i] ?? "").trim();
    if (!t) continue;
    const id = await postTweet(t, prev);
    ids.push(id);
    prev = id;
  }

  if (ids.length === 0) return { success: false, tweetIds: [], errors: ["All tweets were empty"] };
  return { success: true, tweetIds: ids, errors: [] };
}

export async function testConnection() {
  const json = await xRequest("GET", `${API_BASE}/users/me`);
  return json?.data;
}
