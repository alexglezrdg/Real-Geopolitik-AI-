/**
 * Manual Cuba Blockade Post Generator
 * Uses the specialized Cuba+Trump template from claude.ts
 */

import { generateCubaTrumpBlockadeNewsPack } from "./src/claude.js";
import { postThread } from "./src/x.js";
import * as path from "path";

const FORCE_LIVE = process.env.X_LIVE === "1";
const FORCE_IMAGE = process.env.IMAGE_LIVE === "1";

async function publishCubaBlockadePost() {
  try {
    console.log("\n🚨 CUBA BLOCKADE POST - MANUAL GENERATION");
    console.log("=".repeat(60));

    // Story about Trump considering naval blockade on Cuba
    const cubaStory = {
      title: "Trump Administration Evaluates Naval Blockade Against Cuba",
      url: "https://www.reuters.com/world/americas/2026/01/26/trump-cuba-naval/",
      source: "Reuters",
      snippet: "Strategic military pressure tactic under consideration as part of hardline Cuba policy"
    };

    console.log(`\n📰 Story: ${cubaStory.title}`);
    console.log(`🔗 Source: ${cubaStory.source}`);

    // Generate NewsPack using Cuba+Trump specialized template
    console.log("\n🤖 Generating NewsPack with Cuba+Trump specialized prompt...");
    const newsPack = await generateCubaTrumpBlockadeNewsPack(cubaStory);

    console.log("\n✅ NewsPack Generated:");
    console.log(`   Mode: ${newsPack.mode}`);
    console.log(`   Urgency: ${newsPack.urgency_tag}`);
    console.log(`   Hashtags: ${newsPack.topic_hashtags?.join(", ")}`);
    console.log(`   Tweet preview: ${newsPack.tweet.text.substring(0, 100)}...`);

    // Show what would be posted
    console.log("\n📝 TWEET PREVIEW:");
    console.log("─".repeat(60));
    console.log(newsPack.tweet.text);
    console.log("─".repeat(60));

    if (FORCE_LIVE) {
      console.log("\n🚀 POSTING TO X (LIVE MODE)...");
      
      // For Cuba story, prepare image path if available
      let imagePath: string | null = null;
      if (FORCE_IMAGE) {
        // Would generate image here
        imagePath = "./out/images/news-cuba-blockade.rg.png";
        console.log(`📸 Image will be generated and attached`);
      }

      // Post the thread
      const result = await postThread(
        [newsPack.tweet.text],
        FORCE_LIVE,
        imagePath,
        null // no video URL
      );

      if (result.success) {
        console.log("\n✅ POSTED TO X!");
        console.log(`View: https://x.com/i/status/${result.tweetId}`);
      } else {
        console.log(`\n❌ Failed to post: ${result.error}`);
      }
    } else {
      console.log("\n[DRY RUN] Not posting (use X_LIVE=1 to post)");
    }

    console.log("\n✅ Cuba blockade post generation complete!");

  } catch (error) {
    console.error("\n❌ Error:", (error as Error).message);
    process.exit(1);
  }
}

publishCubaBlockadePost();
