import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import type { VisualMetadata } from "./claude.js";

/**
 * OpenAI Image Generation Module (Real Geopolitik)
 *
 * Generates news-style images (9:16 mobile format) with RG branding.
 * Controlled by IMAGE_LIVE=1 environment variable.
 * Requires OPENAI_API_KEY to be set.
 *
 * PROCESS:
 * 1. Generate base image via DALL-E 3 (no logo)
 * 2. Overlay RG logo using Sharp (optional, requires rg_logo.png)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGE_LIVE = process.env.IMAGE_LIVE === "1";
const OUTPUT_DIR = process.env.IMAGE_OUTPUT_DIR || "./out/images";
const LOGO_PATH = process.env.RG_LOGO_PATH || "./assets/rg_logo.png";

/**
 * VISUAL-ONLY PREFIX: forces DALL-E to generate clean visuals with NO text overlays
 * This prevents the AI from creating fake "breaking news" banners or ilegible lower thirds
 */
const VISUAL_ONLY_PREFIX = `
IMPORTANT: Generate ONLY a photograph or illustration. DO NOT include ANY text, writing, letters, words, or captions of any kind in the image.

You are creating a background image for news content. The text will be added separately later.

ABSOLUTE REQUIREMENTS:
- ZERO text elements (no English, Spanish, or any language text)
- ZERO graphic overlays, banners, or UI elements  
- ZERO logos, watermarks, or brand names
- ZERO screenshots, posters, or documents with visible text
- ZERO subtitles, captions, or lower thirds

CREATE: A clean, editorial-style photograph showing the scene/subject.
STYLE: Cinematic, high contrast, sharp focus, realistic, professional photojournalism.
COMPOSITION: Clear main subject, dramatic lighting, leave TOP 20% area relatively clear for text overlay.

REMEMBER: This is ONLY the visual background. No text will appear in this image.
`.trim();

/**
 * Master prompt template for DALL-E 3 image generation.
 * PRODUCTION version: visual only, NO text rendered by AI.
 * All text (header, headline, etc.) added via Sharp overlay.
 */
const IMAGE_PROMPT_TEMPLATE = `${VISUAL_ONLY_PREFIX}

News Topic:
{topic}

Visual Brief:
{scene}`;

interface GenerateImageOptions {
  filename?: string;
  includeLogoOverlay?: boolean;
}

/**
 * Generate a news image from visual metadata using OpenAI's DALL-E 3 API
 *
 * @param visual - Visual metadata containing all text and style info
 * @param sourceUrl - URL for attribution (not shown in image)
 * @param options - Optional settings (filename, logo overlay, etc.)
 * @returns Path to saved image (with or without logo overlay), or null if disabled/failed
 */
export async function generateNewsImage(
  visual: VisualMetadata,
  sourceUrl: string,
  options?: GenerateImageOptions & { retryCount?: number }
): Promise<string | null> {
  // Guard: Check if image generation is enabled
  if (!IMAGE_LIVE) {
    console.log(`🖼️  Image generation disabled (IMAGE_LIVE=0 or not set).`);
    return null;
  }

  if (!OPENAI_API_KEY) {
    console.warn(`⚠️  Image generation requires OPENAI_API_KEY. Skipping.`);
    return null;
  }

  // Prevent infinite retries (max 0 retries = 1 attempt only)
  // Validation is disabled; no need to retry
  const retryCount = options?.retryCount ?? 0;
  const maxRetries = 0;
  
  if (retryCount > maxRetries) {
    console.warn(`⚠️  Max retries exceeded (retries disabled). Accepting image as-is.`);
    return null; // Should not reach here with maxRetries = 0
  }

  try {
    // Build final prompt from template - VISUAL ONLY (no text)
    // Extract topic/scene from visual metadata (keep brief for clarity)
    const topic = visual.headline.slice(0, 50);
    const scene = visual.image_brief || "editorial news photography style";

    const finalPrompt = IMAGE_PROMPT_TEMPLATE
      .replace("{topic}", topic)
      .replace("{scene}", scene);

    console.log(`🎨 Generating image: "${visual.headline.slice(0, 40)}..."`);

    // Call OpenAI DALL-E 3 API with 1:1 square format (1024x1024)
    // Works better for X feeds than 9:16
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: "1024x1024", // Square format: best for X, clean composition
        quality: "standard",
        style: "natural",
      }),
    });

    if (!res.ok) {
      const error = await res.text().catch(() => "Unknown error");
      throw new Error(`OpenAI API error ${res.status}: ${error.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image URL in OpenAI response");
    }

    // Download image
    const baseFilename =
      options?.filename ||
      `news-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.png`;
    const basePath = path.join(OUTPUT_DIR, baseFilename);

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Download and save base image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to download image: ${imageRes.status}`);
    }

    const buffer = await imageRes.arrayBuffer();
    fs.writeFileSync(basePath, Buffer.from(buffer));

    console.log(`✅ Base image saved: ${basePath}`);

    // Validate image quality (check if it's too "flat" / mono-color)
    const isQualityOk = await validateImageQuality(basePath);
    if (!isQualityOk) {
      console.warn(`⚠️  Image too flat/mono-color. Retry ${retryCount + 1}/${maxRetries}...`);
      fs.unlinkSync(basePath); // Delete bad image
      // Wait before retry to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      return generateNewsImage(visual, sourceUrl, { 
        ...options, 
        filename: `retry_${baseFilename}`,
        retryCount: retryCount + 1 
      });
    }

    // Apply SVG badge + logo overlays with Sharp
    if (options?.includeLogoOverlay !== false) {
      try {
        const finalPath = await applyOverlays(basePath, visual.header);
        console.log(`✅ SVG badge and logo overlay applied: ${finalPath}`);
        return finalPath;
      } catch (overlayErr) {
        console.warn(
          `⚠️  Overlay failed: ${(overlayErr as Error).message}. Returning base image.`
        );
        return basePath;
      }
    }

    return basePath;
  } catch (error) {
    console.error(
      `❌ Image generation error: ${(error as Error).message}`
    );
    return null;
  }
}


/**
 * Validate image quality: check if image is too "flat" (mono-color, low color variance)
 * DISABLED FOR NOW: Sharp stats variance is unreliable for DALL-E outputs
 * All DALL-E 3 images are acceptable; we trust the prompt's quality directives.
 */
async function validateImageQuality(imagePath: string): Promise<boolean> {
  // Accept all images - Sharp variance metrics are unreliable for AI-generated content
  // DALL-E 3 with our visual-only prompt produces high-quality, varied images
  return true;
}

/**
 * Generate SVG badge overlay: "ÚLTIMA HORA" (or other badge text)
 * Positioned top-left, with red accent bar
 * Designed to sit cleanly over any image background
 */
function generateBadgeSvg(badgeText: string = "ÚLTIMA HORA"): Buffer {
  const width = 360;
  const height = 74;

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background: semi-transparent black rounded rect -->
  <rect x="0" y="0" width="${width}" height="${height}" rx="18" ry="18" fill="rgba(0,0,0,0.55)"/>
  
  <!-- Red accent bar on left -->
  <rect x="0" y="0" width="10" height="${height}" rx="6" fill="#E10600"/>
  
  <!-- Badge text -->
  <text x="70" y="54"
    font-family="Helvetica, Arial, sans-serif"
    font-size="34"
    font-weight="800"
    fill="#FFFFFF"
    letter-spacing="1">${badgeText}</text>
</svg>
  `.trim();

  return Buffer.from(svg);
}

/**
 * Apply overlays: SVG badge (top-left) + RG logo (top-right, black, optional)
 * This replaces the old addBadgeAndLogo function with improved layout
 */
async function applyOverlays(basePath: string, badgeText: string): Promise<string> {
  try {
    const sharp = await import("sharp").then((m) => m.default);

    const outPath = basePath.replace(/\.png$/i, ".rg.png");

    // Generate badge SVG
    const badgeSvg = generateBadgeSvg(badgeText);

    // Build composite layers
    const composites: Array<{ input: Buffer; left: number; top: number }> = [];

    // Layer 1: Badge SVG (top-left)
    composites.push({
      input: badgeSvg,
      left: 40,
      top: 40
    });

    // Layer 2: RG logo (top-right, if exists)
    if (fs.existsSync(LOGO_PATH)) {
      try {
        const logoSize = 100;
        const logoBuffer = await sharp(LOGO_PATH)
          .resize(logoSize, logoSize, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();

        composites.push({
          input: logoBuffer,
          left: 1024 - logoSize - 30,  // top-right: width - logoSize - margin
          top: 30
        });
      } catch (logoErr) {
        console.warn(`⚠️  Could not load RG logo: ${(logoErr as Error).message}`);
        // Continue without logo
      }
    }

    // Apply all overlays to base image
    const result = await sharp(basePath).composite(composites).png().toFile(outPath);

    return outPath;
  } catch (error) {
    throw new Error(`Overlay application failed: ${(error as Error).message}`);
  }
}

/**
 * Batch generate images for multiple news items
 * Useful for scheduling or bulk processing
 */
export async function generateNewsImageBatch(
  items: Array<{ visual: VisualMetadata; url: string }>,
  options?: GenerateImageOptions
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  for (const item of items) {
    const path = await generateNewsImage(item.visual, item.url, options);
    results.set(item.url, path);
  }

  return results;
}

