#!/usr/bin/env npx tsx
/**
 * Post Video - Publica un video de YouTube como tweet
 * 
 * Uso:
 *   npx tsx post-video.ts                    # Busca y muestra videos disponibles
 *   npx tsx post-video.ts --post             # Publica el mejor video encontrado
 *   npx tsx post-video.ts --url "URL"        # Publica un video específico
 *   npx tsx post-video.ts --topic "cuba"     # Busca videos sobre un tema
 */

import * as dotenv from "dotenv";
dotenv.config();

import { searchGeopoliticalVideos, formatVideoTweet, VideoResult } from "./src/video_search.js";
import { postTweet, testConnection } from "./src/x.js";

const LIVE = process.env.X_LIVE === "1" || process.argv.includes("--live");
const POST = process.argv.includes("--post");

async function main() {
  console.log("=".repeat(60));
  console.log("🎬 VIDEO POST - Real Geopolitik");
  console.log(`Mode: ${LIVE ? "LIVE" : "DRY RUN"}`);
  console.log("=".repeat(60));
  
  // Check for specific URL
  const urlArgIndex = process.argv.indexOf("--url");
  if (urlArgIndex !== -1 && process.argv[urlArgIndex + 1]) {
    const url = process.argv[urlArgIndex + 1];
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    
    if (!videoId) {
      console.error("❌ URL de YouTube inválida");
      process.exit(1);
    }
    
    const video: VideoResult = {
      title: "Video compartido",
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      channelName: "YouTube",
      publishedAt: new Date().toISOString(),
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
    
    await postVideo(video);
    return;
  }
  
  // Check for topic search
  const topicArgIndex = process.argv.indexOf("--topic");
  const topic = topicArgIndex !== -1 ? process.argv[topicArgIndex + 1] : null;
  const keywords = topic ? topic.split(",").map(k => k.trim()) : ["trump", "cuba", "venezuela", "maduro"];
  
  console.log(`\n🔍 Buscando videos: ${keywords.join(", ")}\n`);
  
  const videos = await searchGeopoliticalVideos(keywords, 10);
  
  if (videos.length === 0) {
    console.log("❌ No se encontraron videos geopolíticos recientes");
    process.exit(1);
  }
  
  // Show available videos
  console.log("\n📹 Videos encontrados:\n");
  videos.forEach((v, i) => {
    const date = new Date(v.publishedAt);
    const ago = getTimeAgo(date);
    console.log(`  ${i + 1}. [${ago}] ${v.title.slice(0, 60)}...`);
    console.log(`     Canal: ${v.channelName}`);
    console.log(`     URL: ${v.url}\n`);
  });
  
  if (POST || LIVE) {
    // Post the first (most recent) video
    await postVideo(videos[0]);
  } else {
    console.log("=".repeat(60));
    console.log("Para publicar, ejecuta:");
    console.log("  npx tsx post-video.ts --post --live");
    console.log("  npx tsx post-video.ts --url 'URL_DEL_VIDEO' --live");
  }
}

async function postVideo(video: VideoResult) {
  console.log("\n" + "=".repeat(60));
  console.log("📤 Preparando publicación...\n");
  
  const tweet = formatVideoTweet(video);
  
  console.log("Tweet a publicar:");
  console.log("-".repeat(40));
  console.log(tweet);
  console.log("-".repeat(40));
  console.log(`Caracteres: ${tweet.length}/280`);
  
  if (!LIVE) {
    console.log("\n⚠️  DRY RUN - No se publicará");
    console.log("Para publicar en vivo: X_LIVE=1 npx tsx post-video.ts --post");
    return;
  }
  
  // Test connection
  console.log("\n🔗 Verificando conexión a X...");
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Error de conexión a X");
    process.exit(1);
  }
  
  // Post
  console.log("📤 Publicando...");
  try {
    const result = await postTweet(tweet);
    console.log("\n✅ Video publicado!");
    console.log(`   Ver: https://x.com/i/status/${(result as any)?.data?.id || "unknown"}`);
  } catch (e) {
    console.error("❌ Error al publicar:", (e as Error).message);
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

main().catch(console.error);
