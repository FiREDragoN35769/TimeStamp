const clockIn = document.getElementById('clockIn');
const clockOut = document.getElementById('clockOut');
const breakMinutes = document.getElementById('breakMinutes');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const totalTime = document.getElementById('totalTime');
const decimalHours = document.getElementById('decimalHours');
const error = document.getElementById('error');

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function calculate() {
  error.textContent = '';

  if (!clockIn.value || !clockOut.value) {
    error.textContent = 'Enter both clock-in and clock-out times.';
    return;
  }

  let start = toMinutes(clockIn.value);
  let end = toMinutes(clockOut.value);
  const breakMins = Math.max(0, Number.parseInt(breakMinutes.value || '0', 10));

  // Treat a clock-out earlier than clock-in as an overnight shift.
  if (end < start) end += 24 * 60;

  const worked = end - start - breakMins;
  if (worked < 0) {
    error.textContent = 'Break time cannot be longer than the shift.';
    return;
  }

  const hours = Math.floor(worked / 60);
  const minutes = worked % 60;
  totalTime.textContent = `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  decimalHours.textContent = `${(worked / 60).toFixed(2)} hours`;
}

function clearForm() {
  clockIn.value = '';
  clockOut.value = '';
  breakMinutes.value = '0';
  totalTime.textContent = '0 hours 0 minutes';
  decimalHours.textContent = '0.00 hours';
  error.textContent = '';
}

calculateBtn.addEventListener('click', calculate);
clearBtn.addEventListener('click', clearForm);
