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

  // Show only filename (no image)
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
      console.log('✅ OCR complete. Sample text:', text.trim().slice(0,80) + '…');

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
  // Initialize all form keys to empty string
  [
    'date','tube','line','weld','pelletType',
    'stdChill','embossChill','tpo','covestro','lubrizol','down3010',
    'extrOnly','doubleTape','remote','local',
    's1start','s2start','s3start','s1end','s2end','s3end',
    'lineSpeed','output','screwSpeed','dieLip',
    'zone1','zone2','zone3','die1','die2','die3','die4',
    'pctLoad','headPressure','comments'
  ].forEach(k => f[k] = '');

  // Split OCR text into non-empty lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  lines.forEach(line => {
    // Production Line (e.g., "Production Line   L-3-N")
    if (/Production\s+Line/i.test(line)) {
      const m = line.match(/L-?(\d)[-–]?([ND])/i);
      if (m) f.line = m[1] + m[2];
    }
    // Date (e.g., "Date 4/23/25")
    if (/^Date[:\s]/i.test(line)) {
      const m = line.match(/Date[:\s]*([\d\/]+)/i);
      if (m) f.date = m[1];
    }
    // Tube # (e.g., "Tube # 106467")
    if (/^Tube\s*#/i.test(line)) {
      const m = line.match(/Tube\s*#[:\s]*(\d+)/i);
      if (m) f.tube = m[1];
    }
    // Seam Type (e.g., "Seam Type Sewn")
    if (/Seam\s*Type/i.test(line)) {
      const m = line.match(/Seam\s*Type[:\s]*(\w+)/i);
      if (m) f.weld = m[1];
    }
    // Polymer Pellet Type
    if (/Polymer\s+Pellet\s+Type/i.test(line)) {
      const m = line.match(/Polymer\s+Pellet\s+Type[:\s]*(.+)/i);
      if (m) f.pelletType = m[1].trim();
    }
    // Percent Load
    if (/Percent\s+Load/i.test(line)) {
      const m = line.match(/Percent\s+Load[:\s]*([\d\.]+)/i);
      if (m) f.pctLoad = m[1];
    }
    // Head Pressure
    if (/Head\s+Pressure/i.test(line)) {
      const m = line.match(/Head\s+Pressure[:\s]*([\d]+)/i);
      if (m) f.headPressure = m[1];
    }
    // Extruder Output Setting
    if (/Extruder\s+Output\s+Setting/i.test(line)) {
      const m = line.match(/Extruder\s+Output\s+Setting[:\s]*(\d+)/i);
      if (m) f.output = m[1];
    }
    // Screw Speed
    if (/Screw\s+Speed/i.test(line)) {
      const m = line.match(/Screw\s+Speed[:\s]*(\d+)/i);
      if (m) f.screwSpeed = m[1];
    }
    // Chill Roller Type
    if (/Type\s+of\s+Chill\s+Roller/i.test(line)) {
      if (/Standard/i.test(line)) f.stdChill = '1';
      if (/Embossed/i.test(line)) f.embossChill = '1';
    }
    // Line Speed
    if (/Line\s+Speed/i.test(line)) {
      const m = line.match(/Line\s+Speed[:\s]*(\d+)/i);
      if (m) f.lineSpeed = m[1];
    }
    // Grams per Minute → captures start samples
    if (/Grams\s+per\s+Minute/i.test(line)) {
      let nums = line.match(/([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)/);
      if (!nums) {
        const idx = lines.indexOf(line);
        nums = lines[idx+1]?.match(/([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)/);
      }
      if (nums) {
        f.s1start = nums[1];
        f.s2start = nums[2];
        f.s3start = nums[3];
      }
    }
    // (You can extend this with Zone, Die, Material flags, etc.)
  });

  return f;
}

// ==== AUTO-FILL FORM ====
function autoFillForm(f) {
  const form = document.getElementById('data-form');
  Object.entries(f).forEach(([key, val]) => {
    const inp = form.querySelector(`[name="${key}"]`);
    if (inp) inp.value = val;
  });
}

// ==== SAVE & EXPORT ====
document.getElementById('save-btn').onclick = () => {
  const data = {};
  new FormData(dataForm).forEach((v,k) => data[k] = v.trim());

  ['Start','End'].forEach(mode => {
    const row = {};
    // Map each form field to the final Excel column
    row['Date']         = data.date;
    row['Tube #']       = data.tube;
    row['Line']         = data.line;
    row['Weld']         = data.weld;
    row['Std Chill']    = data.stdChill;
    row['Emboss Chill'] = data.embossChill;

    // Samples & Avg
    const s1 = +data[`s1${mode.toLowerCase()}`] || '';
    const s2 = +data[`s2${mode.toLowerCase()}`] || '';
    const s3 = +data[`s3${mode.toLowerCase()}`] || '';
    row['S1']  = s1;
    row['S2']  = s2;
    row['S3']  = s3;
    row['Avg'] = (s1 && s2 && s3) ? ((s1 + s2 + s3) / 3).toFixed(2) : '';

    // Flags & Other fields
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
    row['Melt Index']  = ''; // blank per spec
    row['Comments']    = `${mode} - ${data.comments || ''}`;

    entries.push(row);
  });

  saveEntries();
  dataForm.reset();
  dataForm.hidden = true;
};

document.getElementById('export-btn').onclick = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(entries, { header: Object.keys(entries[0] || {}) });
  XLSX.utils.book_append_sheet(wb, ws, 'Scans');
  XLSX.writeFile(wb, 'scan-log.xlsx');
};

// ==== INITIALIZE ====
renderEntriesTable();
console.log('✅ App initialized. Entries loaded:', entries.length);
