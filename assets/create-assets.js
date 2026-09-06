/**
 * Run this once with: node assets/create-assets.js
 * Generates placeholder PNG assets for the app.
 * Requires: npm install sharp (or just use any 1024x1024 PNG named icon.png)
 *
 * Alternatively, place your own:
 *   assets/icon.png           (1024x1024)
 *   assets/splash-icon.png    (1242x2436)
 *   assets/adaptive-icon.png  (1024x1024)
 *   assets/favicon.png        (196x196)
 *   assets/recipe-placeholder.png (400x400)
 */

const fs = require('fs');
const path = require('path');

// Minimal 1x1 transparent PNG (base64)
const TRANSPARENT_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const files = [
  'icon.png',
  'splash-icon.png',
  'adaptive-icon.png',
  'favicon.png',
  'recipe-placeholder.png',
];

for (const file of files) {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, Buffer.from(TRANSPARENT_PNG_B64, 'base64'));
    console.log('Created placeholder:', file);
  } else {
    console.log('Already exists:', file);
  }
}
