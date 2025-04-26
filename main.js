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
      console.log('📋 Parsed fields:', fields);

      autoFillForm(fields);
      dataForm.hidden = false;
      scanBtn.hidden = true;
    } catch (err) {
      console.error('❌ OCR error:', err);
      alert('OCR failed: ' + err.message);
      scanBtn.disabled = false;
    }
  };
}

// ==== PARSING OCR TEXT INTO FORM FIELDS ====
function parseTextToFields(text) {
  const f = {};
  const dateMatch = text.match(/Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const tubeMatch = text.match(/Tube\s*#[:\s]+(\d+)/i);
  const lineMatch = text.match(/L-?(\d)-([ND])/i);
  const weldMatch = text.match(/Seam\s*Type[:\s]*(\w+)/i);
  const pelletMatch = text.match(/Polymer\s*Pellet\s*Type[:\s]*([\w\s\d\-]+)/i);

  f.date        = dateMatch   ? dateMatch[1]                  : '';
  f.tube        = tubeMatch   ? tubeMatch[1]                  : '';
  f.line        = lineMatch   ? (lineMatch[1] + lineMatch[2]) : '';
  f.weld        = weldMatch   ? weldMatch[1]                  : '';
  f['pelletType'] = pelletMatch ? pelletMatch[1].trim()        : '';

  ['stdChill','embossChill','tpo','covestro','lubrizol','down3010',
   'extrOnly','doubleTape','remote','local'
  ].forEach(flag => f[flag] = '');

  ['s1start','s2start','s3start','s1end','s2end','s3end',
   'lineSpeed','output','screwSpeed','dieLip','zone1','zone2','zone3',
   'die1','die2','die3','die4','pctLoad','headPressure','comments'
  ].forEach(field => f[field] = '');
  return f;
}

// ==== AUTO-FILL FORM ====
function autoFillForm(f) {
  const form = document.getElementById('data-form');
  Object.entries(f).forEach(([k,v])=>{
    const inp = form.querySelector(`[name="${k}"]`);
    if (inp) inp.value = v;
  });
}

// ==== SAVE & EXPORT ====
document.getElementById('save-btn').onclick = () => {
  const data = {};
  new FormData(document.getElementById('data-form')).forEach((v,k) => data[k] = v.trim());

  ['Start','End'].forEach(mode => {
    const row = {};
    row['Date']       = data.date;
    row['Tube #']     = data.tube;
    row['Line']       = data.line;
    row['Weld']       = data.weld;
    row['Std Chill']  = data.stdChill;
    row['Emboss Chill']= data.embossChill;
    const s1 = +data[`s1${mode.toLowerCase()}`]||''; const s2 = +data[`s2${mode.toLowerCase()}`]||''; const s3 = +data[`s3${mode.toLowerCase()}`]||'';
    row['S1']=s1; row['S2']=s2; row['S3']=s3;
    row['Avg'] = (s1&&s2&&s3)?((s1+s2+s3)/3).toFixed(2):'';
    row['TPO']         = data.tpo;
    row['Covestro']    = data.covestro;
    row['Lubrizol']    = data.lubrizol;
    row['3010 Down']   = data.down3010;
    row['Pellet Type'] = data.pelletType;
    row['Extr Only']   = data.extrOnly;
    row['Double Tape'] = data.doubleTape;
    row['Line Speed']  = data.lineSpeed;
    row['Output']      = data.output;
    row['Remote']      = data.remote;
    row['Local']       = data.local;
    row['Screw Speed'] = data.screwSpeed;
    row['Die Lip']     = data.dieLip;
    row['Zone1']       = data.zone1;
    row['Zone2']       = data.zone2;
    row['Zone3']       = data.zone3;
    row['Die1']        = data.die1;
    row['Die2']        = data.die2;
    row['Die3']        = data.die3;
    row['Die4']        = data.die4;
    row['% Load']      = data.pctLoad;
    row['Head Pressure']= data.headPressure;
    row['Melt Index']  = '';
    row['Comments']    = mode + ' - ' + (data.comments||'');
    entries.push(row);
  });

  saveEntries();
  document.getElementById('data-form').reset();
  document.getElementById('data-form').hidden = true;
};

document.getElementById('export-btn').onclick = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(entries);
  XLSX.utils.book_append_sheet(wb, ws, 'Scans');
  XLSX.writeFile(wb, 'scan-log.xlsx');
};

// ==== INITIALIZE ====
renderEntriesTable();
console.log('✅ App initialized. Entries loaded:', entries.length);