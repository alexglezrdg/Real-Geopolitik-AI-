/**
 * Clean Old Posts from History
 * Removes posts older than N days to allow story recycling
 * Usage: npx tsx clean-old-posts.ts [--days=3]
 */

import * as fs from "fs";
import * as path from "path";

const POSTED_FILE = path.join(process.cwd(), "data", "posted.json");
const DAYS_TO_KEEP = parseInt(process.argv.find(a => a.startsWith("--days="))?.split("=")[1] || "3", 10);
const CUTOFF_TIME = Date.now() - (DAYS_TO_KEEP * 24 * 60 * 60 * 1000);

console.log(`\n🧹 CLEANING OLD POSTS`);
console.log("=".repeat(60));
console.log(`📅 Keeping posts from last ${DAYS_TO_KEEP} days`);
console.log(`🕐 Cutoff time: ${new Date(CUTOFF_TIME).toISOString()}`);

try {
  // Read posted.json
  if (!fs.existsSync(POSTED_FILE)) {
    console.log("❌ posted.json not found!");
    process.exit(1);
  }

  const content = fs.readFileSync(POSTED_FILE, "utf-8");
  const posts = JSON.parse(content);

  if (!Array.isArray(posts)) {
    console.log("❌ posted.json is not an array!");
    process.exit(1);
  }

  console.log(`\n📊 Before: ${posts.length} posts in history`);

  // Filter to keep only recent posts
  const recentPosts = posts.filter(post => {
    const postTime = new Date(post.posted_at).getTime();
    return postTime >= CUTOFF_TIME;
  });

  const removedCount = posts.length - recentPosts.length;

  console.log(`📊 After: ${recentPosts.length} posts remaining`);
  console.log(`🗑️  Removed: ${removedCount} old posts`);

  if (removedCount > 0) {
    console.log("\n🗑️  Removed posts:");
    posts.slice(-removedCount).forEach(post => {
      const age = Math.floor((Date.now() - new Date(post.posted_at).getTime()) / (24 * 60 * 60 * 1000));
      console.log(`   - [${age}d ago] ${post.title.substring(0, 60)}...`);
    });
  }

  // Write back
  fs.writeFileSync(POSTED_FILE, JSON.stringify(recentPosts, null, 2));

  console.log("\n✅ Cleanup complete!");
  console.log(`📁 Saved to ${POSTED_FILE}`);

} catch (error) {
  console.error("❌ Error:", (error as Error).message);
  process.exit(1);
}
