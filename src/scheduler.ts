import "dotenv/config";
import { runOnce } from "./run_once.js";
import { getTodayPostCount } from "./db.js";

const MAX_POSTS_PER_DAY = parseInt(process.env.MAX_POSTS_PER_DAY || "5", 10);
const CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const POST_PROBABILITY = 0.6; // 60% chance to post each run

function shouldPost(): boolean {
  const todayCount = getTodayPostCount();

  if (todayCount >= MAX_POSTS_PER_DAY) {
    console.log(`📊 Daily limit reached (${todayCount}/${MAX_POSTS_PER_DAY})`);
    return false;
  }

  const roll = Math.random();
  const willPost = roll < POST_PROBABILITY;

  console.log(
    `🎲 Roll: ${roll.toFixed(2)} vs ${POST_PROBABILITY} threshold → ${willPost ? "POST" : "SKIP"}`
  );

  return willPost;
}

async function schedulerLoop() {
  console.log("\n" + "=".repeat(60));
  console.log("🕐 GEOPOLITIK SCHEDULER");
  console.log(`   Check interval: ${CHECK_INTERVAL_MS / 1000 / 60 / 60} hours`);
  console.log(`   Post probability: ${POST_PROBABILITY * 100}%`);
  console.log(`   Max posts/day: ${MAX_POSTS_PER_DAY}`);
  console.log("=".repeat(60));

  while (true) {
    const now = new Date();
    console.log(`\n⏰ [${now.toISOString()}] Scheduler check`);

    if (shouldPost()) {
      try {
        await runOnce(false);
      } catch (error) {
        console.error(`❌ Run failed: ${(error as Error).message}`);
      }
    }

    const nextRun = new Date(Date.now() + CHECK_INTERVAL_MS);
    console.log(`\n💤 Next check at: ${nextRun.toISOString()}`);
    await sleep(CHECK_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

schedulerLoop().catch((error) => {
  console.error("Scheduler crashed:", error);
  process.exit(1);
});
