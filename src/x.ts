import crypto from "crypto";
import OAuth from "oauth-1.0a";
import * as fs from "fs";

const API_BASE = "https://api.x.com/2";
const UPLOAD_BASE = "https://upload.twitter.com/1.1";

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

  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return json;
}

/**
 * Upload media (image) to X using v1.1 media upload endpoint
 * Returns media_id_string for use in tweet payload
 */
async function uploadMedia(imagePath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(imagePath)) {
      console.error(`[X] Media file not found: ${imagePath}`);
      return null;
    }

    const imageData = fs.readFileSync(imagePath);
    const base64Data = imageData.toString("base64");
    const mimeType = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

    const oauth = oauthClient();
    const url = `${UPLOAD_BASE}/media/upload.json`;

    // Use form-urlencoded for media upload
    const formBody = `media_data=${encodeURIComponent(base64Data)}`;

    const auth = oauth.toHeader(oauth.authorize({ url, method: "POST" }, token()));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    const json = (await res.json().catch(() => ({}))) as { media_id_string?: string };

    if (!res.ok) {
      console.error(`[X] Media upload failed ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
      return null;
    }

    const mediaId = json.media_id_string;
    if (mediaId) {
      console.log(`[X] Media uploaded successfully: ${mediaId}`);
      return mediaId;
    }
    return null;
  } catch (err) {
    console.error(`[X] Media upload error: ${(err as Error).message}`);
    return null;
  }
}

export async function postTweet(text: string, inReplyTo?: string, mediaId?: string) {
  const payload: any = { text };
  if (inReplyTo) payload.reply = { in_reply_to_tweet_id: inReplyTo };
  if (mediaId) payload.media = { media_ids: [mediaId] };
  const json = await xRequest("POST", `${API_BASE}/tweets`, payload);
  return json?.data?.id as string;
}

/**
 * SAFE BY DEFAULT:
 * - dryRun => never posts
 * - live requires BOTH: (--live or -l) AND X_LIVE=1
 * @param imagePath - Optional path to image file to attach to FIRST tweet
 */
export async function postThread(texts: string[], dryRun = true, imagePath?: string | null): Promise<PostResult> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return { success: false, tweetIds: [], errors: ["Thread is empty"] };
  }

  // 1) dryRun blocks everything
  if (dryRun) {
    console.log("[X] DRY RUN: posting disabled.");
    if (imagePath) console.log(`[X] Would attach image: ${imagePath}`);
    return { success: true, tweetIds: ["dry-run"], errors: [] };
  }

  // 2) live arming switch
  if (!isArmedForLive()) {
    console.log("[X] SAFE MODE: live not armed (need --live AND X_LIVE=1). Posting blocked.");
    if (imagePath) console.log(`[X] Would attach image: ${imagePath}`);
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

  // 4) Upload media if provided (attach to first tweet only)
  let mediaId: string | undefined;
  if (imagePath) {
    console.log(`[X] Uploading media: ${imagePath}`);
    const uploadedId = await uploadMedia(imagePath);
    if (uploadedId) {
      mediaId = uploadedId;
    } else {
      console.warn(`[X] Media upload failed, posting without image`);
    }
  }

  // 5) post
  const ids: string[] = [];
  let prev: string | undefined;

  for (let i = 0; i < texts.length; i++) {
    const t = String(texts[i] ?? "").trim();
    if (!t) continue;
    // Attach media only to the FIRST tweet
    const tweetMediaId = i === 0 ? mediaId : undefined;
    const id = await postTweet(t, prev, tweetMediaId);
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
