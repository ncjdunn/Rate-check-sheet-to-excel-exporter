// ==== TESSERACT.JS WORKER SETUP ====
const worker = Tesseract.createWorker({
  logger: m => console.log('Tesseract:', m) // optional progress logging
});
(async () => {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  // choose a pageseg mode that fits your layout
  await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_COLUMN });
  console.log('✅ Tesseract worker ready');
})();

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
      // load into an Image
      const img = new Image();
      const objectURL = URL.createObjectURL(file);
      const imgLoad = new Promise((res, rej) => {
        img.onload  = () => res();
        img.onerror = () => rej(new Error('Could not load image for OCR.'));
      });
      img.src = objectURL;
      await imgLoad;

      // upscale to at least 1024px width
      const MIN_WIDTH = 1024;
      const scale = Math.max(1, MIN_WIDTH / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');

      // apply simple grayscale+contrast filter if supported
      if ('filter' in ctx) {
        ctx.filter = 'grayscale(100%) contrast(150%)';
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      console.log(`⏳ Starting OCR on ${canvas.width}×${canvas.height} px…`);
      const { data: { text } } = await worker.recognize(canvas);
      console.log('✅ OCR complete. Text:', text);

      const fields = parseTextToFields(text);
      autoFillForm(fields);
      dataForm.hidden = false;
      scanBtn.hidden = true;
    } catch (err) {
      console.error('❌ OCR failed:', err);
      alert('OCR failed: ' + err.message);
      scanBtn.disabled = false;
    }
  };
}

// ==== PARSING OCR TEXT INTO FORM FIELDS ====
function parseTextToFields(text) {
  const f = {};
  [
    'date','tube','line','weld','pelletType',
    'stdChill','embossChill','tpo','covestro','lubrizol','down3010',
    'extrOnly','doubleTape','remote','local',
    's1start','s2start','s3start','s1end','s2end','s3end',
    'lineSpeed','output','screwSpeed','dieLip',
    'zone1','zone2','zone3','die1','die2','die3','die4',
    'pctLoad','headPressure','comments'
  ].forEach(k => f[k] = '');

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  for (let line of lines) {
    if (/Production\s+Line/i.test(line)) {
      const m = line.match(/L-?(\d)[-–]?([ND])/i);
      if (m) f.line = m[1] + m[2];
    }
    if (/^Date[:\s]/i.test(line)) {
      const m = line.match(/Date[:\s]*([\d\/]+)/i);
      if (m) f.date = m[1];
    }
    if (/^Tube\s*#/i.test(line)) {
      const m = line.match(/Tube\s*#[:\s]*(\d+)/i);
      if (m) f.tube = m[1];
    }
    if (/Seam\s*Type/i.test(line)) {
      const m = line.match(/Seam\s*Type[:\s]*(\w+)/i);
      if (m) f.weld = m[1];
    }
    if (/Polymer\s+Pellet\s+Type/i.test(line)) {
      const m = line.match(/Polymer\s+Pellet\s+Type[:\s]*(.+)/i);
      if (m) f.pelletType = m[1].trim();
    }
    if (/Percent\s+Load/i.test(line)) {
      const m = line.match(/Percent\s+Load[:\s]*([\d\.]+)/i);
      if (m) f.pctLoad = m[1];
    }
    if (/Head\s+Pressure/i.test(line)) {
      const m = line.match(/Head\s+Pressure[:\s]*([\d]+)/i);
      if (m) f.headPressure = m[1];
    }
    if (/Extruder\s+Output\s+Setting/i.test(line)) {
      const m = line.match(/Extruder\s+Output\s+Setting[:\s]*(\d+)/i);
      if (m) f.output = m[1];
    }
    if (/Screw\s+Speed/i.test(line)) {
      const m = line.match(/Screw\s+Speed[:\s]*(\d+)/i);
      if (m) f.screwSpeed = m[1];
    }
    if (/Type\s+of\s+Chill\s+Roller/i.test(line)) {
      if (/Standard/i.test(line))  f.stdChill    = '1';
      if (/Embossed/i.test(line))  f.embossChill = '1';
    }
    if (/Line\s+Speed/i.test(line)) {
      const m = line.match(/Line\s+Speed[:\s]*(\d+)/i);
      if (m) f.lineSpeed = m[1];
    }
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
  }

  // fallbacks
  if (!f.date) {
    const m = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
    if (m) f.date = m[0];
  }
  if (!f.tube) {
    const m = text.match(/\b\d{4,}\b/);
    if (m) f.tube = m[0];
  }
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
  new FormData(dataForm).forEach((v,k)=> data[k] = v.trim());

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
    row['S1']=s1; row['S2']=s2; row['S3']=s3;
    row['Avg']= (s1&&s2&&s3) ? ((s1+s2+s3)/3).toFixed(2):'';

    [ ['tpo','TPO'], ['covestro','Covestro'], ['lubrizol','Lubrizol'],
      ['down3010','3010 Down'], ['pelletType','Pellet Type'],
      ['extrOnly','Extr Only'], ['doubleTape','Double Tape'],
      ['remote','Remote'], ['local','Local']
    ].forEach(([k,c])=>row[c]=data[k]||'');

    [ ['lineSpeed','Line Speed'], ['output','Output'],
      ['screwSpeed','Screw Speed'], ['dieLip','Die Lip'],
      ['zone1','Zone1'], ['zone2','Zone2'], ['zone3','Zone3'],
      ['die1','Die1'], ['die2','Die2'], ['die3','Die3'], ['die4','Die4'],
      ['pctLoad','% Load'], ['headPressure','Head Pressure']
    ].forEach(([k,c])=>row[c]=data[k]||'');

    row['Melt Index']='';
    row['Comments']=`${mode} - ${data.comments||''}`;

    entries.push(row);
  });

  saveEntries();
  dataForm.reset();
  dataForm.hidden = true;
};

document.getElementById('export-btn').onclick = () => {
  if (!entries.length) {
    return alert('No entries to export!');
  }
  const header = [
    'Date','Tube #','Line','Weld','Std Chill','Emboss Chill',
    'S1','S2','S3','Avg','TPO','Covestro','Lubrizol','3010 Down',
    'Pellet Type','Extr Only','Double Tape','Line Speed','Output',
    'Remote','Local','Screw Speed','Die Lip','Zone1','Zone2','Zone3',
    'Die1','Die2','Die3','Die4','% Load','Head Pressure','Melt Index','Comments'
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(entries, { header, origin: 'A1' });
  XLSX.utils.book_append_sheet(wb, ws, 'Scans');
  XLSX.writeFile(wb, 'scan-log.xlsx');
};

// ==== INITIALIZE ====
renderEntriesTable();
