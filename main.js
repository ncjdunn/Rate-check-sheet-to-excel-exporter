// Wrap everything in an IIFE
(async () => {
  // Create worker from global Tesseract
  const { createWorker } = Tesseract;

  const worker = createWorker({
    logger: m => console.log('Tesseract:', m)
  });
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  // DOM elements
  const cameraBtn = document.getElementById('camera-btn');
  const chooseFileBtn = document.getElementById('choose-file-btn');
  const cameraInput = document.getElementById('camera-input');
  const fileInput = document.getElementById('file-input');
  const scanBtn = document.getElementById('scan-btn');
  const fileNamePreview = document.getElementById('file-name-preview');
  const dataForm = document.getElementById('data-form');
  const entriesTable = document.getElementById('entries-table');

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

  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning...';
    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);
    img.onload = async () => {
      const { data: { text } } = await worker.recognize(img);
      console.log('OCR result:', text);
      dataForm.hidden = false;
      scanBtn.textContent = '🔍 Scan & OCR';
      scanBtn.disabled = false;
    };
    img.onerror = () => {
      console.error('Image load failed');
      scanBtn.disabled = false;
      scanBtn.textContent = '🔍 Scan & OCR';
    };
  });

  // Your save and export logic here...
})();
