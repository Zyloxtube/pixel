const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const { generateCode, extractPixels, splitChunks } = require('./utils');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend (frontend folder is one level up from backend)
app.use(express.static(path.join(__dirname, '../frontend')));

// --- folders & files ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const CODES_FILE = path.join(DATA_DIR, 'codes.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CODES_FILE)) fs.writeFileSync(CODES_FILE, '{}', 'utf8');

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Root health (optional)
app.get('/health', (req, res) => res.json({ ok: true }));

// Upload endpoint (POST)
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const size = parseInt(req.body.size) || 1024;

    // extract pixels -> { pixels, width, height }
    const { pixels, width, height } = await extractPixels(file.path, size);

    // split into 5 chunks (you can change number)
    const numChunks = 5;
    const chunks = splitChunks(pixels, numChunks);

    const code = generateCode(15);

    // save to codes.json
    const codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8') || '{}');
    codesData[code] = {
      status: 'created',
      width,
      height,
      chunks: numChunks,
      pixels: chunks,
      createdAt: Date.now()
    };
    fs.writeFileSync(CODES_FILE, JSON.stringify(codesData, null, 2), 'utf8');

    // remove uploaded file to save space
    try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }

    return res.json({ code, width, height, chunks: numChunks });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get chunk (GET)
app.get('/getChunks', (req, res) => {
  const code = req.query.code;
  const chunkIndex = parseInt(req.query.chunk);
  if (!code || isNaN(chunkIndex)) return res.status(400).json({ error: 'Missing or invalid parameters' });

  const codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8') || '{}');
  if (!codesData[code]) return res.status(404).json({ error: 'Code not found' });

  const chunk = codesData[code].pixels[chunkIndex];
  return res.json({ pixels: chunk || [], width: codesData[code].width, height: codesData[code].height });
});

// Activate endpoint (POST)
app.post('/activate', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8') || '{}');
  if (!codesData[code]) return res.status(404).json({ error: 'Code not found' });

  codesData[code].status = 'active';
  fs.writeFileSync(CODES_FILE, JSON.stringify(codesData, null, 2), 'utf8');

  return res.json({ message: 'Code activated' });
});

// Fallback: let static frontend handle root; but keep a small message if needed
app.get('/', (req, res) => {
  // index.html from frontend folder will be served automatically by express.static
  // This route exists just in case
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
