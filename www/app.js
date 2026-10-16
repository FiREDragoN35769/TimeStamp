const STORAGE_KEY='timestamp.days.v2';
const RATE_KEY='timestamp.hourlyRate.v1';
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
const hourlyRate=document.getElementById('hourlyRate');
const weeklyPay=document.getElementById('weeklyPay');
const backToDay=document.getElementById('backToDay');
const error=document.getElementById('error');

let currentDate=startOfDay(new Date());
const EMPLOYEE_KEY='timestamp.employees.v1';
const ACTIVE_KEY='timestamp.activeEmployee.v1';
const employeeSelect=document.getElementById('employeeSelect');
const addEmployee=document.getElementById('addEmployee');
const deleteEmployee=document.getElementById('deleteEmployee');
function loadEmployees(){try{const data=JSON.parse(localStorage.getItem(EMPLOYEE_KEY)||'null');if(Array.isArray(data)&&data.length)return data.filter(e=>e&&typeof e.id==='string'&&typeof e.name==='string');}catch{}return [{id:'default',name:'Employee 1'}];}
let employees=loadEmployees();
let activeEmployee=employees.some(e=>e.id===localStorage.getItem(ACTIVE_KEY))?localStorage.getItem(ACTIVE_KEY):employees[0].id;
function employeeDaysKey(){return 'timestamp.employee.days.'+activeEmployee;}
function employeeRateKey(){return 'timestamp.employee.rate.'+activeEmployee;}
function persistEmployees(){localStorage.setItem(EMPLOYEE_KEY,JSON.stringify(employees));localStorage.setItem(ACTIVE_KEY,activeEmployee);}
function refreshEmployees(){employeeSelect.replaceChildren();employees.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;employeeSelect.appendChild(o);});employeeSelect.value=activeEmployee;deleteEmployee.disabled=employees.length===1;}
function switchEmployee(id){if(!employees.some(e=>e.id===id))return;activeEmployee=id;persistEmployees();days=loadDays();hourlyRate.value=localStorage.getItem(employeeRateKey())||'';refreshEmployees();renderDay();}
let days=loadDays();
persistEmployees();refreshEmployees();
hourlyRate.value=localStorage.getItem(employeeRateKey())||'';

function startOfDay(date){const d=new Date(date);d.setHours(0,0,0,0);return d;}
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function formatDate(date){return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'}).format(date);}
function emptyDay(){return [{in:'',out:''}];}
function compactRows(rows){const source=Array.isArray(rows)?rows.map(r=>({in:r?.in||'',out:r?.out||''})):[];while(source.length>1&&!source[source.length-1].in&&!source[source.length-1].out)source.pop();return source.length?source:emptyDay();}
function loadDays(){try{const p=JSON.parse(localStorage.getItem(employeeDaysKey())||(activeEmployee==='default'?localStorage.getItem(STORAGE_KEY):null)||'{}');return p&&typeof p==='object'?p:{}}catch{return{}}}
function saveDays(){localStorage.setItem(employeeDaysKey(),JSON.stringify(days));}
function getRowsForCurrentDay(){const key=dateKey(currentDate);if(!Array.isArray(days[key])||!days[key].length)days[key]=emptyDay();return days[key];}
function ensureRow(index){const key=dateKey(currentDate);const rows=getRowsForCurrentDay();while(rows.length<=index)rows.push({in:'',out:''});days[key]=rows;return rows;}

function parseTime(value){const text=String(value||'').trim().toLowerCase().replace(/\s+/g,'');if(!text)return null;const m=text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);if(!m)return NaN;let h=Number(m[1]);const min=Number(m[2]||0),mer=m[3];if(min>59)return NaN;if(mer){if(h<1||h>12)return NaN;if(h===12)h=0;if(mer==='pm')h+=12;}else if(h>23)return NaN;return h*60+min;}
function workedMinutes(entry){if(!entry||!entry.in||!entry.out)return 0;const s=parseTime(entry.in);let e=parseTime(entry.out);if(!Number.isFinite(s)||!Number.isFinite(e))return NaN;if(e<s)e+=1440;return e-s;}
function hm(minutes){const safe=Math.max(0,Math.round(minutes||0));return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,'0')}`;}
function decimal(minutes){return((minutes||0)/60).toFixed(2);}
function dayTotal(rows){let total=0,invalid=false;(rows||[]).forEach(entry=>{const mins=workedMinutes(entry);if(Number.isNaN(mins))invalid=true;else total+=mins;});return{total,invalid};}

function splitTimeValue(value){const text=String(value||'').trim().toUpperCase();const mer=text.endsWith(' PM')?'PM':'AM';const clock=text.replace(/\s*(AM|PM)$/,'').trim();return{clock,meridiem:mer};}
function normalizeDisplayTime(value){const text=String(value||'').trim().toLowerCase().replace(/\s+/g,'');if(!text)return'';const m=text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)$/);if(!m)return'';const h=Number(m[1]);const min=Number(m[2]||0);const mer=m[3].toUpperCase();if(h<1||h>12||min>59)return'';return `${h}:${String(min).padStart(2,'0')} ${mer}`;}

function makeRow(entry,index){const row=document.createElement('div');row.className='row-grid data-row';const num=document.createElement('div');num.className='row-num';num.textContent=index+1;const inInput=makeTimeInput(entry?.in||'','In time',index,'in');const outInput=makeTimeInput(entry?.out||'','Out time',index,'out');const hours=document.createElement('div');hours.className='row-hours';const mins=workedMinutes(entry);hours.textContent=Number.isFinite(mins)?hm(mins):'—';if(!Number.isFinite(mins))hours.classList.add('bad');row.append(num,inInput,outInput,hours);return row;}
function makeTimeInput(value,label,index,field){const{clock,meridiem}=splitTimeValue(value);const wrap=document.createElement('div');wrap.className='time-entry';const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.placeholder='1031';input.setAttribute('aria-label',`${label} row ${index+1}`);input.value=clock;const toggle=document.createElement('button');toggle.type='button';toggle.className='ampm-toggle';toggle.textContent=meridiem;toggle.setAttribute('aria-label',`${label} AM or PM row ${index+1}`);function saveCurrent(normalize=false){const rows=ensureRow(index);const combined=`${input.value} ${toggle.textContent}`.trim();const normalized=normalizeDisplayTime(combined);if(normalize&&normalized){rows[index][field]=normalized;input.value=normalized.replace(/\s*(AM|PM)$/,'').trim();}else{rows[index][field]=normalized||combined;}saveDays();renderTotalsOnly();}input.addEventListener('input',()=>saveCurrent(false));input.addEventListener('blur',()=>saveCurrent(true));toggle.addEventListener('click',()=>{toggle.textContent=toggle.textContent==='AM'?'PM':'AM';saveCurrent(true);});wrap.append(input,toggle);return wrap;}

function buildAddChain(startIndex){if(startIndex>=MAX_ROWS)return null;const details=document.createElement('details');details.className='add-details';const summary=document.createElement('summary');summary.className='add-time';summary.textContent='+ Add new time';const entry=getRowsForCurrentDay()[startIndex]||{in:'',out:''};const row=makeRow(entry,startIndex);details.append(summary,row);const next=buildAddChain(startIndex+1);if(next)details.appendChild(next);return details;}
function renderDay(){summaryView.classList.add('hidden');document.querySelector('.timesheet-card').classList.remove('hidden');dayTitle.textContent=formatDate(currentDate);rowsEl.innerHTML='';addRowsHost.innerHTML='';error.textContent='';const rows=compactRows(getRowsForCurrentDay());days[dateKey(currentDate)]=rows;rows.forEach((entry,index)=>rowsEl.appendChild(makeRow(entry,index)));const chain=buildAddChain(rows.length);if(chain)addRowsHost.appendChild(chain);renderTotalsOnly();}
function renderTotalsOnly(){const rows=getRowsForCurrentDay();const{total,invalid}=dayTotal(rows);totalHM.textContent=hm(total);totalDecimal.textContent=decimal(total);error.textContent=invalid?'One or more times are not valid yet.':'';document.querySelectorAll('.data-row').forEach((row,index)=>{const mins=workedMinutes(rows[index]);const hours=row.querySelector('.row-hours');if(hours){hours.textContent=Number.isFinite(mins)?hm(mins):'—';hours.classList.toggle('bad',!Number.isFinite(mins));}});}
function changeDay(delta){currentDate.setDate(currentDate.getDate()+delta);currentDate=startOfDay(currentDate);renderDay();}
function renderWeeklyPay(grandMinutes){const rate=Math.max(0,Number(hourlyRate.value)||0);weeklyPay.textContent=`$${((grandMinutes/60)*rate).toFixed(2)}`;}
function renderSummary(){document.querySelector('.timesheet-card').classList.add('hidden');summaryView.classList.remove('hidden');summaryList.innerHTML='';const weekStart=startOfDay(currentDate);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));const weekEnd=startOfDay(weekStart);weekEnd.setDate(weekEnd.getDate()+7);const firstKey=dateKey(weekStart),endKey=dateKey(weekEnd);const entries=Object.entries(days).filter(([key])=>key>=firstKey&&key<endKey).map(([key,rows])=>({key,rows:compactRows(rows)})).filter(({rows})=>rows.some(r=>r.in||r.out)).sort((a,b)=>a.key.localeCompare(b.key));let grand=0;if(!entries.length)summaryList.innerHTML='<p class="empty">No time entered yet.</p>';entries.forEach(({key,rows})=>{const date=new Date(`${key}T00:00:00`),{total}=dayTotal(rows);grand+=total;const used=rows.filter(r=>r.in||r.out);const block=document.createElement('article');block.className='summary-day';block.innerHTML=`<div class="summary-day-head"><strong>${formatDate(date)}</strong></div><div class="summary-table"><div class="summary-columns"><span>#</span><span>IN</span><span>OUT</span><strong>HOURS</strong></div>${used.map((r,i)=>`<div><span>${i+1}</span><span>${escapeHtml(r.in||'')}</span><span>${escapeHtml(r.out||'')}</span><strong>${Number.isFinite(workedMinutes(r))?hm(workedMinutes(r)):'—'}</strong></div>`).join('')}<div class="day-total-row"><span></span><span></span><span>Day Total</span><strong>${hm(total)}</strong></div><div class="day-total-row decimal-row"><span></span><span></span><span>Decimal</span><strong>${decimal(total)}</strong></div></div>`;summaryList.appendChild(block);});grandHM.textContent=hm(grand);grandDecimal.textContent=decimal(grand);renderWeeklyPay(grand);}
function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

employeeSelect.addEventListener('change',()=>switchEmployee(employeeSelect.value));
addEmployee.addEventListener('click',()=>{const name=prompt('Employee name:');if(!name||!name.trim())return;const id='e'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);employees.push({id,name:name.trim().slice(0,80)});switchEmployee(id);});
deleteEmployee.addEventListener('click',()=>{if(employees.length<=1)return;const current=employees.find(e=>e.id===activeEmployee);if(!confirm('Delete '+current.name+' and all their saved hours?'))return;const id=activeEmployee;employees=employees.filter(e=>e.id!==id);localStorage.removeItem('timestamp.employee.days.'+id);localStorage.removeItem('timestamp.employee.rate.'+id);switchEmployee(employees[0].id);});
prevDay.addEventListener('click',()=>changeDay(-1));nextDay.addEventListener('click',()=>changeDay(1));finishBtn.addEventListener('click',renderSummary);backToDay.addEventListener('click',renderDay);clearDay.addEventListener('click',()=>{days[dateKey(currentDate)]=emptyDay();saveDays();renderDay();});hourlyRate.addEventListener('input',()=>{localStorage.setItem(employeeRateKey(),hourlyRate.value);const totalHours=Number(grandDecimal.textContent)||0;weeklyPay.textContent=`$${(totalHours*(Number(hourlyRate.value)||0)).toFixed(2)}`;});
renderDay();
