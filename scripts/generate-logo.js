#!/usr/bin/env node
/**
 * Generate a simple Real Geopolitik logo (RG) in PNG format.
 * Creates a minimal logo: Red circle with white "RG" text.
 * Usage: node scripts/generate-logo.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../assets');
const outputPath = path.join(outputDir, 'rg_logo.png');

// Ensure assets directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a simple RG logo using SVG
const svgLogo = `
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <!-- Red background circle -->
  <circle cx="200" cy="200" r="180" fill="#E10600"/>
  
  <!-- White text "RG" -->
  <text x="200" y="250" font-size="120" font-weight="bold" font-family="Arial, sans-serif" 
        text-anchor="middle" fill="#FCFCFA">RG</text>
</svg>
`;

// Generate PNG from SVG using Sharp
sharp(Buffer.from(svgLogo))
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log(`✅ Logo generated: ${outputPath}`);
    console.log(`   Format: 400x400 PNG`);
    console.log(`   Design: Red (#E10600) circle with white "RG" text`);
  })
  .catch((err) => {
    console.error(`❌ Error generating logo: ${err.message}`);
    process.exit(1);
  });
