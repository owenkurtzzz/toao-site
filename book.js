/* book.js: the booking calendar for the free audit call.
   Three steps on one card: date, time, details. Windows (Eastern):
   Every day 2:30-5:30 PM (Thu 2:30-4:00 and 4:15-5:30), plus Mon 6:15-7:15 PM,
   15-minute slots. With BOOKING_ENDPOINT set (booking/Code.gs deployed as
   a Google Apps Script web app) it reads real busy times and creates the
   event with the visitor as a guest. Without it, it emails the exact slot. */
(function () {
  'use strict';
  const BOOKING_ENDPOINT = '';   /* paste the Apps Script web app URL (ends in /exec) here */
  const TZ = 'America/New_York', DUR = 15, LEAD_MIN = 120, HORIZON_DAYS = 45;
  const WINDOWS = { 0: [[14, 30, 17, 30]], 1: [[14, 30, 17, 30], [18, 15, 19, 15]], 2: [[14, 30, 17, 30]], 3: [[14, 30, 17, 30]], 4: [[14, 30, 16, 0], [16, 15, 17, 30]], 5: [[14, 30, 17, 30]], 6: [[14, 30, 17, 30]] };
  const ZONES = [['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'], ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific']];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const book = $('#book'); if (!book) return;
  const grid = $('#calGrid'), title = $('#calTitle'), prev = $('#calPrev'), next = $('#calNext');
  const slotsEl = $('#slots'), slotsTitle = $('#slotsTitle'), slotsNote = $('#slotsNote'), nextBtn = $('#nextAvail'), tzSel = $('#tzSel');
  const form = $('#form'), note = $('#formNote'), main = $('#bookMain'), summary = $('#summary');
  const steps = $$('.book-steps span');
  let tz = Intl.DateTimeFormat().resolvedOptions().timeZone || TZ;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + HORIZON_DAYS);
  let view = new Date(today.getFullYear(), today.getMonth(), 1), selectedDay = null, selectedSlot = null, busy = [], loading = !!BOOKING_ENDPOINT;

  /* ---- time helpers (ET wall time -> Date, DST-safe) ---- */
  function etOffsetMin(d) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName').value;
    const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(p); if (!m) return -240;
    return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
  }
  const etDate = (y, mo, d, hh, mm) => { const g = new Date(Date.UTC(y, mo, d, hh, mm)); return new Date(g.getTime() - etOffsetMin(g) * 60000); };
  const fmtTime = (d, z) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: z }).format(d);
  const fmtDay = (d) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d);
  const tzShort = (d, z) => new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'short' }).formatToParts(d).find((x) => x.type === 'timeZoneName').value;
  const hourIn = (d, z) => parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: z }).format(d), 10) % 24;

  function slotsFor(day) {
    const wins = WINDOWS[day.getDay()] || [], out = [], minStart = Date.now() + LEAD_MIN * 60000;
    wins.forEach(([sh, sm, eh, em]) => {
      let t = etDate(day.getFullYear(), day.getMonth(), day.getDate(), sh, sm);
      const end = etDate(day.getFullYear(), day.getMonth(), day.getDate(), eh, em);
      while (t.getTime() + DUR * 60000 <= end.getTime()) {
        const s = t, e = new Date(t.getTime() + DUR * 60000);
        if (s.getTime() >= minStart && !busy.some((b) => s < b.e && e > b.s)) out.push({ s, e });
        t = e;
      }
    });
    return out;
  }
  const isOpen = (d) => d >= today && d <= lastDay && slotsFor(d).length > 0;

  function setStep(n) { steps.forEach((s, i) => { s.classList.toggle('on', i === n - 1); s.classList.toggle('done', i < n - 1); }); }

  function render() {
    title.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(view);
    grid.innerHTML = '';
    const pad = (new Date(view).getDay() + 6) % 7;
    for (let i = 0; i < pad; i++) { const b = document.createElement('span'); b.className = 'cal-day pad'; grid.appendChild(b); }
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-day'; b.setAttribute('aria-label', fmtDay(date));
      b.innerHTML = '<span>' + d + '</span>';
      if (date.getTime() === today.getTime()) b.classList.add('today');
      if (!loading && isOpen(date)) { b.classList.add('open'); b.addEventListener('click', () => pickDay(date)); } else b.disabled = true;
      if (selectedDay && date.getTime() === selectedDay.getTime()) b.setAttribute('aria-selected', 'true');
      grid.appendChild(b);
    }
    prev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    next.disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > lastDay;
    grid.classList.toggle('loading', loading);
  }
  function renderSlots() {
    slotsEl.innerHTML = '';
    if (!selectedDay) { slotsTitle.textContent = 'Pick a day'; slotsNote.textContent = 'Seven days a week. 15 minutes, Owen calls you.'; return; }
    const list = slotsFor(selectedDay);
    slotsTitle.textContent = fmtDay(selectedDay);
    if (!list.length) { slotsNote.textContent = 'Nothing left that day. Try the next one.'; return; }
    slotsNote.textContent = tz === TZ ? 'All times Eastern.' : 'Shown in ' + tz.replace(/_/g, ' ') + '. Eastern in small print.';
    const groups = [['Morning', (h) => h < 12], ['Afternoon', (h) => h >= 12 && h < 17], ['Evening', (h) => h >= 17]];
    groups.forEach(([label, test]) => {
      const items = list.filter((sl) => test(hourIn(sl.s, tz))); if (!items.length) return;
      const g = document.createElement('div'); g.className = 'slot-group';
      g.innerHTML = '<p class="mono slot-label">' + label + '</p>';
      items.forEach((sl) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'slot'; b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(!!selectedSlot && selectedSlot.s.getTime() === sl.s.getTime()));
        b.innerHTML = '<b>' + fmtTime(sl.s, tz) + '</b>' + (tz === TZ ? '' : '<small>' + fmtTime(sl.s, TZ) + ' ET</small>');
        b.addEventListener('click', () => pickSlot(sl)); g.appendChild(b);
      });
      slotsEl.appendChild(g);
    });
  }
  function pickDay(date) { selectedDay = date; selectedSlot = null; setStep(2); render(); renderSlots(); }
  function pickSlot(sl) {
    selectedSlot = sl; renderSlots(); setStep(3);
    main.hidden = true; form.hidden = false; summary.hidden = false;
    $('#sumWhen').textContent = fmtDay(sl.s) + ', ' + fmtTime(sl.s, tz) + ' ' + tzShort(sl.s, tz);
    $('#sumEt').textContent = tz === TZ ? '' : fmtTime(sl.s, TZ) + ' Eastern';
    $('input[name=name]', form).focus({ preventScroll: true });
    book.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function back() { main.hidden = false; form.hidden = true; summary.hidden = true; setStep(selectedDay ? 2 : 1); renderSlots(); }
  $('#sumChange').addEventListener('click', (e) => { e.preventDefault(); back(); });

  nextBtn.addEventListener('click', () => {
    for (let i = 0, d = new Date(today); i <= HORIZON_DAYS; i++, d.setDate(d.getDate() + 1)) {
      if (isOpen(d)) { view = new Date(d.getFullYear(), d.getMonth(), 1); pickDay(new Date(d)); return; }
    }
  });
  prev.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
  next.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });

  /* time zone picker */
  const zones = ZONES.slice(); if (!zones.some((z) => z[0] === tz)) zones.unshift([tz, tz.replace(/_/g, ' ') + ' (yours)']);
  zones.forEach(([id, label]) => { const o = document.createElement('option'); o.value = id; o.textContent = label; if (id === tz) o.selected = true; tzSel.appendChild(o); });
  tzSel.addEventListener('change', () => { tz = tzSel.value; renderSlots(); });

  /* real availability, when the endpoint exists */
  function loadBusy() {
    if (!BOOKING_ENDPOINT) return Promise.resolve();
    const url = BOOKING_ENDPOINT + '?action=busy&from=' + today.toISOString() + '&to=' + lastDay.toISOString();
    return fetch(url).then((r) => r.json()).then((j) => { busy = (j.busy || []).map((b) => ({ s: new Date(b[0]), e: new Date(b[1]) })); }).catch(() => {}).then(() => { loading = false; });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach((i) => { const bad = !i.value.trim() || (i.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value)); i.setAttribute('aria-invalid', String(bad)); if (bad && ok) { i.focus(); ok = false; } });
    if (!ok) { note.textContent = 'Name, business and a real email, then confirm.'; return; }
    if (!selectedSlot) { back(); return; }
    const f = new FormData(form), name = f.get('name'), business = f.get('business');
    const payload = { start: selectedSlot.s.toISOString(), end: selectedSlot.e.toISOString(), name, business, email: f.get('email'), phone: f.get('phone') || '', focus: f.get('focus') || '', tz, page: location.href };
    const done = (mode) => { const q = new URLSearchParams({ name, start: selectedSlot.s.toISOString(), mode }); setTimeout(() => location.assign('booked.html?' + q.toString()), mode === 'request' ? 700 : 0); };
    if (!BOOKING_ENDPOINT) {
      const body = ['Requested: ' + fmtDay(selectedSlot.s) + ', ' + fmtTime(selectedSlot.s, TZ) + ' ET (' + selectedSlot.s.toISOString() + ')', 'Name: ' + name, 'Business: ' + business, 'Email: ' + f.get('email'), 'Phone: ' + (f.get('phone') || ''), 'Look at first: ' + (f.get('focus') || '')].join('\n');
      location.href = 'mailto:owen@toao.app?subject=' + encodeURIComponent('Free audit call: ' + business) + '&body=' + encodeURIComponent(body);
      done('request'); return;
    }
    const btn = $('#confirmBtn'); btn.setAttribute('aria-busy', 'true'); note.textContent = 'Booking…';
    fetch(BOOKING_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((j) => {
        btn.removeAttribute('aria-busy');
        if (!j.ok) { note.textContent = j.error === 'taken' ? 'That slot just went. Pick another.' : 'Something failed on our side. Email owen@toao.app and we will book it by hand.'; if (j.error === 'taken') loadBusy().then(() => { selectedSlot = null; back(); }); return; }
        done('booked');
      })
      .catch(() => { btn.removeAttribute('aria-busy'); note.textContent = 'Could not reach the calendar. Email owen@toao.app and we will book it by hand.'; });
  });

  const qf = new URLSearchParams(location.search).get('focus') || (location.hash.includes('?focus=') ? decodeURIComponent(location.hash.split('?focus=')[1]) : '');
  if (qf && form.focus) form.focus.value = qf;
  setStep(1); render(); renderSlots();
  loadBusy().then(() => { render(); if (selectedDay) renderSlots(); });
})();
