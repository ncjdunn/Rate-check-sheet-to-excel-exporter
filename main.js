(() => {
  const logger = m => console.log('Tesseract:', m);

  // DOM refs
  const cameraBtn = document.getElementById('camera-btn');
  const chooseFileBtn = document.getElementById('choose-file-btn');
  const cameraInput = document.getElementById('camera-input');
  const fileInput = document.getElementById('file-input');
  const scanBtn = document.getElementById('scan-btn');
  const fileNamePreview = document.getElementById('file-name-preview');
  const dataForm = document.getElementById('data-form');
  const formEls = dataForm.elements;

  let selectedFile = null;

  // File-selection
  cameraBtn.onclick = () => cameraInput.click();
  chooseFileBtn.onclick = () => fileInput.click();

  function handleFile(file) {
    selectedFile = file;
    fileNamePreview.textContent = file.name;
    fileNamePreview.hidden = false;
    scanBtn.hidden = false;
    scanBtn.disabled = false;
  }
  cameraInput.onchange = e => e.target.files[0] && handleFile(e.target.files[0]);
  fileInput.onchange = e => e.target.files[0] && handleFile(e.target.files[0]);

  // OCR & parse
  scanBtn.onclick = async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning...';

    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);
    img.onload = async () => {
      try {
        const { data: { text } } = await Tesseract.recognize(img, 'eng', { logger });
        console.log('OCR result:', text);
        const data = parseTextToFields(text);
        // fill form
        for (let key in data) {
          if (formEls[key]) formEls[key].value = data[key];
        }
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
      alert('Failed to load image');
      scanBtn.textContent = '🔍 Scan & OCR';
      scanBtn.disabled = false;
    };
  };

  // Basic parsing by regex
  function parseTextToFields(txt) {
    const lines = txt.split(/\r?\n/).map(l => l.trim());
    const result = {};
    lines.forEach(l => {
      let m;
      if (!result.line && (m = l.match(/Production Line\s*(\w+)/i))) result.line = m[1];
      if (!result.date && (m = l.match(/Date\s*([\d\.\/\-]+)/i))) result.date = m[1];
      if (!result.tube && (m = l.match(/Tube #\s*(\d+)/i))) result.tube = m[1];
      if (!result.polymer && (m = l.match(/Polymer used\s*([A-Za-z0-9]+)/i))) result.polymer = m[1];
      if (!result.pelletType && (m = l.match(/Polymer Pellet Type\s*(.+)/i))) result.pelletType = m[1];
      if (!result.pctLoad && (m = l.match(/Percent Load\s*(\d+)/i))) result.pctLoad = m[1];
      if (!result.headPressure && (m = l.match(/Head Pressure\s*(\d+)/i))) result.headPressure = m[1];
      if (!result.dieLip && (m = l.match(/Die Lip\s*([0-9\.x]+)/i))) result.dieLip = m[1];
      if (!result.outputSet && (m = l.match(/Extruder Output setting\s*(\d+)/i))) result.outputSet = m[1];
      if (!result.screwSpeed && (m = l.match(/Screw Speed[:]?\s*([0-9\.]+)/i))) result.screwSpeed = m[1];
      if (!result.lineSpeed && (m = l.match(/Line Speed\s*\(?document.*\)?\s*([0-9\.]+)/i))) result.lineSpeed = m[1];
      if (!result.chillPressure && (m = l.match(/Chill Roller Pressure\s*([0-9\.]+)/i))) result.chillPressure = m[1];
    });
    result.comments = '';
    return result;
  }

  // TODO: Save & export logic here
})();
