// ==== CAMERA & FILE-INPUT WIRING ====
const cameraBtn     = document.getElementById('camera-btn');
const chooseFileBtn = document.getElementById('choose-file-btn');
const cameraInput   = document.getElementById('camera-input');
const fileInput     = document.getElementById('file-input');

cameraBtn.addEventListener('click',     () => cameraInput.click());
chooseFileBtn.addEventListener('click', () => fileInput.click());
cameraInput.addEventListener('change',   handleFileSelect);
fileInput.addEventListener('change',     handleFileSelect);

// ==== APP STATE ====
let entries = JSON.parse(localStorage.getItem('entries') || '[]');

// ==== UTILITY FUNCTIONS ====
function saveEntries() {
  localStorage.setItem('entries', JSON.stringify(entries));
  renderEntriesTable();
}

function renderEntriesTable() {
  const thead = document.querySelector('#entries-table thead tr');
  const tbody = document.querySelector('#entries-table tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // header row (hard-coded columns 1–34)
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

  // data rows
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

// ==== OCR + FORM MANAGEMENT ====
async function handleFileSelect(evt) {
  const file = evt.target.files[0];
  if (!file) return;

  // show preview
  const img = document.getElementById('preview');
  img.src = URL.createObjectURL(file);
  img.hidden = false;
  document.getElementById('scan-btn').hidden = false;

  document.getElementById('scan-btn').onclick = async () => {
    document.getElementById('scan-btn').disabled = true;
    const { data: { text } } = await Tesseract.recognize(img.src, 'eng');
    autoFillForm(parseTextToFields(text));
    document.getElementById('data-form').hidden = false;
    document.getElementById('scan-btn').hidden = true;
  };
}

// parse your OCR’d text into the 34 fields
function parseTextToFields(text) {
  const f = {};
  // — extract Date, Tube#, L-3-N → 3N, etc.
  // — extract all other fields by regex/search
  // For brevity, fill in your parsing logic here:
  // e.g. f['Date'] = extract(/Date[:\s]+(\d+\/\d+\/\d+)/i, text);
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
  
  // build 2 rows: Start/End
  const base = { ...data };
  // compute averages, trim L- prefix, prefix comments, etc.
  ['Start','End'].forEach(mode => {
    const row = { ...base };
    row['Comments'] = `${mode} - ${row.comments || ''}`;
    // fill s1,s2,s3 from the proper fields
    ['s1','s2','s3'].forEach(n => {
      row[n] = data[`${n}${mode.toLowerCase()}`];
    });
    delete row.comments; // moved into Comments
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
