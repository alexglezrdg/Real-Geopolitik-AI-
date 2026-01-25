import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DATA_DIR, "bot.sqlite");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);

function initDb() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS posted_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      url_hash TEXT NOT NULL UNIQUE,
      source TEXT,
      title TEXT,
      posted_at TEXT NOT NULL,
      tweet_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_posted_at ON posted_items(posted_at);
  `);
}
initDb();

export function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

export function isAlreadyPosted(url: string): boolean {
  const h = hashUrl(url);
  const row = db.prepare("SELECT 1 FROM posted_items WHERE url_hash = ?").get(h);
  return !!row;
}

export function markPosted(params: {
  url: string;
  source?: string;
  title?: string;
  tweetId?: string;
}): void {
  const now = new Date().toISOString();
  const h = hashUrl(params.url);
  db.prepare(
    `INSERT OR IGNORE INTO posted_items (url, url_hash, source, title, posted_at, tweet_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(params.url, h, params.source ?? null, params.title ?? null, now, params.tweetId ?? null);
}

export function getTodayPostCount(): number {
  // UTC day (good enough for limiting)
  const today = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM posted_items WHERE substr(posted_at, 1, 10) = ?`)
    .get(today) as { c: number };
  return row?.c ?? 0;
}
