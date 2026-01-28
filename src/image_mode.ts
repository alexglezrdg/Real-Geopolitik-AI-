import * as fs from "fs";
import * as path from "path";

/**
 * Image Mode Decision System
 * 
 * Decides whether to use DALL·E FULL (mode A) or COMPOSED (mode B)
 * based on entity detection and portrait availability.
 */

const PORTRAITS_DIR = "./assets/portraits";

/**
 * Get all available portrait files from disk
 * Supports flexible naming (any file with person name or descriptive keyword)
 */
function getAvailablePortraits(): Map<string, string> {
  const portraits = new Map<string, string>();
  
  if (!fs.existsSync(PORTRAITS_DIR)) {
    return portraits;
  }

  const files = fs.readdirSync(PORTRAITS_DIR);
  const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp|avif)$/i.test(f));
  
  // For each image file, extract keywords and map them
  for (const file of imageFiles) {
    const lower = file.toLowerCase();
    
    // Extract keywords from filename (split by space, underscore, dash)
    const keywords = lower.replace(/\.[^/.]+$/, "") // Remove extension
      .split(/[\s_-]+/)
      .filter(k => k.length > 2); // Only words > 2 chars
    
    // Map each keyword to this file
    for (const keyword of keywords) {
      if (keyword && keyword !== "cropped" && keyword !== "foto") {
        portraits.set(keyword, path.join(PORTRAITS_DIR, file));
      }
    }
    
    // Special mappings for known files
    const fileLower = lower.replace(/\.[^/.]+$/, "");
    if (fileLower.includes("maduro")) {
      portraits.set("maduro", path.join(PORTRAITS_DIR, file));
      portraits.set("nicolás maduro", path.join(PORTRAITS_DIR, file));
      portraits.set("venezuela", path.join(PORTRAITS_DIR, file));
    }
    if (fileLower.includes("petro") || fileLower.includes("gpetro")) {
      portraits.set("petro", path.join(PORTRAITS_DIR, file));
      portraits.set("gustavo petro", path.join(PORTRAITS_DIR, file));
      portraits.set("colombia", path.join(PORTRAITS_DIR, file));
    }
    if (fileLower.includes("trump")) {
      portraits.set("trump", path.join(PORTRAITS_DIR, file));
      portraits.set("donald trump", path.join(PORTRAITS_DIR, file));
    }
    if (fileLower.includes("lula")) {
      portraits.set("lula", path.join(PORTRAITS_DIR, file));
      portraits.set("lula da silva", path.join(PORTRAITS_DIR, file));
      portraits.set("brasil", path.join(PORTRAITS_DIR, file));
    }
    if (fileLower.includes("diaz") || fileLower.includes("canel")) {
      portraits.set("díaz-canel", path.join(PORTRAITS_DIR, file));
      portraits.set("cuba", path.join(PORTRAITS_DIR, file));
    }
    if (fileLower.includes("putin")) {
      portraits.set("putin", path.join(PORTRAITS_DIR, file));
      portraits.set("vladimir putin", path.join(PORTRAITS_DIR, file));
      portraits.set("rusia", path.join(PORTRAITS_DIR, file));
    }
  }
  
  return portraits;
}

/**
 * Entity-to-filename mapping (flexible keyword matching)
 * System will also auto-detect from file keywords
 * 
 * EXPANDED: Better detection for Trump, Lula, and other key geopolitical actors
 * UPDATED: Includes all new portraits added (Ortega, Milei, Boric, Abinader, etc.)
 */
const ENTITY_KEYWORDS: Record<string, string[]> = {
  // US Leaders (EXPANDED for better detection)
  "trump": ["trump", "donald trump", "presidente trump", "trump admin", "casa blanca trump", "administración trump", "gobierno trump"],
  "marco rubio": ["rubio", "marco rubio", "secretario rubio"],
  
  // Russia
  "putin": ["putin", "vladimir putin", "kremlin"],
  
  // China
  "xi jinping": ["xi", "jinping", "xi jinping", "presidente xi"],
  
  // Latin America (MASSIVELY EXPANDED - all new portraits)
  "petro": ["petro", "gustavo petro", "presidente petro", "colombia petro", "gobierno petro", "bogotá", "mandatario colombiano"],
  "lula": ["lula", "lula da silva", "da silva", "presidente lula", "luiz inácio", "silva lula", "gobierno lula", "brasilia lula"],
  "maduro": ["maduro", "nicolás maduro", "nicolas maduro", "régimen maduro", "gobierno maduro", "venezuela maduro", "caracas", "chavismo", "régimen venezolano"],
  "delcy": ["delcy", "delcy rodriguez", "delcy rodríguez", "vicepresidenta delcy"],
  "díaz-canel": ["diaz", "canel", "díaz-canel", "diaz-canel", "presidente cuba", "cuba diaz", "la habana", "gobierno cubano"],
  "sheinbaum": ["sheinbaum", "claudia sheinbaum", "presidenta sheinbaum", "mexico sheinbaum"],
  
  // NEW: Central American & Caribbean
  "ortega": ["ortega", "daniel ortega", "nicaragua ortega", "presidente ortega", "nicaragua", "managua"],
  "abinader": ["abinader", "luis abinader", "república dominicana", "dominicana abinader"],
  
  // NEW: South American
  "milei": ["milei", "javier milei", "argentina milei", "presidente milei", "argentina", "buenos aires milei"],
  "boric": ["boric", "gabriel boric", "chile boric", "presidente boric", "chile", "santiago"],
  
  // Europe
  "macron": ["macron", "emmanuel macron", "presidente macron", "france macron"],
  "sánchez": ["sanchez", "sánchez", "pedro sanchez", "pedro sánchez", "españa"],
  
  // Middle East
  "netanyahu": ["netanyahu", "benjamin netanyahu", "bibi", "primer ministro israel", "israel netanyahu"],
  "khamenei": ["khamenei", "ayatollah", "líder supremo iran", "iran khamenei", "teherán"],
  
  // Africa
  "traoré": ["traore", "traoré", "ibrahim traore", "burkina faso"],
  
  // Organizations & Blocs
  "nato": ["nato", "otan"],
  "brics": ["brics"],
  "greenland": ["greenland", "groenlandia"],
};

/**
 * Priority order for entities when multiple portraits available
 * Higher index = higher priority
 * 
 * UPDATED: Added all new Latin American presidents
 */
const ENTITY_PRIORITY = [
  // Organizations & Symbols (lowest)
  "brics", "greenland", "groenlandia",
  "nato", "otan",
  
  // Regional Leaders (lower)
  "traoré", "traore", "burkina faso",
  "sánchez", "sanchez", "españa",
  "macron", "france",
  
  // Central American & Caribbean
  "abinader", "república dominicana",
  "ortega", "nicaragua",
  "díaz-canel", "diaz-canel", "cuba",
  "sheinbaum", "mexico",
  
  // South American Leaders
  "boric", "gabriel boric", "chile",
  "milei", "javier milei", "argentina",
  
  // Latin America Strategic (higher)
  "petro", "gustavo petro", "colombia",
  "lula", "lula da silva", "brasil",
  "delcy", "delcy rodríguez", "venezuela",
  "maduro", "nicolás maduro", "venezuela",
  
  // Middle East (high)
  "khamenei", "ayatollah", "iran",
  "netanyahu", "benjamin netanyahu", "israel",
  
  // Major Powers (highest priority)
  "xi", "xi jinping", "china",
  "putin", "vladimir putin", "rusia",
  "trump", "donald trump", "eeuu",
];

export interface ImageModeResult {
  mode: "DALLE_FULL" | "COMPOSED";
  entity?: string;
  portraitPath?: string;
  reason: string;
}

/**
 * Decide which image mode to use based on entities
 * 
 * @param entities - Array of entity names detected in the story (from tags, title, etc.)
 * @returns Decision result with mode and optional portrait path
 */
export function decideImageMode(entities: string[]): ImageModeResult {
  if (!entities || entities.length === 0) {
    return {
      mode: "DALLE_FULL",
      reason: "No entities detected",
    };
  }

  // Get available portraits from disk
  const availablePortraits = getAvailablePortraits();
  
  if (availablePortraits.size === 0) {
    return {
      mode: "DALLE_FULL",
      reason: `No portrait files found in ${PORTRAITS_DIR}`,
    };
  }

  // Normalize entities to lowercase
  const normalizedEntities = entities.map(e => e.toLowerCase().trim());

  // Find all available portraits for detected entities
  const availableMatches: Array<{ entity: string; portraitPath: string; priority: number }> = [];

  for (const entity of normalizedEntities) {
    // Check if entity or its keywords match any portrait file
    for (const [entityKey, keywords] of Object.entries(ENTITY_KEYWORDS)) {
      const entityMatches = keywords.some(kw => entity.includes(kw));
      
      if (entityMatches) {
        // Find corresponding portrait file
        for (const keyword of keywords) {
          const portraitPath = availablePortraits.get(keyword);
          if (portraitPath) {
            const priority = ENTITY_PRIORITY.indexOf(entityKey);
            availableMatches.push({
              entity: entityKey,
              portraitPath,
              priority: priority >= 0 ? priority : -1,
            });
            break; // Use first match for this entity
          }
        }
      }
    }
  }

  // No portraits available
  if (availableMatches.length === 0) {
    return {
      mode: "DALLE_FULL",
      reason: `Entities detected (${entities.join(", ")}) but no matching portraits found`,
    };
  }

  // Sort by priority (descending) and pick highest
  availableMatches.sort((a, b) => b.priority - a.priority);
  const selected = availableMatches[0];

  return {
    mode: "COMPOSED",
    entity: selected.entity,
    portraitPath: selected.portraitPath,
    reason: `Portrait available for entity: ${selected.entity} (${path.basename(selected.portraitPath)})`,
  };
}

/**
 * Extract entities from NewsPack tags and title
 * This is a helper to bridge from NewsPack to entity detection
 * 
 * IMPROVED: Better detection from title/snippet for Trump, Lula, Maduro, etc.
 */
export function extractEntities(tags: string[], title: string, snippet?: string): string[] {
  const entities: string[] = [];

  // Add tags as entities
  if (tags && tags.length > 0) {
    entities.push(...tags);
  }

  // Combine title + snippet for better detection
  const fullText = `${title} ${snippet || ""}`.toLowerCase();
  
  // Extract common entity names from text (keyword matching with all variants)
  for (const [entityKey, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    // Check if ANY keyword matches in the text
    const hasMatch = keywords.some(kw => fullText.includes(kw.toLowerCase()));
    
    if (hasMatch) {
      entities.push(entityKey);
    }
  }

  return entities;
}
