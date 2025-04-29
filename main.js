import { createWorker } from 'https://unpkg.com/tesseract.js@2.1.5/dist/tesseract.esm.js';

(async () => {
  const worker = await createWorker({
    workerPath: 'https://unpkg.com/tesseract.js@2.1.5/dist/worker.min.js',
    corePath:   'https://unpkg.com/tesseract.js-core@2.1.0/tesseract-core.wasm.js',
    logger: m => console.log('Tesseract:', m),
  });

  // DOM refs
  const cameraBtn      = document.getElementById('camera-btn');
  const chooseFileBtn  = document.getElementById('choose-file-btn');
  const cameraInput    = document.getElementById('camera-input');
  const fileInput      = document.getElementById('file-input');
  const scanBtn        = document.getElementById('scan-btn');
  const fileNamePreview= document.getElementById('file-name-preview');
  const dataForm       = document.getElementById('data-form');
  const entriesTable   = document.getElementById('entries-table');

  // Wire up file buttons
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

  cameraInput.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0]));
  fileInput.addEventListener('change',   e => e.target.files[0] && handleFile(e.target.files[0]));

  // OCR flow
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning…';

    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);
    img.onload = async () => {
      const { data: { text } } = await worker.recognize(img);
      console.log('OCR result:', text);
      // your parsing & form-filling here…

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

  // TODO: implement “Save Entry” and “Export to Excel” logic…

})();
