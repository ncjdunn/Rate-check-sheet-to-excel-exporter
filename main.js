// File: main.js
(() => {
  const logger = m => console.log('Tesseract:', m);

  // DOM references
  const cameraBtn = document.getElementById('camera-btn');
  const chooseFileBtn = document.getElementById('choose-file-btn');
  const cameraInput = document.getElementById('camera-input');
  const fileInput = document.getElementById('file-input');
  const scanBtn = document.getElementById('scan-btn');
  const fileNamePreview = document.getElementById('file-name-preview');
  const dataForm = document.getElementById('data-form');
  const entriesTable = document.getElementById('entries-table');

  let selectedFile = null;

  // File-selection handlers
  cameraBtn.addEventListener('click', () => cameraInput.click());
  chooseFileBtn.addEventListener('click', () => fileInput.click());
  function handleFile(file) {
    selectedFile = file;
    fileNamePreview.textContent = file.name;
    fileNamePreview.hidden = false;
    scanBtn.hidden = false;
    scanBtn.disabled = false;
  }
  cameraInput.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0]));
  fileInput.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0]));

  // OCR & display
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning...';

    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);
    img.onload = async () => {
      try {
        const { data: { text } } = await Tesseract.recognize(img, 'eng', { logger });
        console.log('OCR result:', text);
        // TODO: parse text into form fields
        dataForm.hidden = false;
      } catch (err) {
        console.error('OCR failed:', err);
        alert('OCR error: ' + err.message);
      } finally {
        scanBtn.textContent = '🔍 Scan & OCR';
        scanBtn.disabled = false;
      }
    };
    img.onerror = () => {
      console.error('Image load failed');
      alert('Failed to load image');
      scanBtn.textContent = '🔍 Scan & OCR';
      scanBtn.disabled = false;
    };
  });

  // TODO: Save & export logic here
})();
