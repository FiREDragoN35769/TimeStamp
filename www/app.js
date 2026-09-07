const ROW_COUNT = 10;
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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
  }).format(date);
}

function emptyDay() {
  return Array.from({ length: ROW_COUNT }, () => ({ in: '', out: '' }));
}

function loadDays() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveDays() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
}

function getRowsForCurrentDay() {
  const key = dateKey(currentDate);
  if (!Array.isArray(days[key])) days[key] = emptyDay();
  while (days[key].length < ROW_COUNT) days[key].push({ in: '', out: '' });
  return days[key].slice(0, ROW_COUNT);
}

function parseTime(value) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!text) return null;

  let match = text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);
  if (!match) return NaN;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];

  if (minute > 59) return NaN;

  if (meridiem) {
    if (hour < 1 || hour > 12) return NaN;
    if (hour === 12) hour = 0;
    if (meridiem === 'pm') hour += 12;
  } else {
    if (hour > 23) return NaN;
  }

  return hour * 60 + minute;
}

function workedMinutes(entry) {
  if (!entry.in || !entry.out) return 0;
  const start = parseTime(entry.in);
  let end = parseTime(entry.out);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return NaN;
  if (end < start) end += 1440;
  return end - start;
}

function hm(minutes) {
  const safe = Math.max(0, Math.round(minutes || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function decimal(minutes) {
  return ((minutes || 0) / 60).toFixed(2);
}

function renderDay() {
  summaryView.classList.add('hidden');
  document.querySelector('.timesheet-card').classList.remove('hidden');
  dayTitle.textContent = formatDate(currentDate);
  rowsEl.innerHTML = '';
  error.textContent = '';

  const rows = getRowsForCurrentDay();

  rows.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'row-grid data-row';

    const num = document.createElement('div');
    num.className = 'row-num';
    num.textContent = index + 1;

    const inInput = makeTimeInput(entry.in, 'In time', index, 'in');
    const outInput = makeTimeInput(entry.out, 'Out time', index, 'out');

    const hours = document.createElement('div');
    hours.className = 'row-hours';
    const mins = workedMinutes(entry);
    hours.textContent = Number.isFinite(mins) ? hm(mins) : '—';
    if (!Number.isFinite(mins)) hours.classList.add('bad');

    row.append(num, inInput, outInput, hours);
    rowsEl.appendChild(row);
  });

  updateTotals();
}

function makeTimeInput(value, label, index, field) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.placeholder = 'e.g. 1031';
  input.setAttribute('aria-label', `${label} row ${index + 1}`);
  input.value = value || '';

  input.addEventListener('input', () => {
    const key = dateKey(currentDate);
    const rows = getRowsForCurrentDay();
    rows[index][field] = input.value;
    days[key] = rows;
    saveDays();
    renderTotalsOnly();
  });

  input.addEventListener('blur', () => {
    const normalized = normalizeDisplayTime(input.value);
    if (normalized) {
      input.value = normalized;
      const key = dateKey(currentDate);
      const rows = getRowsForCurrentDay();
      rows[index][field] = normalized;
      days[key] = rows;
      saveDays();
    }
    renderDay();
  });

  return input;
}

function normalizeDisplayTime(value) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!text) return '';

  const match = text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);
  if (!match) return '';

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if (minute > 59) return '';

  if (meridiem) {
    if (hour < 1 || hour > 12) return '';
    return `${hour}:${String(minute).padStart(2, '0')} ${meridiem.toUpperCase()}`;
  }

  if (hour > 23) return '';
  if (hour === 0) return `12:${String(minute).padStart(2, '0')} AM`;
  if (hour < 12) return `${hour}:${String(minute).padStart(2, '0')} AM`;
  if (hour === 12) return `${hour}:${String(minute).padStart(2, '0')} PM`;
  return `${hour - 12}:${String(minute).padStart(2, '0')} PM`;
}

function dayTotal(rows) {
  let total = 0;
  let invalid = false;
  rows.forEach(entry => {
    const mins = workedMinutes(entry);
    if (Number.isNaN(mins)) invalid = true;
    else total += mins;
  });
  return { total, invalid };
}

function renderTotalsOnly() {
  const rows = getRowsForCurrentDay();
  const { total, invalid } = dayTotal(rows);
  totalHM.textContent = hm(total);
  totalDecimal.textContent = decimal(total);
  error.textContent = invalid ? 'One or more times are not valid yet.' : '';

  [...rowsEl.querySelectorAll('.data-row')].forEach((row, index) => {
    const mins = workedMinutes(rows[index]);
    const hours = row.querySelector('.row-hours');
    hours.textContent = Number.isFinite(mins) ? hm(mins) : '—';
    hours.classList.toggle('bad', !Number.isFinite(mins));
  });
}

function updateTotals() {
  renderTotalsOnly();
}

function changeDay(delta) {
  currentDate.setDate(currentDate.getDate() + delta);
  currentDate = startOfDay(currentDate);
  renderDay();
}

function renderSummary() {
  document.querySelector('.timesheet-card').classList.add('hidden');
  summaryView.classList.remove('hidden');
  summaryList.innerHTML = '';

  const entries = Object.entries(days)
    .map(([key, rows]) => ({ key, rows }))
    .filter(({ rows }) => Array.isArray(rows) && rows.some(r => r.in || r.out))
    .sort((a, b) => a.key.localeCompare(b.key));

  let grand = 0;

  if (!entries.length) {
    summaryList.innerHTML = '<p class="empty">No time entered yet.</p>';
  }

  entries.forEach(({ key, rows }) => {
    const date = new Date(`${key}T00:00:00`);
    const { total } = dayTotal(rows);
    grand += total;

    const block = document.createElement('article');
    block.className = 'summary-day';
    const used = rows.filter(r => r.in || r.out);
    block.innerHTML = `
      <div class="summary-day-head">
        <strong>${formatDate(date)}</strong>
        <span>${hm(total)} &nbsp; • &nbsp; ${decimal(total)}</span>
      </div>
      <div class="summary-table">
        ${used.map((r, i) => `<div><span>${i + 1}</span><span>${escapeHtml(r.in || '')}</span><span>${escapeHtml(r.out || '')}</span><strong>${Number.isFinite(workedMinutes(r)) ? hm(workedMinutes(r)) : '—'}</strong></div>`).join('')}
      </div>`;
    summaryList.appendChild(block);
  });

  grandHM.textContent = hm(grand);
  grandDecimal.textContent = decimal(grand);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

prevDay.addEventListener('click', () => changeDay(-1));
nextDay.addEventListener('click', () => changeDay(1));
finishBtn.addEventListener('click', renderSummary);
backToDay.addEventListener('click', renderDay);
clearDay.addEventListener('click', () => {
  days[dateKey(currentDate)] = emptyDay();
  saveDays();
  renderDay();
});

renderDay();
