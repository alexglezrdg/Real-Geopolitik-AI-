import * as fs from "fs";
import * as path from "path";

/**
 * Image Composer - MODO B (DETERMINÍSTICO)
 * 
 * Composes final image using:
 * - DALL·E image as background
 * - Local portrait PNG/JPG as foreground
 * - Overlays (badge + logo)
 * 
 * Falls back to DALL·E FULL if composition fails
 */

interface ComposeOptions {
  dalleImagePath: string;
  portraitPath: string;
  badgeText: string;
  outputFilename?: string;
}

interface ComposeResult {
  success: boolean;
  finalPath?: string;
  error?: string;
}

/**
 * Compose final image: DALL·E bg + portrait + overlays
 * 
 * Layout (estilo uHN minimalista):
 * - DALL·E image: full background (1024x1024)
 * - Portrait: positioned right side, 40% width, vertically centered
 * - NO badge arriba (eliminado para minimalismo)
 * - Logo: centro-abajo (RG logo cuadrado rojo)
 * - Línea roja horizontal arriba del texto
 * - Texto grande abajo: headline blanco MAYÚSCULAS bold
 * 
 * @param options - Composition parameters
 * @returns Result with final path or error
 */
export async function composeImage(options: ComposeOptions): Promise<ComposeResult> {
  try {
    const sharp = await import("sharp").then((m) => m.default);

    // Validate inputs
    if (!fs.existsSync(options.dalleImagePath)) {
      return { success: false, error: `DALL·E image not found: ${options.dalleImagePath}` };
    }

    if (!fs.existsSync(options.portraitPath)) {
      return { success: false, error: `Portrait not found: ${options.portraitPath}` };
    }

    // Output path
    const outputDir = path.dirname(options.dalleImagePath);
    const outputFilename = options.outputFilename || path.basename(options.dalleImagePath).replace(".png", ".composed.png");
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`[IMG COMPOSER] Starting composition...`);
    console.log(`[IMG COMPOSER]   BG: ${path.basename(options.dalleImagePath)}`);
    console.log(`[IMG COMPOSER]   Portrait: ${path.basename(options.portraitPath)}`);

    // Load DALL·E background
    const bgImage = sharp(options.dalleImagePath);
    const bgMetadata = await bgImage.metadata();
    const bgWidth = bgMetadata.width || 1024;
    const bgHeight = bgMetadata.height || 1024;

    // Prepare portrait: resize to 40% of image width, maintain aspect ratio
    const portraitWidth = Math.floor(bgWidth * 0.4);
    const portraitBuffer = await sharp(options.portraitPath)
      .resize(portraitWidth, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    // Get portrait dimensions after resize
    const portraitMetadata = await sharp(portraitBuffer).metadata();
    const portraitHeight = portraitMetadata.height || 0;

    // Position portrait: right side, vertically centered
    const portraitLeft = bgWidth - portraitWidth - 40; // 40px margin from right
    const portraitTop = Math.floor((bgHeight - portraitHeight) / 2);

    // === NUEVO DISEÑO uHN MINIMALISTA ===
    // NO badge arriba (eliminado)
    // Logo centro-abajo + línea roja + texto grande

    // Generate uHN-style lower third overlay (logo + red line + text)
    const lowerThirdSvg = generateUHNLowerThird(options.badgeText, bgWidth, bgHeight);
    
    // Convert SVG to PNG using sharp
    const lowerThirdBuffer = await sharp(Buffer.from(lowerThirdSvg), { density: 300 })
      .png()
      .toBuffer()
      .catch((err) => {
        console.warn(`[IMG COMPOSER] Lower third rendering failed: ${err.message}`);
        return null;
      });

    // Build composite layers
    const composites: Array<{ input: Buffer; left: number; top: number }> = [];

    // Layer 1: Portrait (right side, centered)
    composites.push({
      input: portraitBuffer,
      left: portraitLeft,
      top: portraitTop,
    });

    // Layer 2: Lower third overlay (uHN style) - full width, bottom
    if (lowerThirdBuffer) {
      composites.push({
        input: lowerThirdBuffer,
        left: 0,
        top: 0, // Full overlay, positioned absolutely within SVG
      });
    }

    // Compose final image
    await sharp(options.dalleImagePath)
      .composite(composites)
      .toFile(outputPath);

    console.log(`[IMG COMPOSER] ✅ Composition complete: ${outputPath}`);

    return {
      success: true,
      finalPath: outputPath,
    };
  } catch (error) {
    const msg = (error as Error).message;
    console.error(`[IMG COMPOSER] ❌ Composition failed: ${msg}`);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Generate SVG badge overlay: "ÚLTIMA HORA" (or other badge text)
 * Positioned top-left, with red accent bar
 * Simple, clean design that renders clearly with proper text rendering
 * 
 * DEPRECATED: Replaced by generateUHNLowerThird for minimalista uHN style
 */
function generateBadgeSvg(badgeText: string = "ÚLTIMA HORA"): Buffer {
  const width = 360;
  const height = 75;
  const textY = 50; // Baseline for text

  // Create SVG with explicit text properties for better rendering
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Dark background with rounded corners -->
  <rect width="${width}" height="${height}" fill="rgb(20, 20, 20)" opacity="0.85" rx="8"/>
  
  <!-- Red left accent bar -->
  <rect width="6" height="${height}" fill="rgb(220, 20, 60)" rx="3"/>
  
  <!-- Badge text: bold, high contrast -->
  <text x="20" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="start">
    ${badgeText}
  </text>
</svg>`;

  return Buffer.from(svg);
}

/**
 * Generate uHN-style lower third overlay
 * 
 * Layout (inspirado en imágenes adjuntas uHN):
 * - Logo rojo cuadrado centro-abajo (RG)
 * - Línea roja horizontal arriba del texto
 * - Texto GRANDE MAYÚSCULAS blanco bold debajo de línea
 * - Fondo semi-transparente negro para legibilidad
 * 
 * @param headlineText - Texto del headline (será convertido a MAYÚSCULAS)
 * @param canvasWidth - Ancho del canvas (1024px típicamente)
 * @param canvasHeight - Alto del canvas (1024px típicamente)
 * @returns SVG Buffer
 */
function generateUHNLowerThird(headlineText: string, canvasWidth: number, canvasHeight: number): string {
  // Truncar headline si es muy largo (máx 80 caracteres)
  const headline = headlineText.toUpperCase().substring(0, 80);
  
  // Dimensiones
  const lowerThirdHeight = 280; // Espacio inferior para texto + logo
  const lowerThirdY = canvasHeight - lowerThirdHeight;
  
  // Logo dimensions (cuadrado rojo como uHN)
  const logoSize = 100;
  const logoX = (canvasWidth - logoSize) / 2; // Centro horizontal
  const logoY = canvasHeight - lowerThirdHeight + 20; // Arriba en lower third
  
  // Red line (arriba del texto)
  const lineY = logoY + logoSize + 30;
  const lineHeight = 6;
  const lineWidth = canvasWidth * 0.85; // 85% del ancho
  const lineX = (canvasWidth - lineWidth) / 2; // Centrada
  
  // Text position (debajo de línea roja)
  const textY = lineY + 60; // Debajo de línea
  const textSize = 42; // Grande como uHN
  
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <!-- Lower third dark background (semi-transparent) -->
  <rect x="0" y="${lowerThirdY}" width="${canvasWidth}" height="${lowerThirdHeight}" 
        fill="rgb(0, 0, 0)" opacity="0.75"/>
  
  <!-- Logo cuadrado rojo (centro arriba) -->
  <rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" 
        fill="rgb(220, 20, 60)" rx="8"/>
  
  <!-- Text "RG" en logo (blanco, bold) -->
  <text x="${logoX + logoSize/2}" y="${logoY + logoSize/2 + 15}" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="48" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">
    RG
  </text>
  
  <!-- Red horizontal line -->
  <rect x="${lineX}" y="${lineY}" width="${lineWidth}" height="${lineHeight}" 
        fill="rgb(220, 20, 60)"/>
  
  <!-- Headline text (MAYÚSCULAS, blanco, bold, debajo de línea) -->
  <text x="${canvasWidth/2}" y="${textY}" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${textSize}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle"
        style="letter-spacing: 1px;">
    ${headline}
  </text>
  
  <!-- Segunda línea si el texto es muy largo (wrap simple) -->
  ${headline.length > 40 ? `
  <text x="${canvasWidth/2}" y="${textY + 50}" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${textSize - 4}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle"
        style="letter-spacing: 1px;">
    ${headline.substring(40, 80)}
  </text>
  ` : ''}
</svg>`;

  return svg;
}
