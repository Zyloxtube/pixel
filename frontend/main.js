const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const uploadBtn = document.getElementById('uploadBtn');
const codeBox = document.getElementById('codeBox');
const codeChip = document.getElementById('codeChip');
const copyBtn = document.getElementById('copyBtn');
const activateBtn = document.getElementById('activateBtn');
const sizeSelect = document.getElementById('sizeSelect');

let currentFile = null;

// Show image preview
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFile = file;

    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "100%";
    img.onload = () => URL.revokeObjectURL(img.src);
    preview.appendChild(img);
});

// Upload image to backend
uploadBtn.addEventListener('click', async () => {
    if (!currentFile) {
        alert("Please select an image first!");
        return;
    }

    const formData = new FormData();
    formData.append('image', currentFile);
    formData.append('size', sizeSelect.value);

    try {
        const res = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.code) {
            codeChip.textContent = data.code;
            codeBox.style.display = 'flex';
            alert('Image uploaded and code generated successfully!');
        } else {
            alert('Error: ' + JSON.stringify(data));
        }
    } catch (err) {
        alert('Server connection error: ' + err);
    }
});

// Copy code to clipboard
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeChip.textContent)
        .then(() => {
            copyBtn.textContent = 'Copied';
            setTimeout(() => copyBtn.textContent = 'Copy', 800);
        });
});

// Activate code on server
activateBtn.addEventListener('click', async () => {
    const code = codeChip.textContent;
    if (!code) return;

    try {
        const res = await fetch(`http://localhost:3000/activate?code=${code}`, {
            method: 'POST'
        });
        const data = await res.json();

        if (data.message) {
            alert('Code activated successfully!');
        } else {
            alert('Error: ' + JSON.stringify(data));
        }
    } catch (err) {
        alert('Server connection error: ' + err);
    }
});
