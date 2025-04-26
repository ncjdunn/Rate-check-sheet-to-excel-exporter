// ==== CAMERA & FILE-INPUT WIRING ====
const cameraBtn       = document.getElementById('camera-btn');
const chooseFileBtn   = document.getElementById('choose-file-btn');
const cameraInput     = document.getElementById('camera-input');
const fileInput       = document.getElementById('file-input');
const fileNamePreview = document.getElementById('file-name-preview');
const scanBtn         = document.getElementById('scan-btn');

cameraBtn.addEventListener('click',     () => cameraInput.click());
chooseFileBtn.addEventListener('click', () => fileInput.click());
cameraInput.addEventListener('change',   handleFileSelect);
fileInput.addEventListener('change',     handleFileSelect);

// ==== APP STATE & RENDER ====
let entries = JSON.parse(localStorage.getItem('entries') || '[]');

function saveEntries() {
  localStorage.setItem('entries', JSON.stringify(entries));
  renderEntriesTable();
}

function renderEntriesTable() {
  const thead = document.querySelector('#entries-table thead tr');
  const tbody = document.querySelector('#entries-table tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const cols = [
    'Date','Tube #','Line','Weld','Std Chill','Emboss Chill',
    'S1','S2','S3','Avg','TPO','Covestro','Lubrizol','3010',
    'Pellet Type','Extr Only','Double Tape','Line Speed','Output',
    'Remote','Local','Screw Speed','Die Lip','Zone1','Zone2','Zone3',
    'Die1','Die2','Die3','Die4','% Load','Head Pressure','Melt Index','Comments'
  ];
  cols.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    thead.appendChild(th);
  });

  entries.forEach(row => {
    const tr = document.createElement('tr');
    cols.forEach(key => {
      const td = document.createElement('td');
      td.textContent = row[key] || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ==== FILE SELECT & OCR TRIGGER ====
async function handleFileSelect(evt) {
  const file = evt.target.files[0];
  if (!file) return;

  // show filename instead of image
  fileNamePreview.textContent = file.name;
  fileNamePreview.hidden = false;
  scanBtn.hidden = false;
  scanBtn.disabled = false;

  scanBtn.onclick = async () => {
    scanBtn.disabled = true;
    const { data: { text } } = await Tesseract.recognize(file, 'eng');
    autoFillForm(parseTextToFields(text));
    document.getElementById('data-form').hidden = false;
    scanBtn.hidden = true;
  };
}

// ==== PARSING & FORM FILL ====
function parseTextToFields(text) {
  const f = {};
  // Your OCR parsing logic here...
  return f;
}

function autoFillForm(f) {
  const form = document.getElementById('data-form');
  for (let key in f) {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = f[key];
  }
}

// ==== SAVE & EXPORT ====
document.getElementById('save-btn').onclick = () => {
  const form = document.getElementById('data-form');
  const data = {};
  new FormData(form).forEach((v, k) => data[k] = v.trim());

  ['Start','End'].forEach(mode => {
    const row = { ...data };
    row['Comments'] = `${mode} - ${row.comments || ''}`;
    ['s1','s2','s3'].forEach(n => {
      row[n.toUpperCase()] = data[`${n}${mode.toLowerCase()}`];
    });
    delete row.comments;
    entries.push(row);
  });

  saveEntries();
  form.reset();
  form.hidden = true;
};

document.getElementById('export-btn').onclick = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(entries, { header: Object.keys(entries[0] || {}) });
  XLSX.utils.book_append_sheet(wb, ws, 'Scans');
  XLSX.writeFile(wb, 'scan-log.xlsx');
};

// ==== INITIALIZE ====
renderEntriesTable();
