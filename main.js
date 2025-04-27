// main.js

// —–––––––––––––––
// Element refs
// —–––––––––––––––
const cameraBtn   = document.getElementById('camera-btn');
const fileBtn     = document.getElementById('choose-file-btn');
const scanBtn     = document.getElementById('scan-btn');
const camInput    = document.getElementById('camera-input');
const fileInput   = document.getElementById('file-input');
const previewName = document.getElementById('file-name-preview');
const formEl      = document.getElementById('data-form');
const saveBtn     = document.getElementById('save-btn');
const exportBtn   = document.getElementById('export-btn');
const tableHead   = document.querySelector('#entries-table thead tr');
const tableBody   = document.querySelector('#entries-table tbody');

// —–––––––––––––––
// State
// —–––––––––––––––
let selectedFile = null;
let entries = [];

// —–––––––––––––––
// Helpers
// —–––––––––––––––
function showFileName(name) {
  previewName.textContent = name;
  previewName.hidden = false;
}

function enableScan() {
  scanBtn.disabled = false;
  scanBtn.hidden = false;
}

function showForm() {
  formEl.hidden = false;
}

function resetFormFields() {
  formEl.querySelectorAll('input, textarea').forEach(el => el.value = '');
}

// simple regex-based parser for each field
function parseOcrText(text) {
  const out = {};

  function match(pattern, group=1) {
    const m = text.match(pattern);
    return m ? m[group].trim() : '';
  }

  out.date         = match(/Date[:\s]+([A-Za-z0-9\/\-\s]+)/i);
  out.tube         = match(/Tube\s*#[:\s]*(\S+)/i);
  out.line         = match(/Line[:\s]*(\S+)/i);
  out.weld         = match(/Weld[:\s]*(\S+)/i);
  out.stdChill     = match(/Standard\s*Chill[:\s]*(\S+)/i);
  out.embossChill  = match(/Embossed?\s*Chill[:\s]*(\S+)/i);
  out.s1start      = match(/S1\s*Start[:\s]*(\S+)/i);
  out.s2start      = match(/S2\s*Start[:\s]*(\S+)/i);
  out.s3start      = match(/S3\s*Start[:\s]*(\S+)/i);
  out.lineSpeed    = match(/Line\s*Speed[:\s]*(\S+)/i);
  out.output       = match(/Output[:\s]*(\S+)/i);
  out.screwSpeed   = match(/Screw\s*Speed[:\s]*(\S+)/i);
  out.dieLip       = match(/Die\s*Lip[:\s]*(\S+)/i);
  out.pctLoad      = match(/Percent\s*Load[:\s]*(\S+)/i);
  out.headPressure = match(/Head\s*Pressure[:\s]*(\S+)/i);
  // anything after "Comments" to end of text
  const comMatch = text.match(/Comments?[:\s]*([\s\S]*)$/i);
  out.comments     = comMatch ? comMatch[1].trim() : '';

  return out;
}

function populateForm(data) {
  for (let key in data) {
    const field = formEl.querySelector(`[name=${key}]`);
    if (field) field.value = data[key];
  }
}

// rebuilds the table header based on form fields
function refreshTable() {
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';
  if (!entries.length) return;

  // header row
  Object.keys(entries[0]).forEach(k => {
    const th = document.createElement('th');
    th.textContent = k;
    tableHead.appendChild(th);
  });

  // rows
  for (let row of entries) {
    const tr = document.createElement('tr');
    Object.values(row).forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  }
}

// —–––––––––––––––
// OCR + scan flow
// —–––––––––––––––
scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  console.log(`⏳ Starting OCR on a ${camInput.width}×${camInput.height}px image…`);
  const { data: { text } } = await Tesseract.recognize(
    selectedFile,
    'eng',
    {
      logger: m => console.log('Tesseract:', m)
    }
  );
  console.log('✅ OCR complete. Text:', text);
  
  // parse & populate
  const parsed = parseOcrText(text);
  populateForm(parsed);
  showForm();
});

// —–––––––––––––––
// file/camera pick
// —–––––––––––––––
cameraBtn.addEventListener('click', () => camInput.click());
fileBtn.addEventListener('click',   () => fileInput.click());

camInput.addEventListener('change', e => {
  if (!e.target.files.length) return;
  selectedFile = e.target.files[0];
  showFileName(selectedFile.name);
  enableScan();
});

fileInput.addEventListener('change', e => {
  if (!e.target.files.length) return;
  selectedFile = e.target.files[0];
  showFileName(selectedFile.name);
  enableScan();
});

// —–––––––––––––––
// saving & exporting
// —–––––––––––––––
saveBtn.addEventListener('click', () => {
  const formData = {};
  formEl.querySelectorAll('input,textarea').forEach(el => {
    formData[el.name] = el.value;
  });
  entries.push(formData);
  refreshTable();
  resetFormFields();
  formEl.hidden = true;
  previewName.hidden = true;
  scanBtn.hidden = true;
});

exportBtn.addEventListener('click', () => {
  const ws = XLSX.utils.json_to_sheet(entries);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Log');
  XLSX.writeFile(wb, 'ocr-log.xlsx');
});
