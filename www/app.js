const STORAGE_KEY = 'timestamp.days.v2';

const dayTitle = document.getElementById('dayTitle');
const rowsEl = document.getElementById('rows');
const totalHM = document.getElementById('totalHM');
const totalDecimal = document.getElementById('totalDecimal');
const prevDay = document.getElementById('prevDay');
const nextDay = document.getElementById('nextDay');
const clearDay = document.getElementById('clearDay');
const finishBtn = document.getElementById('finishBtn');
const summaryView = document.getElementById('summaryView');
const summaryList = document.getElementById('summaryList');
const grandHM = document.getElementById('grandHM');
const grandDecimal = document.getElementById('grandDecimal');
const backToDay = document.getElementById('backToDay');
const error = document.getElementById('error');

let currentDate = startOfDay(new Date());
let days = loadDays();

function startOfDay(date) { const d = new Date(date); d.setHours(0,0,0,0); return d; }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function formatDate(date) { return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'}).format(date); }
function emptyDay() { return [{in:'',out:''}]; }
function compactRows(rows) { const source=Array.isArray(rows)?rows.map(r=>({in:r?.in||'',out:r?.out||''})):[]; while(source.length>1&&!source[source.length-1].in&&!source[source.length-1].out)source.pop(); return source.length?source:emptyDay(); }
function loadDays(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return p&&typeof p==='object'?p:{}}catch{return {}}}
function saveDays(){localStorage.setItem(STORAGE_KEY,JSON.stringify(days));}
function getRowsForCurrentDay(){const key=dateKey(currentDate);if(!Array.isArray(days[key])||!days[key].length)days[key]=emptyDay();return days[key];}
function parseTime(value){const text=String(value||'').trim().toLowerCase().replace(/\s+/g,'');if(!text)return null;const m=text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);if(!m)return NaN;let h=Number(m[1]);const min=Number(m[2]||0),mer=m[3];if(min>59)return NaN;if(mer){if(h<1||h>12)return NaN;if(h===12)h=0;if(mer==='pm')h+=12;}else if(h>23)return NaN;return h*60+min;}
function workedMinutes(entry){if(!entry.in||!entry.out)return 0;const s=parseTime(entry.in);let e=parseTime(entry.out);if(!Number.isFinite(s)||!Number.isFinite(e))return NaN;if(e<s)e+=1440;return e-s;}
function hm(minutes){const safe=Math.max(0,Math.round(minutes||0));return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,'0')}`;}
function decimal(minutes){return((minutes||0)/60).toFixed(2);}

function renderDay(){summaryView.classList.add('hidden');document.querySelector('.timesheet-card').classList.remove('hidden');dayTitle.textContent=formatDate(currentDate);rowsEl.innerHTML='';error.textContent='';const rows=getRowsForCurrentDay();rows.forEach((entry,index)=>{const row=document.createElement('div');row.className='row-grid data-row';const num=document.createElement('div');num.className='row-num';num.textContent=index+1;const inInput=makeTimeInput(entry.in,'In time',index,'in');const outInput=makeTimeInput(entry.out,'Out time',index,'out');const hours=document.createElement('div');hours.className='row-hours';const mins=workedMinutes(entry);hours.textContent=Number.isFinite(mins)?hm(mins):'—';if(!Number.isFinite(mins))hours.classList.add('bad');row.append(num,inInput,outInput,hours);rowsEl.appendChild(row);});renderTotalsOnly();}
function makeTimeInput(value,label,index,field){const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.placeholder='e.g. 1031';input.setAttribute('aria-label',`${label} row ${index+1}`);input.value=value||'';input.addEventListener('input',()=>{const key=dateKey(currentDate),rows=getRowsForCurrentDay();rows[index][field]=input.value;days[key]=rows;saveDays();renderTotalsOnly();});input.addEventListener('blur',()=>{const n=normalizeDisplayTime(input.value);if(n){input.value=n;const key=dateKey(currentDate),rows=getRowsForCurrentDay();rows[index][field]=n;days[key]=rows;saveDays();}renderTotalsOnly();});return input;}
function normalizeDisplayTime(value){const text=String(value||'').trim().toLowerCase().replace(/\s+/g,'');if(!text)return'';const m=text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);if(!m)return'';let h=Number(m[1]);const min=Number(m[2]||0),mer=m[3];if(min>59)return'';if(mer){if(h<1||h>12)return'';return`${h}:${String(min).padStart(2,'0')} ${mer.toUpperCase()}`;}if(h>23)return'';if(h===0)return`12:${String(min).padStart(2,'0')} AM`;if(h<12)return`${h}:${String(min).padStart(2,'0')} AM`;if(h===12)return`${h}:${String(min).padStart(2,'0')} PM`;return`${h-12}:${String(min).padStart(2,'0')} PM`;}
function dayTotal(rows){let total=0,invalid=false;rows.forEach(entry=>{const mins=workedMinutes(entry);if(Number.isNaN(mins))invalid=true;else total+=mins;});return{total,invalid};}
function renderTotalsOnly(){const rows=getRowsForCurrentDay(),{total,invalid}=dayTotal(rows);totalHM.textContent=hm(total);totalDecimal.textContent=decimal(total);error.textContent=invalid?'One or more times are not valid yet.':'';[...rowsEl.querySelectorAll('.data-row')].forEach((row,index)=>{const mins=workedMinutes(rows[index]),hours=row.querySelector('.row-hours');hours.textContent=Number.isFinite(mins)?hm(mins):'—';hours.classList.toggle('bad',!Number.isFinite(mins));});}
function changeDay(delta){currentDate.setDate(currentDate.getDate()+delta);currentDate=startOfDay(currentDate);renderDay();}

function addTimeFromNavigation(){
  const params=new URLSearchParams(window.location.search);
  if(params.get('add')!=='1') return;
  const key=dateKey(currentDate);
  const existing=Array.isArray(days[key])&&days[key].length?days[key]:emptyDay();
  days[key]=[...existing,{in:'',out:''}];
  saveDays();
  if(window.history&&history.replaceState) history.replaceState({},'', 'index.html');
}

function renderSummary(){document.querySelector('.timesheet-card').classList.add('hidden');summaryView.classList.remove('hidden');summaryList.innerHTML='';const entries=Object.entries(days).map(([key,rows])=>({key,rows:compactRows(rows)})).filter(({rows})=>rows.some(r=>r.in||r.out)).sort((a,b)=>a.key.localeCompare(b.key));let grand=0;if(!entries.length)summaryList.innerHTML='<p class="empty">No time entered yet.</p>';entries.forEach(({key,rows})=>{const date=new Date(`${key}T00:00:00`),{total}=dayTotal(rows);grand+=total;const used=rows.filter(r=>r.in||r.out);const block=document.createElement('article');block.className='summary-day';block.innerHTML=`<div class="summary-day-head"><strong>${formatDate(date)}</strong></div><div class="summary-table"><div class="summary-columns"><span>#</span><span>IN</span><span>OUT</span><strong>HOURS</strong></div>${used.map((r,i)=>`<div><span>${i+1}</span><span>${escapeHtml(r.in||'')}</span><span>${escapeHtml(r.out||'')}</span><strong>${Number.isFinite(workedMinutes(r))?hm(workedMinutes(r)):'—'}</strong></div>`).join('')}<div class="day-total-row"><span></span><span></span><span>Day Total</span><strong>${hm(total)}</strong></div><div class="day-total-row decimal-row"><span></span><span></span><span>Decimal</span><strong>${decimal(total)}</strong></div></div>`;summaryList.appendChild(block);});grandHM.textContent=hm(grand);grandDecimal.textContent=decimal(grand);}
function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

prevDay.addEventListener('click',()=>changeDay(-1));
nextDay.addEventListener('click',()=>changeDay(1));
finishBtn.addEventListener('click',renderSummary);
backToDay.addEventListener('click',renderDay);
clearDay.addEventListener('click',()=>{days[dateKey(currentDate)]=emptyDay();saveDays();renderDay();});

addTimeFromNavigation();
renderDay();
