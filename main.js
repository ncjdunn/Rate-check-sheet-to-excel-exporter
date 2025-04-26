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
  console.log('▶️ File selected:', file.name);

  fileNamePreview.textContent = file.name;
  fileNamePreview.hidden = false;
  scanBtn.hidden = false;
  scanBtn.disabled = false;
  dataForm.hidden = true;

  scanBtn.onclick = async () => {
    console.log('🔍 Scan button clicked');
    scanBtn.disabled = true;
    try {
      console.log('⏳ Starting OCR...');
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      console.log('✅ OCR complete. Text:', text.trim().slice(0,100) + '…');

      const fields = parseTextToFields(text);
      console.log('📋
