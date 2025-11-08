const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const DATA_FILE = path.join(__dirname, 'data', 'codes.json');

// التأكد من وجود ملف البيانات
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));

// دالة توليد كود عشوائي
function generateCode(length = 15){
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i=0;i<length;i++) code += chars.charAt(Math.floor(Math.random()*chars.length));
    return code;
}

// رفع الصورة وإنشاء الكود
app.post('/upload', upload.single('image'), async (req,res)=>{
    if(!req.file) return res.status(400).json({error:'No file uploaded'});

    const size = parseInt(req.body.size) || 1024;
    const code = generateCode();

    // تحويل الصورة إلى PNG بالحجم المطلوب
    const imgPath = path.join(__dirname,'uploads', `${code}.png`);
    await sharp(req.file.path)
        .resize(size,size,{fit:'contain'})
        .png()
        .toFile(imgPath);

    // حذف الملف المؤقت
    fs.unlinkSync(req.file.path);

    // تجهيز هيكل JSON للـpixels (حالياً نضع فارغ)
    const data = {
        code,
        status:'created',
        width:size,
        height:size,
        chunks:5,
        pixels:[[],[],[],[],[]] // لاحقاً سيتم وضع البيكسلات هنا
    };

    // حفظ البيانات
    const allData = JSON.parse(fs.readFileSync(DATA_FILE));
    allData[code] = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(allData,null,2));

    res.json({message:'Uploaded', code});
});

// تفعيل الكود
app.post('/activate', (req,res)=>{
    const code = req.query.code;
    if(!code) return res.status(400).json({error:'No code provided'});

    const allData = JSON.parse(fs.readFileSync(DATA_FILE));
    if(!allData[code]) return res.status(404).json({error:'Code not found'});

    allData[code].status = 'ready';
    fs.writeFileSync(DATA_FILE, JSON.stringify(allData,null,2));

    res.json({message:'Activated', code});
});

// endpoint لإرجاع بيانات chunk
app.get('/getChunks', (req,res)=>{
    const { code, chunk } = req.query;
    if(!code || chunk===undefined) return res.status(400).json({error:'Missing code or chunk'});

    const allData = JSON.parse(fs.readFileSync(DATA_FILE));
    if(!allData[code]) return res.status(404).json({error:'Code not found'});

    const chunkIndex = parseInt(chunk);
    if(chunkIndex<0 || chunkIndex>=allData[code].chunks) return res.status(400).json({error:'Invalid chunk index'});

    res.json({pixels: allData[code].pixels[chunkIndex], width: allData[code].width, height: allData[code].height});
});

const PORT = 3000;
app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));
