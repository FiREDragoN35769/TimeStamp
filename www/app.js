const STORAGE_KEY='timestamp.days.v2';
const MAX_ROWS=10;
const dayTitle=document.getElementById('dayTitle');
const rowsEl=document.getElementById('rows');
const addRowsHost=document.getElementById('addRowsHost');
const totalHM=document.getElementById('totalHM');
const totalDecimal=document.getElementById('totalDecimal');
const prevDay=document.getElementById('prevDay');
const nextDay=document.getElementById('nextDay');
const clearDay=document.getElementById('clearDay');
const finishBtn=document.getElementById('finishBtn');
const summaryView=document.getElementById('summaryView');
const summaryList=document.getElementById('summaryList');
const grandHM=document.getElementById('grandHM');
const grandDecimal=document.getElementById('grandDecimal');
const backToDay=document.getElementById('backToDay');
const error=document.getElementById('error');

let currentDate=startOfDay(new Date());
let days=loadDays();
repairSavedAfternoonEnds();

function startOfDay(date){const d=new Date(date);d.setHours(0,0,0,0);return d;}
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function formatDate(date){return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'}).format(date);}
function emptyDay(){return [{in:'',out:''}];}
function compactRows(rows){const source=Array.isArray(rows)?rows.map(r=>({in:r?.in||'',out:r?.out||''})):[];while(source.length>1&&!source[source.length-1].in&&!source[source.length-1].out)source.pop();return source.length?source:emptyDay();}
function loadDays(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return p&&typeof p==='object'?p:{}}catch{return{}}}
function saveDays(){localStorage.setItem(STORAGE_KEY,JSON.stringify(days));}
function getRowsForCurrentDay(){const key=dateKey(currentDate);if(!Array.isArray(days[key])||!days[key].length)days[key]=emptyDay();return days[key];}
function ensureRow(index){const key=dateKey(currentDate);const rows=getRowsForCurrentDay();while(rows.length<=index)rows.push({in:'',out:''});days[key]=rows;return rows;}

function parseTime(value){const text=String(value||'').trim().toLowerCase().replace(/\s+/g,'');if(!text)return null;const m=text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);if(!m)return NaN;let h=Number(m[1]);const min=Number(m[2]||0),mer=m[3];if(min>59)return NaN;if(mer){if(h<1||h>12)return NaN;if(h===12)h=0;if(mer==='pm')h+=12;}else if(h>23)return NaN;return h*60+min;}
function workedMinutes(entry){if(!entry||!entry.in||!entry.out)return 0;const s=parseTime(entry.in);let e=parseTime(entry.out);if(!Number.isFinite(s)||!Number.isFinite(e))return NaN;if(e<s)e+=1440;return e-s;}

function repairSavedAfternoonEnds(){
  let changed=false;
  Object.values(days).forEach(rows=>{
    if(!Array.isArray(rows))return;
    rows.forEach(entry=>{
      if(!entry?.in||!entry?.out)return;
      const start=String(entry.in).trim().toUpperCase();
      const end=String(entry.out).trim().toUpperCase();
      // If an afternoon start was followed by an AM end and that creates a >12h shift,
      // the number-only end was almost certainly meant to be PM the same day.
      if(/PM$/.test(start)&&/AM$/.test(end)){
        const s=parseTime(start);let e=parseTime(end);if(!Number.isFinite(s)||!Number.isFinite(e))return;if(e<s)e+=1440;
        if(e-s>12*60){entry.out=end.replace(' AM',' PM');changed=true;}
      }
    });
  });
  if(changed)saveDays();
}

function hm(minutes){const safe=Math.max(0,Math.round(minutes||0));return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,'0')}`;}
function decimal(minutes){return((minutes||0)/60).toFixed(2);}
function dayTotal(rows){let total=0,invalid=false;(rows||[]).forEach(entry=>{const mins=workedMinutes(entry);if(Number.isNaN(mins))invalid=true;else total+=mins;});return{total,invalid};}

function makeRow(entry,index){
  const row=document.createElement('div');row.className='row-grid data-row';
  const num=document.createElement('div');num.className='row-num';num.textContent=index+1;
  const inInput=makeTimeInput(entry?.in||'','In time',index,'in');
  const outInput=makeTimeInput(entry?.out||'','Out time',index,'out');
  const hours=document.createElement('div');hours.className='row-hours';
  const mins=workedMinutes(entry);hours.textContent=Number.isFinite(mins)?hm(mins):'—';if(!Number.isFinite(mins))hours.classList.add('bad');
  row.append(num,inInput,outInput,hours);return row;
}

function makeTimeInput(value,label,index,field){
  const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.placeholder='e.g. 1031';input.setAttribute('aria-label',`${label} row ${index+1}`);input.value=value||'';
  input.addEventListener('input',()=>{const rows=ensureRow(index);rows[index][field]=input.value;saveDays();renderTotalsOnly();});
  input.addEventListener('blur',()=>{
    const rows=ensureRow(index);
    const n=normalizeDisplayTime(input.value,field==='out'?rows[index].in:'');
    if(n){input.value=n;rows[index][field]=n;saveDays();repairSavedAfternoonEnds();}
    renderDay();
  });
  return input;
}

function normalizeDisplayTime(value,startValue=''){
  const text=String(value||'').trim().toLowerCase().replace(/\s+/g,'');if(!text)return'';
  const m=text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);if(!m)return'';
  let h=Number(m[1]);const min=Number(m[2]||0),mer=m[3];if(min>59)return'';
  if(mer){if(h<1||h>12)return'';return `${h}:${String(min).padStart(2,'0')} ${mer.toUpperCase()}`;}
  if(h>23)return'';
  // For an OUT time typed without AM/PM, infer the shortest forward shift from IN.
  // Example: 12:15 PM then 631 becomes 6:31 PM, not next-morning 6:31 AM.
  const start=parseTime(startValue);
  if(Number.isFinite(start)&&h>=1&&h<=12){
    const am=((h===12?0:h)*60)+min;
    const pm=am+12*60;
    let amDiff=am-start;if(amDiff<0)amDiff+=1440;
    let pmDiff=pm-start;if(pmDiff<0)pmDiff+=1440;
    const chosen=pmDiff<amDiff?'PM':'AM';
    return `${h}:${String(min).padStart(2,'0')} ${chosen}`;
  }
  if(h===0)return`12:${String(min).padStart(2,'0')} AM`;
  if(h<12)return`${h}:${String(min).padStart(2,'0')} AM`;
  if(h===12)return`${h}:${String(min).padStart(2,'0')} PM`;
  return`${h-12}:${String(min).padStart(2,'0')} PM`;
}

function buildAddChain(startIndex){
  if(startIndex>=MAX_ROWS)return null;
  const details=document.createElement('details');details.className='add-details';
  const summary=document.createElement('summary');summary.className='add-time';summary.textContent='+ Add new time';
  const entry=getRowsForCurrentDay()[startIndex]||{in:'',out:''};
  const row=makeRow(entry,startIndex);
  details.append(summary,row);
  const next=buildAddChain(startIndex+1);if(next)details.appendChild(next);
  return details;
}

function renderDay(){summaryView.classList.add('hidden');document.querySelector('.timesheet-card').classList.remove('hidden');dayTitle.textContent=formatDate(currentDate);rowsEl.innerHTML='';addRowsHost.innerHTML='';error.textContent='';const rows=compactRows(getRowsForCurrentDay());days[dateKey(currentDate)]=rows;rows.forEach((entry,index)=>rowsEl.appendChild(makeRow(entry,index)));const chain=buildAddChain(rows.length);if(chain)addRowsHost.appendChild(chain);renderTotalsOnly();}
function renderTotalsOnly(){const rows=getRowsForCurrentDay();const{total,invalid}=dayTotal(rows);totalHM.textContent=hm(total);totalDecimal.textContent=decimal(total);error.textContent=invalid?'One or more times are not valid yet.':'';document.querySelectorAll('.data-row').forEach((row,index)=>{const mins=workedMinutes(rows[index]);const hours=row.querySelector('.row-hours');if(hours){hours.textContent=Number.isFinite(mins)?hm(mins):'—';hours.classList.toggle('bad',!Number.isFinite(mins));}});}
function changeDay(delta){currentDate.setDate(currentDate.getDate()+delta);currentDate=startOfDay(currentDate);renderDay();}
function renderSummary(){repairSavedAfternoonEnds();document.querySelector('.timesheet-card').classList.add('hidden');summaryView.classList.remove('hidden');summaryList.innerHTML='';const entries=Object.entries(days).map(([key,rows])=>({key,rows:compactRows(rows)})).filter(({rows})=>rows.some(r=>r.in||r.out)).sort((a,b)=>a.key.localeCompare(b.key));let grand=0;if(!entries.length)summaryList.innerHTML='<p class="empty">No time entered yet.</p>';entries.forEach(({key,rows})=>{const date=new Date(`${key}T00:00:00`),{total}=dayTotal(rows);grand+=total;const used=rows.filter(r=>r.in||r.out);const block=document.createElement('article');block.className='summary-day';block.innerHTML=`<div class="summary-day-head"><strong>${formatDate(date)}</strong></div><div class="summary-table"><div class="summary-columns"><span>#</span><span>IN</span><span>OUT</span><strong>HOURS</strong></div>${used.map((r,i)=>`<div><span>${i+1}</span><span>${escapeHtml(r.in||'')}</span><span>${escapeHtml(r.out||'')}</span><strong>${Number.isFinite(workedMinutes(r))?hm(workedMinutes(r)):'—'}</strong></div>`).join('')}<div class="day-total-row"><span></span><span></span><span>Day Total</span><strong>${hm(total)}</strong></div><div class="day-total-row decimal-row"><span></span><span></span><span>Decimal</span><strong>${decimal(total)}</strong></div></div>`;summaryList.appendChild(block);});grandHM.textContent=hm(grand);grandDecimal.textContent=decimal(grand);}
function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

prevDay.addEventListener('click',()=>changeDay(-1));nextDay.addEventListener('click',()=>changeDay(1));finishBtn.addEventListener('click',renderSummary);backToDay.addEventListener('click',renderDay);clearDay.addEventListener('click',()=>{days[dateKey(currentDate)]=emptyDay();saveDays();renderDay();});
renderDay();
