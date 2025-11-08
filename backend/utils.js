const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

/**
 * توليد كود عشوائي
 * @param {number} length طول الكود
 * @returns {string} الكود
 */
function generateCode(length = 15){
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i=0;i<length;i++) code += chars.charAt(Math.floor(Math.random()*chars.length));
    return code;
}

/**
 * تحويل صورة إلى مصفوفة pixels
 * @param {string} imgPath مسار الصورة PNG
 * @returns {Promise<Array>} مصفوفة 2D لكل بيكسل {x, y, color}
 */
async function extractPixels(imgPath){
    const image = sharp(imgPath);
    const { width, height } = await image.metadata();
    const raw = await image.raw().toBuffer(); // r,g,b,a لكل بيكسل

    const pixels = [];
    for(let y=0;y<height;y++){
        for(let x=0;x<width;x++){
            const idx = (y * width + x) * 4;
            const r = raw[idx];
            const g = raw[idx+1];
            const b = raw[idx+2];
            const a = raw[idx+3];
            // تجاهل البيكسلات الشفافة بالكامل
            if(a === 0) continue;
            const hex = rgbToHex(r,g,b);
            pixels.push({x, y, color: hex});
        }
    }
    return {pixels, width, height};
}

/**
 * تحويل RGB إلى HEX
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string} #RRGGBB
 */
function rgbToHex(r,g,b){
    return "#" + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

/**
 * تقسيم pixels إلى chunks
 * @param {Array} pixels مصفوفة pixels
 * @param {number} numChunks عدد الchunks المطلوبة
 * @returns {Array} مصفوفة chunks [[pixels], [pixels], ...]
 */
function splitChunks(pixels, numChunks = 5){
    const chunks = Array.from({length:numChunks}, ()=>[]);
    for(let i=0;i<pixels.length;i++){
        chunks[i % numChunks].push(pixels[i]);
    }
    return chunks;
}

module.exports = {
    generateCode,
    extractPixels,
    rgbToHex,
    splitChunks
};
