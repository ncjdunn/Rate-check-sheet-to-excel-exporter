(() => {
  // Create and initialize the Tesseract worker using the global Tesseract object
  const worker = Tesseract.createWorker({
    logger: m => console.log('Tesseract:', m)
  });

  (async () => {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
  })();

  // DOM references
  const cameraBtn      = document.getElementById('camera-btn');
  const chooseFileBtn  = document.getElementById('choose-file-btn');
  const cameraInput    = document.getElementById('camera-input');
  const fileInput      = document.getElementById('file-input');
  const scanBtn        = document.getElementById('scan-btn');
  const fileNamePreview= document.getElementById('file-name-preview');
  const dataForm       = document.getElementById('data-form');
  const entriesTable   = document.getElementById('entries-table');

  // Wire up buttons
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

  // OCR & display form
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning...';

    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);
    img.onload = async () => {
      const { data: { text } } = await worker.recognize(img);
      console.log('OCR result:', text);
      // TODO: parse the `text` into your form fields here
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

  // TODO: Add your "Save Entry" and "Export to Excel" logic here

})();
