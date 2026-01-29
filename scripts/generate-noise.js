/**
 * Noise Texture Generator
 * Generates 512x512px grayscale noise texture for NoiseOverlay
 *
 * Usage:
 *   npm run generate-noise
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const WIDTH = 512;
const HEIGHT = 512;
const OUTPUT_PATH = path.join(__dirname, '../assets/noise.png');

console.log('🎨 Generating noise texture...');

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Generate white noise (random grayscale pixels)
const imageData = ctx.createImageData(WIDTH, HEIGHT);
for (let i = 0; i < imageData.data.length; i += 4) {
  const value = Math.floor(Math.random() * 256);
  imageData.data[i] = value;     // R
  imageData.data[i + 1] = value; // G
  imageData.data[i + 2] = value; // B
  imageData.data[i + 3] = 255;   // A (opaque)
}
ctx.putImageData(imageData, 0, 0);

// Save to file
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(OUTPUT_PATH, buffer);

console.log(`✅ Noise texture generated: ${OUTPUT_PATH}`);
console.log(`   Size: ${WIDTH}x${HEIGHT}px`);
console.log(`   File size: ${(buffer.length / 1024).toFixed(2)} KB`);
