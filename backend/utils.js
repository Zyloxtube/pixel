const sharp = require('sharp');

/**
 * generateCode(length)
 */
function generateCode(length = 15) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/**
 * extractPixels(imagePath, maxSize)
 * Resize image to fit maxSize (preserve aspect), return { pixels, width, height }
 * pixels = [{x,y,color}, ...] row-major order (skips fully transparent)
 */
async function extractPixels(imagePath, maxSize = 1024) {
  // Resize image to fit inside maxSize x maxSize, preserve aspect ratio
  const img = sharp(imagePath).resize({ width: maxSize, height: maxSize, fit: 'inside' }).ensureAlpha();
  const meta = await img.metadata();
  const width = meta.width;
  const height = meta.height;
  const raw = await img.raw().toBuffer(); // RGBA

  const pixels = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = raw[idx];
      const g = raw[idx + 1];
      const b = raw[idx + 2];
      const a = raw[idx + 3];
      if (a === 0) continue; // skip fully transparent
      const hex = rgbToHex(r, g, b);
      pixels.push({ x, y, color: hex });
    }
  }
  return { pixels, width, height };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * splitChunks(pixels, numChunks)
 * We split by rows (better locality). pixels must include .y
 */
function splitChunks(pixels, numChunks = 5) {
  if (!Array.isArray(pixels)) return Array.from({ length: numChunks }, () => []);
  // group pixels by row y
  const rows = new Map();
  for (const p of pixels) {
    if (!rows.has(p.y)) rows.set(p.y, []);
    rows.get(p.y).push(p);
  }
  const sortedRows = Array.from(rows.keys()).sort((a, b) => a - b);
  const totalRows = sortedRows.length;
  const rowsPerChunk = Math.ceil(totalRows / numChunks);

  const chunks = Array.from({ length: numChunks }, () => []);
  for (let i = 0; i < numChunks; i++) {
    const start = i * rowsPerChunk;
    const end = Math.min((i + 1) * rowsPerChunk, totalRows);
    for (let r = start; r < end; r++) {
      const rowIndex = sortedRows[r];
      const rowPixels = rows.get(rowIndex) || [];
      chunks[i].push(...rowPixels);
    }
  }
  return chunks;
}

module.exports = { generateCode, extractPixels, splitChunks, rgbToHex };
