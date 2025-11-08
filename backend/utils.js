const sharp = require('sharp');

/**
 * generateCode: 15 chars A-Z0-9
 */
function generateCode(length = 15) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/**
 * extractPixels: reads image, resizes to maxSize x maxSize (preserve aspect inside),
 * returns { pixels, width, height } where pixels is an array of {x,y,color} in row-major order
 * color is '#RRGGBB'
 */
async function extractPixels(imagePath, maxSize = 1024) {
  // load and resize to square with fit: inside (keeps aspect) and ensure 4 channels
  const img = sharp(imagePath).resize(maxSize, maxSize, { fit: 'inside' }).ensureAlpha();
  const meta = await img.metadata();
  const { width, height } = meta;
  const raw = await img.raw().toBuffer(); // RGBA bytes

  const pixels = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = raw[idx];
      const g = raw[idx + 1];
      const b = raw[idx + 2];
      const a = raw[idx + 3];
      // include pixel even if alpha < 255 (you can choose to skip fully transparent pixels)
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
 * splitChunks: splits pixels array into numChunks arrays.
 * Here we split by rows to keep locality — compute rowsPerChunk and slice by row.
 * pixels must be row-major and contain x,y fields and width known separately (we pass width via outer context).
 * To keep simple, we'll split by rows computed from height and width using pixel.y
 */
function splitChunks(pixels, numChunks = 5) {
  if (!Array.isArray(pixels)) return Array.from({ length: numChunks }, () => []);
  // group rows
  const rowsMap = new Map();
  for (const p of pixels) {
    if (!rowsMap.has(p.y)) rowsMap.set(p.y, []);
    rowsMap.get(p.y).push(p);
  }
  const rows = Array.from(rowsMap.keys()).sort((a, b) => a - b);
  const totalRows = rows.length;
  const rowsPerChunk = Math.ceil(totalRows / numChunks);

  const chunks = Array.from({ length: numChunks }, () => []);
  for (let i = 0; i < numChunks; i++) {
    const startRow = i * rowsPerChunk;
    const endRow = Math.min((i + 1) * rowsPerChunk, totalRows);
    for (let r = startRow; r < endRow; r++) {
      const rowIndex = rows[r];
      const rowPixels = rowsMap.get(rowIndex) || [];
      // append rowPixels in left-to-right order (they are already)
      chunks[i].push(...rowPixels);
    }
  }
  return chunks;
}

module.exports = { generateCode, extractPixels, splitChunks, rgbToHex };
