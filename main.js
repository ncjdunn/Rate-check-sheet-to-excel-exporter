// main.js
import { createWorker } from 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.esm.js';

(async () => {
  // Initialize Tesseract worker with explicit CDN paths
  const worker = await createWorker({
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/worker.min.js',
    corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@2.1.0/tesseract-core.wasm.js',
    logger: m => console.log('Tesseract:', m)
  });

  // DOM references
  const cameraBtn       = document.getElementById('camera-btn');
  const chooseFileBtn   = document.getElementById('choose-file-btn');
  const cameraInput     = document.getElementById('camera-input');
  const fileInput       = document.getElementById('file-input');
  const scanBtn         = document.getElementById('scan-btn');
  const fileNamePreview = document.getElementById('file-name-preview');
  const dataForm        = document.getElementById('data-form');
  const entriesTable    = document.getElementById('entries-table');

  // Trigger file pickers
  cameraBtn.addEventListener('click', () => cameraInput.click());
  chooseFileBtn.addEventListener('click', () => fileInput.click());

  let selectedFile;
  function handleFile(file) {
    selectedFile = file;
    fileNamePreview.textContent = file.name;
    fileNamePreview.hidden = false;
    scanBtn.hidden = false;
    scanBtn.disabled = false;
  }

  cameraInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // OCR & reveal form
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning...';

    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);
    img.onload = async () => {
      const { data: { text } } = await worker.recognize(img);
      console.log('OCR result:', text);
      // TODO: parse `text` into your form fields
      dataForm.hidden = false;
      scanBtn.textContent = '🔍 Scan & OCR';
      scanBtn.disabled = false;
    };
    img.onerror = () => {
      console.error('Image load failed');
      scanBtn.textContent = '🔍 Scan & OCR';
      scanBtn.disabled = false;
    };
  });

  // TODO: implement Save Entry and Export to Excel (SheetJS) here
})();
