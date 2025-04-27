// main.js

// When the user selects a file, kick off OCR immediately:
document
  .getElementById('image-input')
  .addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) doOCR(file);
  });

// (Optional) If you have a “Scan” button instead of auto‐run on select:
// document.getElementById('scan-btn').addEventListener('click', () => {
//   const file = document.getElementById('image-input').files[0];
//   if (!file) return alert('Please choose an image first');
//   doOCR(file);
// });

async function doOCR(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = async () => {
    console.log(
      `⏳ Starting OCR on a ${img.naturalWidth}×${img.naturalHeight}px image…`
    );

    try {
      const {
        data: { text },
      } = await Tesseract.recognize(img, 'eng', {
        logger: (m) => console.log('Tesseract:', m),
      });

      console.log('✅ OCR complete. Text:', text);
      const fields = parseOcrText(text);
      fillForm(fields);
    } catch (err) {
      console.error('❌ OCR failed:', err);
      alert('OCR failed: ' + err.message);
    }
  };

  img.onerror = (e) => {
    console.error('Image load failed:', e);
    alert('Failed to load image');
  };
}

function parseOcrText(text) {
  console.log('🔍 raw OCR text:', text);

  const out = {};
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  lines.forEach((line) => {
    if (/^Date/i.test(line)) {
      out.date = line.replace(/^Date[:\-\s]*/i, '').trim();
    } else if (/^Tube\s*#/i.test(line)) {
      out.tube = line.replace(/^Tube\s*#?[:\-\s]*/i, '').trim();
    } else if (/^Line\s+Speed/i.test(line)) {
      out.lineSpeed = line.replace(/^Line\s*Speed[:\-\s]*/i, '').trim();
    } else if (/^Weld/i.test(line)) {
      out.weld = line.replace(/^Weld(?:ed)?[:\-\s]*/i, '').trim();
    } else if (/Chill/i.test(line)) {
      out.chillType = line.replace(
        /.*Chill(?: roller used)?[:\-\s]*/i,
        ''
      ).trim();
    } else if (/^Percent\s*Load/i.test(line)) {
      out.percentLoad = line.replace(/^Percent\s*Load[:\-\s]*/i, '').trim();
    } else if (/^Head\s*Pressure/i.test(line)) {
      out.headPressure = line
        .replace(/^Head\s*Pressure[:\-\s]*/i, '')
        .trim();
    } else if (/^Output/i.test(line)) {
      out.output = line.replace(/^Output[:\-\s]*/i, '').trim();
    } else if (/^Screw\s*Speed/i.test(line)) {
      out.screwSpeed = line.replace(/^Screw\s*Speed[:\-\s]*/i, '').trim();
    } else if (/^Die\s*Lip/i.test(line)) {
      out.dieLip = line.replace(/^Die\s*Lip[:\-\s]*/i, '').trim();
    } else if (/^Comments?/i.test(line)) {
      out.comments = line.replace(/^Comments?[:\-\s]*/i, '').trim();
    }
  });

  console.log('📦 parsed fields:', out);
  return out;
}

function fillForm(fields) {
  document.getElementById('date-input').value = fields.date || '';
  document.getElementById('tube-input').value = fields.tube || '';
  document.getElementById('line-speed-input').value =
    fields.lineSpeed || '';
  document.getElementById('weld-input').value = fields.weld || '';
  document.getElementById('chill-type-input').value =
    fields.chillType || '';
  document.getElementById('percent-load-input').value =
    fields.percentLoad || '';
  document.getElementById('head-pressure-input').value =
    fields.headPressure || '';
  document.getElementById('output-input').value = fields.output || '';
  document.getElementById('screw-speed-input').value =
    fields.screwSpeed || '';
  document.getElementById('die-lip-input').value = fields.dieLip || '';
  document.getElementById('comments-input').value = fields.comments || '';
}
