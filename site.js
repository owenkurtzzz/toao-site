/* TOAO site.js: hero console demo, scroll reveal, counters, menu, form.
   No dependencies. Everything honours prefers-reduced-motion. */
(function () {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- counters ---------- */
  function countTo(el, to, ms, suffix) {
    suffix = suffix || '';
    if (REDUCED || ms === 0) { el.textContent = to.toLocaleString() + suffix; return; }
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------- hero video: lighter file on phones, poster only when data is constrained ---------- */
  const vid = $('#heroVideo');
  if (vid && !REDUCED) {
    const conn = navigator.connection || {};
    const lowData = matchMedia('(prefers-reduced-data: reduce)').matches || conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
    if (!lowData) {
      vid.src = matchMedia('(max-width: 760px)').matches ? vid.dataset.srcMobile : vid.dataset.src;
      vid.preload = 'auto'; const p = vid.play(); if (p && p.catch) p.catch(() => {});
    }
  }

  /* ---------- scroll reveal (once) ---------- */
  const reveals = $$('.reveal');
  if (REDUCED || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
    $$('.proof .num [data-count], .proof .num[data-count]').forEach((el) => countTo(el, +el.dataset.count, 0));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        $$('[data-count]', e.target).forEach((n) => countTo(n, +n.dataset.count, 1100));
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach((el) => io.observe(el));
    // stagger siblings inside grids and lists
    ['.bento', '.plans', '.proof-grid', '.leaks', '.steps', '.acc'].forEach((sel) => {
      const box = $(sel); if (!box) return;
      $$('.reveal', box).forEach((el, i) => { el.style.transitionDelay = Math.min(i * 60, 300) + 'ms'; });
    });
  }

  /* ---------- mobile menu ---------- */
  const burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('open')); }
    else { menu.classList.remove('open'); setTimeout(() => { menu.hidden = true; }, REDUCED ? 0 : 450); }
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ---------- anchor links (html scroll-behavior is auto so pinning works) ---------- */
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const href = a.getAttribute('href'); if (href.length < 2) return;
    const t = document.querySelector(href); if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', a.getAttribute('href'));
  }));

  /* ---------- live page stats (measured in the visitor's browser) ---------- */
  function measure() {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    if (!nav) return null;
    let bytes = nav.transferSize || nav.encodedBodySize || 0; const hosts = new Set();
    res.forEach((r) => { bytes += r.transferSize || r.encodedBodySize || 0; try { const h = new URL(r.name).host; if (h !== location.host) hosts.add(h); } catch (_) {} });
    return { kb: Math.round(bytes / 1024), req: res.length + 1, ms: Math.round(nav.domInteractive), hosts: hosts.size };
  }
  const live = $('#live');
  if (live && 'IntersectionObserver' in window) {
    const lio = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return; lio.disconnect();
      const m = measure(); if (!m) { live.hidden = true; return; }
      countTo($('#stKb'), m.kb, 900); countTo($('#stReq'), m.req, 900); countTo($('#stMs'), m.ms, 900); countTo($('#stHosts'), m.hosts, 600);
    }, { threshold: 0.3 });
    lio.observe(live);
  }

  /* ---------- FAQ: one open at a time ---------- */
  const acc = $$('.acc details');
  acc.forEach((d) => d.addEventListener('toggle', () => { if (d.open) acc.forEach((o) => { if (o !== d) o.open = false; }); }));

  /* ---------- hero console ---------- */
  if ($('#console')) {
  const tabs = $$('.con-tabs [role=tab]');
  const panes = $$('.pane');
  let current = 'voice', auto = true, run = 0;

  const VOICE = [
    ['sys', 'Call answered in 1 ring'],
    ['agent', "Thanks for calling Coastal Pool Care, this is Mia on the after-hours line. I can get you booked right now. What's going on with the pool?"],
    ['caller', "Pump's making a grinding noise and the water's going green."],
    ['agent', "Got it, that sounds like the pump motor. I have Thursday at 9 AM or Friday at 1 PM for a repair visit. Which works?"],
    ['caller', 'Thursday.'],
    ['agent', "Booked for Thursday at 9. You'll get a text confirmation in a second, and I've flagged it as a pump repair so the tech brings the right parts."],
  ];

  function typeInto(el, text, cps) {
    return new Promise((res) => {
      if (REDUCED) { el.textContent = text; return res(); }
      let i = 0; el.textContent = '';
      const caret = document.createElement('span'); caret.className = 'caret'; el.after(caret);
      (function step() {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 1000 / cps); else { caret.remove(); res(); }
      })();
    });
  }

  async function playVoice(id) {
    const list = $('#transcript'), foot = $('#callFoot'), state = $('#callState');
    list.innerHTML = ''; foot.hidden = true; step(0); if (wave) wave.classList.remove('on');
    state.textContent = 'ringing'; state.className = 'chip chip-live';
    const label = (li, who) => { if (who === 'agent') li.dataset.who = 'Mia · agent'; if (who === 'caller') li.dataset.who = 'Caller'; };
    if (REDUCED) {
      VOICE.forEach(([who, t]) => { const li = document.createElement('li'); li.className = who; label(li, who); li.textContent = t; list.appendChild(li); });
      state.textContent = 'booked'; state.className = 'chip chip-ok'; foot.hidden = false; step(5); return;
    }
    await wait(700); if (run !== id) return;
    state.textContent = 'on call'; if (wave) wave.classList.add('on');
    let k = 0;
    for (const [who, text] of VOICE) {
      if (run !== id) return;
      k++; if (k === 1) step(1); if (k === 3) step(2); if (k === 4) step(3);
      const li = document.createElement('li'); li.className = who; label(li, who);
      if (who === 'agent') {
        li.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
        list.appendChild(li); await wait(650); if (run !== id) return;
        li.textContent = text;
      } else { li.textContent = text; list.appendChild(li); }
      list.scrollTop = list.scrollHeight;
      await wait(who === 'sys' ? 500 : 1300 + Math.min(text.length * 9, 900));
    }
    if (run !== id) return;
    state.textContent = 'booked'; state.className = 'chip chip-ok'; foot.hidden = false; step(5); if (wave) wave.classList.remove('on');
    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 60);
  }

  async function playSite(id) {
    const nums = $$('#scores b');
    nums.forEach((n) => { n.textContent = '0'; }); step(1);
    await wait(REDUCED ? 0 : 500); if (run !== id) return; step(2);
    nums.forEach((n, i) => setTimeout(() => { if (run === id) { countTo(n, +n.dataset.count, 900, n.dataset.suffix || ''); if (i === 2) step(3); if (i === 3) step(4); } }, REDUCED ? 0 : i * 140));
    await wait(REDUCED ? 0 : 1600); if (run === id) step(5);
  }

  async function playAI(id) {
    const q = $('#aiQ'), a = $('#aiA');
    a.hidden = true; q.textContent = ''; step(1);
    await wait(REDUCED ? 0 : 400); if (run !== id) return;
    await typeInto(q, 'Which engagement letters expire before December?', 38); if (run !== id) return; step(2);
    await wait(REDUCED ? 0 : 900); if (run !== id) return;
    a.hidden = false; step(3);
    await wait(REDUCED ? 0 : 1200); if (run === id) step(5);
  }

  /* the step list on the left follows the demo */
  const STEPS = {
    voice: [['Picked up in one ring', 'No voicemail, no "leave a message".'], ['Understood the job', 'Grinding pump, green water: a repair, not a cleaning.'], ['Offered real openings', 'Two slots from the actual calendar. No double-booking.'], ['Booked, texted, notified', 'Customer gets a confirmation. You get the summary.']],
    site: [['Fetched the page', 'One request, no third-party scripts.'], ['Measured, not promised', 'Accessibility and best practices at 100.'], ['Light enough for cellular', 'Under 45 kB. Loads before they give up.'], ['Built from real content', 'Their services, hours and licence. Nothing invented.']],
    ai: [['Question asked in plain words', 'No query language, no training.'], ['Files searched on your hardware', 'The documents never leave the building.'], ['Answer with citations', 'Every claim points at the file and the page.'], ['Nothing sent to a public model', 'You can watch the network traffic to prove it.']],
  };
  const stepsEl = $('#demoSteps');
  function stepsFor(name) { if (!stepsEl) return; stepsEl.innerHTML = STEPS[name].map((s, i) => '<li><i>' + (i + 1) + '</i><div><b>' + s[0] + '</b><span>' + s[1] + '</span></div></li>').join(''); }
  function step(n) { if (!stepsEl) return; $$('li', stepsEl).forEach((li, i) => { li.classList.toggle('on', i === n - 1); li.classList.toggle('done', i < n - 1 || n > 4 && i === 3); }); }
  const wave = $('#wave');

  const PLAYERS = { voice: playVoice, site: playSite, ai: playAI };
  const ORDER = ['voice', 'site', 'ai'];

  function show(name) {
    current = name; stepsFor(name);
    tabs.forEach((t) => { const on = t.dataset.tab === name; t.classList.toggle('on', on); t.setAttribute('aria-selected', String(on)); });
    panes.forEach((p) => {
      const on = p.dataset.pane === name;
      if (on) { p.hidden = false; requestAnimationFrame(() => p.classList.add('on')); }
      else { p.classList.remove('on'); setTimeout(() => { if (current !== p.dataset.pane) p.hidden = true; }, REDUCED ? 0 : 500); }
    });
    const id = ++run;
    PLAYERS[name](id).then(() => {
      if (!auto || REDUCED || run !== id) return;
      setTimeout(() => { if (auto && run === id && document.visibilityState === 'visible') show(ORDER[(ORDER.indexOf(name) + 1) % ORDER.length]); }, 3200);
    });
  }
  tabs.forEach((t) => t.addEventListener('click', () => { auto = false; if (t.dataset.tab !== current) show(t.dataset.tab); }));

  // start the demo when the console is actually on screen
  const con = $('#console');
  if (REDUCED || !('IntersectionObserver' in window)) { show('voice'); }
  else {
    const cio = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { cio.disconnect(); show('voice'); } }, { threshold: 0.15 });
    cio.observe(con);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && auto && !REDUCED) show(current); });
  }
})();
