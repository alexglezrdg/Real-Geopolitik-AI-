/**
 * Video Integration Module
 * Integrates video content from news sources into X/Twitter posts
 * 
 * Supports:
 * - YouTube clips (embedded)
 * - Direct video uploads to X (MP4, WebM)
 * - Video metadata extraction
 * - Video sourcing from geopolitical news feeds
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";

export interface VideoSource {
  type: "youtube" | "direct_url" | "local_file" | "rss_feed";
  url: string;
  title?: string;
  duration?: number; // in seconds
  thumbnail?: string;
}

export interface VideoMetadata {
  source: VideoSource;
  videoId?: string; // for YouTube
  title: string;
  duration: number;
  thumbnail: string;
  description?: string;
  isValid: boolean;
  error?: string;
}

export interface VideoPost {
  mainTweet: string;
  videoUrl: string;
  hashtags: string[];
  source: string;
  notes: string;
}

// ============ YOUTUBE INTEGRATION ============

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get YouTube video metadata (requires API key in env)
 * Falls back to basic extraction if API unavailable
 */
export async function getYouTubeMetadata(
  videoId: string,
  apiKey?: string
): Promise<VideoMetadata> {
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // If no API key, return basic metadata
  if (!apiKey) {
    return {
      source: { type: "youtube", url: `https://www.youtube.com/watch?v=${videoId}` },
      videoId,
      title: `YouTube Video: ${videoId}`,
      duration: 0, // Unknown without API
      thumbnail,
      isValid: true,
    };
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;

    if (!data.items || data.items.length === 0) {
      return {
        source: { type: "youtube", url: `https://www.youtube.com/watch?v=${videoId}` },
        videoId,
        title: `YouTube Video: ${videoId}`,
        duration: 0,
        thumbnail,
        isValid: false,
        error: "Video not found",
      };
    }

    const video = data.items[0];
    const durationStr = video.contentDetails.duration; // PT format
    const duration = parseISO8601Duration(durationStr);

    return {
      source: { type: "youtube", url: `https://www.youtube.com/watch?v=${videoId}` },
      videoId,
      title: video.snippet.title,
      duration,
      thumbnail,
      description: video.snippet.description,
      isValid: duration <= 600 && duration > 0, // Valid: 10sec to 10min
    };
  } catch (error) {
    console.error(`[VIDEO] YouTube API error:`, error);
    return {
      source: { type: "youtube", url: `https://www.youtube.com/watch?v=${videoId}` },
      videoId,
      title: `YouTube Video: ${videoId}`,
      duration: 0,
      thumbnail,
      isValid: false,
      error: `API error: ${String(error)}`,
    };
  }
}

/**
 * Parse ISO8601 duration (PT5M30S = 5:30)
 */
function parseISO8601Duration(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);

  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// ============ DIRECT VIDEO URL ============

/**
 * Validate if URL is a direct video link (MP4, WebM, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
  const urlPath = new URL(url).pathname.toLowerCase();
  return videoExtensions.some((ext) => urlPath.endsWith(ext));
}

/**
 * Get metadata for direct video files
 */
export async function getDirectVideoMetadata(url: string): Promise<VideoMetadata> {
  try {
    // For now, return basic metadata
    // In production, would extract duration, codec, etc.
    return {
      source: { type: "direct_url", url },
      title: new URL(url).pathname.split("/").pop() || "Direct Video",
      duration: 0, // Would need ffprobe to get actual duration
      thumbnail: "", // Could generate via ffmpeg
      isValid: isDirectVideoUrl(url),
    };
  } catch (error) {
    return {
      source: { type: "direct_url", url },
      title: "Direct Video",
      duration: 0,
      thumbnail: "",
      isValid: false,
      error: `Invalid URL: ${String(error)}`,
    };
  }
}

// ============ LOCAL FILE HANDLING ============

/**
 * Handle local video files (validates file exists and is readable)
 */
export async function getLocalVideoMetadata(filePath: string): Promise<VideoMetadata> {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        source: { type: "local_file", url: filePath },
        title: path.basename(filePath),
        duration: 0,
        thumbnail: "",
        isValid: false,
        error: "File not found",
      };
    }

    const stat = fs.statSync(filePath);
    const isValid = stat.isFile() && stat.size > 0;

    return {
      source: { type: "local_file", url: filePath },
      title: path.basename(filePath),
      duration: 0, // Would need ffprobe
      thumbnail: "",
      isValid,
    };
  } catch (error) {
    return {
      source: { type: "local_file", url: filePath },
      title: path.basename(filePath),
      duration: 0,
      thumbnail: "",
      isValid: false,
      error: `File error: ${String(error)}`,
    };
  }
}

// ============ RSS FEED VIDEO EXTRACTION ============

/**
 * Extract video URLs from RSS feed items
 * Looks for: enclosure, media:content, media:thumbnail, video tags
 */
export function extractVideoFromRSSItem(item: any): VideoSource | null {
  // Check for enclosure (standard RSS video)
  if (item.enclosure && item.enclosure.type?.includes("video")) {
    return {
      type: "direct_url",
      url: item.enclosure.url,
      title: item.title,
      duration: parseInt(item.enclosure.duration, 10),
    };
  }

  // Check for media:content (Media RSS extension)
  if (item["media:content"]) {
    const mediaContent = Array.isArray(item["media:content"])
      ? item["media:content"][0]
      : item["media:content"];
    if (mediaContent.type?.includes("video")) {
      return {
        type: "direct_url",
        url: mediaContent.url || mediaContent["$"]?.url,
        title: item.title,
        duration: parseInt(mediaContent.duration, 10),
      };
    }
  }

  // Check for media:thumbnail
  if (item["media:thumbnail"]) {
    const thumbnail = Array.isArray(item["media:thumbnail"])
      ? item["media:thumbnail"][0]
      : item["media:thumbnail"];
    return {
      type: "direct_url",
      url: thumbnail.url || thumbnail["$"]?.url,
      title: item.title,
    };
  }

  // Check for YouTube links in description
  if (item.description) {
    const youtubeMatch = item.description.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/\S+/
    );
    if (youtubeMatch) {
      return {
        type: "youtube",
        url: youtubeMatch[0],
        title: item.title,
      };
    }
  }

  // Check for direct video links in description
  if (item.description) {
    const videoMatch = item.description.match(/https?:\/\/[^\s<>"]*\.(?:mp4|webm|mov)/i);
    if (videoMatch) {
      return {
        type: "direct_url",
        url: videoMatch[0],
        title: item.title,
      };
    }
  }

  return null;
}

// ============ VIDEO POST COMPOSITION ============

/**
 * Compose a Twitter post with video
 * Format: Title + metadata + link
 */
export function composeVideoPost(
  headline: string,
  videoMetadata: VideoMetadata,
  source: string,
  entities: string[],
  region: string
): VideoPost {
  const mainActor = entities[0] || "Noticia";
  const emoji = region === "LATAM" ? "🌎" : region === "MIDDLE_EAST" ? "🕌" : "🌍";

  // Main tweet text
  const mainTweet =
    `🎥 VÍDEO | ${emoji} ${mainActor}\n\n` +
    `${headline}\n\n` +
    `📍 ${source}\n` +
    `⏱️ Duración: ${videoMetadata.duration > 0 ? formatDuration(videoMetadata.duration) : "Variable"}\n`;

  // Hashtags for video content
  const hashtags = ["#Breaking", "#News", "#Geopolitics", "#Video"];

  // Notes for poster
  const notes = `Video metadata: ${videoMetadata.title} | Duration: ${videoMetadata.duration}s | Valid: ${videoMetadata.isValid}`;

  return {
    mainTweet,
    videoUrl: videoMetadata.source.url,
    hashtags: hashtags.slice(0, 3),
    source,
    notes,
  };
}

/**
 * Format duration in human-readable format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// ============ NEWS PICKER VIDEO INTEGRATION ============

/**
 * Extract video from news article (article object with content)
 * Looks for embedded video, media elements, etc.
 */
export function extractVideoFromNewsArticle(article: any): VideoSource | null {
  // Check for video URL in article
  if (article.videoUrl) {
    return {
      type: "direct_url",
      url: article.videoUrl,
      title: article.title,
    };
  }

  // Check for YouTube URL in content
  if (article.content && typeof article.content === "string") {
    const youtubeMatch = article.content.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/\S+/
    );
    if (youtubeMatch) {
      return {
        type: "youtube",
        url: youtubeMatch[0],
        title: article.title,
      };
    }
  }

  // Check media array
  if (article.media && Array.isArray(article.media)) {
    for (const media of article.media) {
      if (media.type === "video" || media.url?.includes("mp4")) {
        return {
          type: "direct_url",
          url: media.url,
          title: article.title,
        };
      }
    }
  }

  return null;
}

// ============ X API COMPATIBILITY ============

/**
 * Check if video can be posted to X (Twitter)
 * Rules:
 * - Max 4GB for Premium, 512MB for regular
 * - Max 4 hours for Premium, 140 seconds for regular
 * - Formats: MP4, WEBM, MOV (H.264/H.265 codec)
 */
export function isXCompatible(videoMetadata: VideoMetadata, isPremium: boolean = false): boolean {
  if (!videoMetadata.isValid) return false;

  const maxDuration = isPremium ? 4 * 3600 : 140; // seconds
  const maxFileSize = isPremium ? 4 * 1024 * 1024 * 1024 : 512 * 1024 * 1024; // bytes

  // Check duration
  if (videoMetadata.duration > 0 && videoMetadata.duration > maxDuration) {
    return false;
  }

  // For direct URLs, we can't check file size without HEAD request
  // For local files, we would check fs.statSync()

  return true;
}

// ============ EXPORT SUMMARY ============

export const VideoIntegration = {
  extractYouTubeId,
  getYouTubeMetadata,
  isDirectVideoUrl,
  getDirectVideoMetadata,
  getLocalVideoMetadata,
  extractVideoFromRSSItem,
  extractVideoFromNewsArticle,
  composeVideoPost,
  isXCompatible,
};
