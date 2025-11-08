const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const sizeSelect = document.getElementById('sizeSelect');
const codeBox = document.getElementById('codeBox');
const codeChip = document.getElementById('codeChip');
const copyBtn = document.getElementById('copyBtn');
const activateBtn = document.getElementById('activateBtn');
const status = document.getElementById('status');

let lastCode = '';

fileInput.addEventListener('change', () => {
  const f = fileInput.files[0];
  if (!f) { preview.textContent = 'No image'; return; }
  const img = document.createElement('img');
  img.src = URL.createObjectURL(f);
  img.style.maxWidth = '100%';
  img.onload = () => URL.revokeObjectURL(img.src);
  preview.innerHTML = '';
  preview.appendChild(img);
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = 'Uploading...';
  const fd = new FormData(uploadForm);
  try {
    const res = await fetch('/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const t = await res.text();
      status.textContent = 'Upload failed: ' + t;
      return;
    }
    const j = await res.json();
    lastCode = j.code;
    codeChip.textContent = lastCode;
    codeBox.style.display = 'flex';
    status.textContent = `Code: ${lastCode} (width:${j.width} height:${j.height} chunks:${j.chunks})`;
  } catch (err) {
    console.error(err);
    status.textContent = 'Server connection error: ' + err.message;
  }
});

copyBtn.addEventListener('click', () => {
  if (!lastCode) return;
  navigator.clipboard.writeText(lastCode).then(() => {
    copyBtn.textContent = 'Copied';
    setTimeout(()=> copyBtn.textContent = 'Copy', 800);
  });
});

activateBtn.addEventListener('click', async () => {
  if (!lastCode) return;
  try {
    const res = await fetch(`/activate?code=${encodeURIComponent(lastCode)}`, { method: 'POST' });
    const j = await res.json();
    if (j.message) {
      alert('Activated');
    } else {
      alert('Activate failed: ' + JSON.stringify(j));
    }
  } catch (err) {
    alert('Activate error: ' + err.message);
  }
});
