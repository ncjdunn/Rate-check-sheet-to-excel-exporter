// ==== CAMERA & FILE-INPUT WIRING ====
const cameraBtn       = document.getElementById('camera-btn');
const chooseFileBtn   = document.getElementById('choose-file-btn');
const cameraInput     = document.getElementById('camera-input');
const fileInput       = document.getElementById('file-input');
const fileNamePreview = document.getElementById('file-name-preview');
const scanBtn         = document.getElementById('scan-btn');
const dataForm        = document.getElementById('data-form');

console.log('[DEBUG] Wiring up buttons');
cameraBtn.addEventListener('click',     () => { console.log('[DEBUG] cameraBtn clicked'); cameraInput.click(); });
chooseFileBtn.addEventListener('click', () => { console.log('[DEBUG] chooseFileBtn clicked'); fileInput.click(); });
cameraInput.addEventListener('change',   handleFileSelect);
fileInput.addEventListener('change',     handleFileSelect);

// ==== APP STATE & RENDER ====
let entries = JSON.parse(localStorage.getItem('entries') || '[]');
console.log('[DEBUG] Loaded entries from storage:', entries);

function saveEntries() {
  console.log('[DEBUG] saveEntries() called. entries before save:', entries);
  localStorage.setItem('entries', JSON.stringify(entries));
  renderEntriesTable();
  console.log('[DEBUG] Entries saved to localStorage.');
}

function renderEntriesTable() {
  console.log('[DEBUG] renderEntriesTable()');
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
  entries.forEach((row, i) => {
    const tr = document.createElement('tr');
    cols.forEach(key => {
      const td = document.createElement('td');
      td.textContent = row[key] || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
    console.log(`[DEBUG] Rendered row ${i}:`, row);
  });
}

// ==== FILE SELECT & OCR TRIGGER ====
async function handleFileSelect(evt) {
  const file = evt.target.files[0];
  if (!file) {
    console.warn('[DEBUG] No file selected');
    alert('No file selected!');
    return;
  }
  console.log('▶️ File selected:', file.name);

  // Show only filename
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
      console.log('✅ OCR complete. Full text:\n', text);

      const fields = parseTextToFields(text);
      console.log('📋 Parsed fields object:', fields);

      // Check critical fields
      if (!fields.date || !fields.tube) {
        console.error('[DEBUG] Parsed date or tube missing:', fields);
        alert('OCR didn’t pick up Date or Tube #. Check console for full OCR text.');
      }

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
  console.log('[DEBUG] parseTextToFields()');
  const f = {};
  // Initialize all keys to ''
  [
    'date','tube','line','weld','pelletType',
    'stdChill','embossChill','tpo','covestro','lubrizol','down3010',
    'extrOnly','doubleTape','remote','local',
    's1start','s2start','s3start','s1end','s2end','s3end',
    'lineSpeed','output','screwSpeed','dieLip',
    'zone1','zone2','zone3','die1','die2','die3','die4',
    'pctLoad','headPressure','comments'
  ].forEach(k => f[k] = '');

  // debug text split
  console.log('[DEBUG] OCR text split into lines:', text.split('\n').length);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  lines.forEach((line, idx) => {
    console.log(`[DEBUG] Line ${idx}:`, line);
    // Production Line
    if (/Production\s+Line/i.test(line)) {
      const m = line.match(/L-?(\d)[-–]?([ND])/i);
      if (m) f.line = m[1] + m[2];
      console.log('[DEBUG] Matched Production Line →', f.line);
    }
    // Date
    if (/^Date[:\s]/i.test(line)) {
      const m = line.match(/Date[:\s]*([\d\/]+)/i);
      if (m) f.date = m[1];
      console.log('[DEBUG] Matched Date →', f.date);
    }
    // Tube #
    if (/^Tube\s*#/i.test(line)) {
      const m = line.match(/Tube\s*#[:\s]*(\d+)/i);
      if (m) f.tube = m[1];
      console.log('[DEBUG] Matched Tube # →', f.tube);
    }
    // Seam Type
    if (/Seam\s*Type/i.test(line)) {
      const m = line.match(/Seam\s*Type[:\s]*(\w+)/i);
      if (m) f.weld = m[1];
      console.log('[DEBUG] Matched Weld →', f.weld);
    }
    // Polymer Pellet Type
    if (/Polymer\s+Pellet\s+Type/i.test(line)) {
      const m = line.match(/Polymer\s+Pellet\s+Type[:\s]*(.+)/i);
      if (m) f.pelletType = m[1].trim();
      console.log('[DEBUG] Matched Pellet Type →', f.pelletType);
    }
    // Percent Load
    if (/Percent\s+Load/i.test(line)) {
      const m = line.match(/Percent\s+Load[:\s]*([\d\.]+)/i);
      if (m) f.pctLoad = m[1];
      console.log('[DEBUG] Matched % Load →', f.pctLoad);
    }
    // Head Pressure
    if (/Head\s+Pressure/i.test(line)) {
      const m = line.match(/Head\s+Pressure[:\s]*([\d]+)/i);
      if (m) f.headPressure = m[1];
      console.log('[DEBUG] Matched Head Pressure →', f.headPressure);
    }
    // Extruder Output
    if (/Extruder\s+Output\s+Setting/i.test(line)) {
      const m = line.match(/Extruder\s+Output\s+Setting[:\s]*(\d+)/i);
      if (m) f.output = m[1];
      console.log('[DEBUG] Matched Output →', f.output);
    }
    // Screw Speed
    if (/Screw\s+Speed/i.test(line)) {
      const m = line.match(/Screw\s+Speed[:\s]*(\d+)/i);
      if (m) f.screwSpeed = m[1];
      console.log('[DEBUG] Matched Screw Speed →', f.screwSpeed);
    }
    // Chill Roller
    if (/Type\s+of\s+Chill\s+Roller/i.test(line)) {
      if (/Standard/i.test(line)) f.stdChill = '1';
      if (/Embossed/i.test(line)) f.embossChill = '1';
      console.log('[DEBUG] Matched Chill Roller →', f.stdChill, f.embossChill);
    }
    // Line Speed
    if (/Line\s+Speed/i.test(line)) {
      const m = line.match(/Line\s+Speed[:\s]*(\d+)/i);
      if (m) f.lineSpeed = m[1];
      console.log('[DEBUG] Matched Line Speed →', f.lineSpeed);
    }
    // Grams per Minute → start samples
    if (/Grams\s+per\s+Minute/i.test(line)) {
      let nums = line.match(/([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)/);
      if (!nums) {
        const i2 = lines.indexOf(line);
        nums = lines[i2+1]?.match(/([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)/);
      }
      if (nums) {
        f.s1start = nums[1];
        f.s2start = nums[2];
        f.s3start = nums[3];
        console.log('[DEBUG] Matched Samples start →', f.s1start, f.s2start, f.s3start);
      }
    }
  });

  return f;
}

// ==== AUTO-FILL FORM ====
function autoFillForm(f) {
  console.log('[DEBUG] autoFillForm()', f);
  const form = document.getElementById('data-form');
  Object.entries(f).forEach(([key,val]) => {
    const inp = form.querySelector(`[name="${key}"]`);
    if (inp) inp.value = val;
  });
}

// ==== SAVE & EXPORT ====
document.getElementById('save-btn').onclick = () => {
  console.log('[DEBUG] Save clicked, form values:');
  const data = {};
  new FormData(dataForm).forEach((v,k) => data[k] = v.trim());
  console.log(data);

  ['Start','End'].forEach(mode => {
    const row = {};
    row['Date']         = data.date;
    row['Tube #']       = data.tube;
    row['Line']         = data.line;
    row['Weld']         = data.weld;
    row['Std Chill']    = data.stdChill;
    row['Emboss Chill'] = data.embossChill;
    const s1 = +data[`s1${mode.toLowerCase()}`]||'';
    const s2 = +data[`s2${mode.toLowerCase()}`]||'';
    const s3 = +data[`s3${mode.toLowerCase()}`]||'';
    row['S1']  = s1; row['S2']   = s2; row['S3']  = s3;
    row['Avg'] = (s1&&s2&&s3)?((s1+s2+s3)/3).toFixed(2):'';
    ['tpo','covestro','lubrizol','down3010','pelletType','extrOnly','doubleTape','lineSpeed','output','remote','local','screwSpeed','dieLip','zone1','zone2','zone3','die1','die2','die3','die4','pctLoad','headPressure','comments']
      .forEach(key => {
        let col = key === 'pelletType' ? 'Pellet Type' :
                  key === 'down3010' ? '3010 Down' :
                  key.charAt(0).toUpperCase() + key.slice(1);
        row[col] = data[key] || '';
      });
    row['Melt Index']  = '';
    row['Comments']    = `${mode} - ${data.comments||''}`;
    console.log('[DEBUG] Pushing row for', mode, row);
    entries.push(row);
  });

  saveEntries();
  dataForm.reset();
  dataForm.hidden = true;
};

document.getElementById('export-btn').onclick = () => {
  console.log('[DEBUG] Export clicked, entries =', entries);
  if (!entries.length) {
    alert('No entries to export!');
    return;
  }
  const header = [
    'Date','Tube #','Line','Weld','Std Chill','Emboss Chill',
    'S1','S2','S3','Avg','TPO','Covestro','Lubrizol','3010 Down',
    'Pellet Type','Extr Only','Double Tape','Line Speed','Output',
    'Remote','Local','Screw Speed','Die Lip','Zone1','Zone2','Zone3',
    'Die1','Die2','Die3','Die4','% Load','Head Pressure','Melt Index','Comments'
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(entries, { header, origin:'A1' });
  XLSX.utils.book_append_sheet(wb, ws, 'Scans');
  console.log('[DEBUG] Writing file');
  XLSX.writeFile(wb, 'scan-log.xlsx');
};

// ==== INITIALIZE ====
renderEntriesTable();
console.log('✅ App initialized. Entries loaded:', entries.length);
