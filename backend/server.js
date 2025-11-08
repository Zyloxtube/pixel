const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const { generateCode, extractPixels, splitChunks } = require('./utils');

const app = express();
app.use(cors());
app.use(express.json());

// --- ملفات ثابتة (Frontend) ---
app.use(express.static(path.join(__dirname, '../frontend'))); 
// __dirname = backend/ → ../frontend يشير لمجلد الواجهة

// --- مجلدات وملفات ضرورية ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const CODES_FILE = path.join(DATA_DIR, 'codes.json');

// إنشاء المجلدات وملف codes.json لو مش موجودين
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CODES_FILE)) fs.writeFileSync(CODES_FILE, '{}');

// --- إعداد Multer للرفع ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- رفع صورة وتقسيم البيكسلات ---
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const size = parseInt(req.body.size) || 1024;
        const { pixels, width, height } = await extractPixels(file.path);
        const chunks = splitChunks(pixels, 5);
        const code = generateCode(15);

        // قراءة الكودات القديمة وتحديثها
        const codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
        codesData[code] = {
            status: 'created',
            width,
            height,
            chunks: 5,
            pixels: chunks
        };
        fs.writeFileSync(CODES_FILE, JSON.stringify(codesData, null, 2));

        res.json({ code });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- جلب chunk محدد ---
app.get('/getChunks', (req, res) => {
    const code = req.query.code;
    const chunkIndex = parseInt(req.query.chunk);

    if (!code || isNaN(chunkIndex)) return res.status(400).json({ error: 'Invalid parameters' });

    const codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
    if (!codesData[code]) return res.status(404).json({ error: 'Code not found' });

    const chunk = codesData[code].pixels[chunkIndex];
    res.json({ pixels: chunk || [] });
});

// --- تفعيل الكود ---
app.post('/activate', (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
    if (!codesData[code]) return res.status(404).json({ error: 'Code not found' });

    codesData[code].status = 'active';
    fs.writeFileSync(CODES_FILE, JSON.stringify(codesData, null, 2));

    res.json({ message: 'Code activated' });
});

// --- تشغيل السيرفر ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
