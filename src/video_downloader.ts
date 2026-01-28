/**
 * Video Downloader - Descarga videos de YouTube para subir nativamente a Twitter
 * Twitter prioriza videos nativos sobre enlaces de YouTube (mejor engagement en móvil)
 * 
 * NOTA: YouTube está bloqueando descargas agresivamente (403 Forbidden).
 * Como alternativa, usamos el thumbnail del video como imagen.
 */

import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Límites de Twitter para videos
const TWITTER_VIDEO_LIMITS = {
  maxDurationSeconds: 140, // 2:20 para cuentas normales
  maxFileSizeMB: 512,
  supportedFormats: ["mp4"],
  maxResolution: "1280x720", // 720p max para upload rápido
};

// Ruta a yt-dlp
const YT_DLP_PATH = process.env.YT_DLP_PATH || 
  `${os.homedir()}/Library/Python/3.9/bin/yt-dlp`;

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
  isImage?: boolean; // true si descargamos thumbnail en lugar de video
}

/**
 * Verifica si yt-dlp está disponible
 */
export function checkYtDlp(): boolean {
  try {
    // Intentar con ruta completa primero
    if (fs.existsSync(YT_DLP_PATH)) {
      execSync(`"${YT_DLP_PATH}" --version`, { stdio: "pipe" });
      return true;
    }
    // Intentar con PATH
    execSync("yt-dlp --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Descarga el thumbnail de alta calidad del video
 * Esto siempre funciona y no tiene restricciones de 403
 */
export async function downloadVideoThumbnail(url: string): Promise<DownloadResult> {
  const tempDir = path.join(os.tmpdir(), "geopolitik-videos");
  
  // Crear directorio si no existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Extraer video ID
    const videoId = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) {
      return { success: false, error: "Invalid YouTube URL" };
    }

    // YouTube ofrece varios tamaños de thumbnail
    // maxresdefault.jpg = 1280x720 (mejor calidad, no siempre disponible)
    // sddefault.jpg = 640x480
    // hqdefault.jpg = 480x360
    const thumbnailUrls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    ];

    const outputPath = path.join(tempDir, `${videoId}_thumb.jpg`);

    console.log("📸 Descargando thumbnail del video...");

    // Intentar cada URL hasta que una funcione
    for (const thumbUrl of thumbnailUrls) {
      try {
        const response = await fetch(thumbUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          fs.writeFileSync(outputPath, Buffer.from(buffer));
          
          const stats = fs.statSync(outputPath);
          console.log(`   ✅ Thumbnail descargado: ${(stats.size / 1024).toFixed(1)}KB`);
          
          return {
            success: true,
            filePath: outputPath,
            fileSize: stats.size,
            isImage: true,
          };
        }
      } catch {
        continue;
      }
    }

    return { success: false, error: "Could not download any thumbnail" };

  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Obtiene el comando yt-dlp correcto
 */
function getYtDlpCommand(): string {
  if (fs.existsSync(YT_DLP_PATH)) {
    return `"${YT_DLP_PATH}"`;
  }
  return "yt-dlp";
}

/**
 * Obtiene información del video sin descargarlo
 */
export async function getVideoInfo(url: string): Promise<{
  duration: number;
  title: string;
  formats: string[];
} | null> {
  try {
    const ytdlp = getYtDlpCommand();
    const output = execSync(
      `${ytdlp} --dump-json "${url}"`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );
    const info = JSON.parse(output);
    return {
      duration: info.duration || 0,
      title: info.title || "",
      formats: info.formats?.map((f: any) => f.format_id) || [],
    };
  } catch (e) {
    console.error(`Error getting video info: ${(e as Error).message}`);
    return null;
  }
}

/**
 * Descarga un video de YouTube optimizado para Twitter
 * - Máximo 2:20 de duración
 * - Formato MP4 compatible
 * - Resolución 720p max
 */
export async function downloadVideoForTwitter(
  url: string,
  outputDir?: string
): Promise<DownloadResult> {
  const tempDir = outputDir || path.join(os.tmpdir(), "geopolitik-videos");
  
  // Crear directorio si no existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Verificar yt-dlp
  if (!checkYtDlp()) {
    return {
      success: false,
      error: "yt-dlp not found. Install with: pip3 install yt-dlp",
    };
  }

  try {
    // Obtener info del video primero
    console.log("📊 Obteniendo información del video...");
    const info = await getVideoInfo(url);
    
    if (!info) {
      return { success: false, error: "Could not get video info" };
    }

    console.log(`   Duración: ${info.duration}s`);
    console.log(`   Título: ${info.title.slice(0, 50)}...`);

    // Verificar duración
    if (info.duration > TWITTER_VIDEO_LIMITS.maxDurationSeconds) {
      console.log(`   ⚠️  Video muy largo (${info.duration}s > ${TWITTER_VIDEO_LIMITS.maxDurationSeconds}s)`);
      console.log(`   📹 Descargando solo los primeros ${TWITTER_VIDEO_LIMITS.maxDurationSeconds}s...`);
    }

    // Nombre de archivo único
    const videoId = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1] || Date.now().toString();
    const outputPath = path.join(tempDir, `${videoId}.mp4`);

    // Limpiar archivo anterior si existe
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    const ytdlpPath = fs.existsSync(YT_DLP_PATH) ? YT_DLP_PATH : "yt-dlp";
    
    // Construir argumentos de descarga (sin escapar - spawn los maneja)
    // Usamos formato 18 (mp4 360p) que es compatible y siempre disponible
    // O el mejor mp4 disponible si 18 no existe
    const downloadArgs = [
      url,
      "-f", "18/best[ext=mp4]/best",
      "-o", outputPath,
      "--no-playlist",
      "--no-warnings",
      "--no-check-certificates",
    ];

    // Si el video es muy largo, usar postprocessor para cortar
    if (info.duration > TWITTER_VIDEO_LIMITS.maxDurationSeconds) {
      downloadArgs.push(
        "--postprocessor-args",
        `ffmpeg:-t ${TWITTER_VIDEO_LIMITS.maxDurationSeconds}`
      );
    }

    console.log("📥 Descargando video...");
    
    // Usar spawn para evitar problemas de escaping en shell
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ytdlpPath, downloadArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      
      let stderr = "";
      proc.stderr?.on("data", (data) => { stderr += data.toString(); });
      
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(0, 200)}`));
        }
      });
      
      proc.on("error", (err) => {
        reject(err);
      });
    });

    // Verificar que el archivo existe
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: "Download completed but file not found" };
    }

    const stats = fs.statSync(outputPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    console.log(`   ✅ Descargado: ${fileSizeMB.toFixed(1)}MB`);

    // Verificar tamaño
    if (fileSizeMB > TWITTER_VIDEO_LIMITS.maxFileSizeMB) {
      console.log(`   ⚠️  Archivo muy grande (${fileSizeMB.toFixed(1)}MB)`);
      // Podríamos re-codificar con menor bitrate, pero por ahora solo advertimos
    }

    return {
      success: true,
      filePath: outputPath,
      duration: Math.min(info.duration, TWITTER_VIDEO_LIMITS.maxDurationSeconds),
      fileSize: stats.size,
    };

  } catch (e) {
    const error = (e as Error).message;
    console.error(`❌ Error descargando video: ${error}`);
    return { success: false, error };
  }
}

/**
 * Limpia videos temporales antiguos (más de 1 hora)
 */
export function cleanupOldVideos(maxAgeMs: number = 60 * 60 * 1000): number {
  const tempDir = path.join(os.tmpdir(), "geopolitik-videos");
  
  if (!fs.existsSync(tempDir)) {
    return 0;
  }

  let cleaned = 0;
  const now = Date.now();

  for (const file of fs.readdirSync(tempDir)) {
    const filePath = path.join(tempDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    } catch {
      // Ignorar errores
    }
  }

  return cleaned;
}

// Test
if (process.argv[1]?.includes("video_downloader")) {
  const testUrl = process.argv[2] || "https://www.youtube.com/watch?v=QwCa997Wa2M";
  
  console.log("=".repeat(60));
  console.log("TEST: Video Downloader");
  console.log("=".repeat(60));
  console.log(`URL: ${testUrl}`);
  console.log(`yt-dlp available: ${checkYtDlp()}`);
  
  downloadVideoForTwitter(testUrl).then((result) => {
    console.log("\nResult:", result);
  });
}
