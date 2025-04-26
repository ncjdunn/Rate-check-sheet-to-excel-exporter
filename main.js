// ==== CAMERA & FILE-INPUT WIRING ====
const cameraBtn       = document.getElementById('camera-btn');
const chooseFileBtn   = document.getElementById('choose-file-btn');
const cameraInput     = document.getElementById('camera-input');
const fileInput       = document.getElementById('file-input');
const fileNamePreview = document.getElementById('file-name-preview');
const scanBtn         = document.getElementById('scan-btn');
const dataForm        = document.getElementById('data-form');

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
    'S1','S2','S3','Avg','TPO','Covestro','Lubrizol','3010 Down',
    'Pellet Type','Extr Only','Double Tape','Line Speed','Output',
    'Remote','Local','Screw Speed','Die Lip','Zone1','Zone2','Zone3',
    'Die1','Die2','Die3','Die4','% Load','Head Pressure','Melt Index','Comments'
  ];

  // header
  cols.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    thead.appendChild(th);
  });

  // rows
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

  fileNamePreview.textContent = file.name;
  fileNamePreview.hidden = false;
  scanBtn.hidden = false;
  scanBtn.disabled = false;
  dataForm.hidden = true;

  scanBtn.onclick = async () => {
    scanBtn.disabled = true;
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      const fields = parseTextToFields(text);
      autoFillForm(fields);
      dataForm.hidden = false;
      scanBtn.hidden = true;
    } catch (err) {
      alert('OCR failed: ' + err.message);
      scanBtn.disabled = false;
    }
  };
}

// ==== PARSING OCR TEXT INTO FORM FIELDS ====
function parseTextToFields(text) {
  const f = {};
  // initialize all to empty
  [
    'date','tube','line','weld','pelletType',
    'stdChill','embossChill','tpo','covestro','lubrizol','down3010',
    'extrOnly','doubleTape','remote','local',
    's1start','s2start','s3start','s1end','s2end','s3end',
    'lineSpeed','output','screwSpeed','dieLip',
    'zone1','zone2','zone3','die1','die2','die3','die4',
    'pctLoad','headPressure','comments'
  ].forEach(k => f[k] = '');

  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l);

  for (let line of lines) {
    if (/Production\s+Line/i.test(line)) {
      const m = line.match(/L-?(\d)[-–]?([ND])/i);
      if (m) f.line = m[1] + m[2];
    }
    if (/^Date[:\s]/i.test(line)) {
      const m = line.match(/Date[:\s]*([\d\/]+)/i);
