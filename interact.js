/* interact.js: the missed-call calculator, the leak finder, and a light
   pointer tilt on the system tiles. No dependencies. Every number the
   calculator shows comes from the visitor's own inputs. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

  /* ---------- calculator ---------- */
  const calc = $('#calc');
  if (calc) {
    const inputs = { calls: $('#rCalls'), missed: $('#rMissed'), job: $('#rJob'), book: $('#rBook') };
    const outs = { calls: $('#oCalls'), missed: $('#oMissed'), job: $('#oJob'), book: $('#oBook') };
    const big = $('#calcBig'), lineA = $('#calcA'), lineB = $('#calcB');
    let shown = 0, raf = 0;
    function paint(r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); }
    function animateTo(target) {
      if (REDUCED) { shown = target; big.textContent = money(target); return; }
      cancelAnimationFrame(raf);
      const from = shown, start = performance.now();
      (function tick(now) {
        const p = Math.min((now - start) / 500, 1), e = 1 - Math.pow(1 - p, 3);
        shown = from + (target - from) * e; big.textContent = money(shown);
        if (p < 1) raf = requestAnimationFrame(tick);
      })(start);
    }
    function update() {
      const calls = +inputs.calls.value, missedPct = +inputs.missed.value, job = +inputs.job.value, bookPct = +inputs.book.value;
      outs.calls.textContent = calls + ' / wk'; outs.missed.textContent = missedPct + '%'; outs.job.textContent = money(job); outs.book.textContent = bookPct + '%';
      Object.values(inputs).forEach(paint);
      const missedWk = calls * missedPct / 100, lostWk = missedWk * bookPct / 100;
      lineA.innerHTML = '<b>' + missedWk.toFixed(1).replace(/\.0$/, '') + '</b> calls a week go unanswered';
      lineB.innerHTML = '<b>' + Math.round(lostWk * 52) + '</b> jobs a year walk to the next name on the list';
      animateTo(lostWk * 52 * job);
    }
    Object.values(inputs).forEach((r) => r.addEventListener('input', update));
    update();
  }

  /* ---------- leak finder ---------- */
  const leaks = $$('.leak'), finder = $('#finder');
  if (leaks.length && finder) {
    const MAP = [
      { stage: 2, name: 'Get answered', why: 'A missed call is the most expensive leak on the list, and the fastest to close. The phone gets fixed first.', jump: '#journey' },
      { stage: 1, name: 'Get found', why: 'If the site says "Not Secure" or loads slow, every other system is pouring water into a cracked bucket.', jump: '#journey' },
      { stage: 4, name: 'Grow and get paid', why: 'Ad money leaving without anyone watching it is a leak you can stop this week.', jump: '#journey' },
      { stage: 5, name: 'Know and own it', why: 'Files nobody can search and a business that lives in a spreadsheet get the same fix: one screen, in your name.', jump: '#journey' },
    ];
    const PRIORITY = { 0: 0, 1: 1, 2: 3, 3: 2, 4: 3 };   // leak index -> MAP index
    leaks.forEach((l, i) => {
      l.setAttribute('role', 'checkbox'); l.setAttribute('aria-checked', 'false'); l.tabIndex = 0;
      const tick = document.createElement('span'); tick.className = 'tick'; tick.setAttribute('aria-hidden', 'true'); l.appendChild(tick);
      const toggle = () => { l.classList.toggle('picked'); l.setAttribute('aria-checked', String(l.classList.contains('picked'))); show(); };
      l.addEventListener('click', toggle);
      l.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
    });
    function show() {
      const picked = leaks.map((l, i) => l.classList.contains('picked') ? i : -1).filter((i) => i >= 0);
      if (!picked.length) { finder.hidden = true; return; }
      const best = picked.map((i) => PRIORITY[i]).sort((a, b) => a - b)[0], m = MAP[best];
      $('#finderStage').textContent = 'Start at stage 0' + m.stage + ' · ' + m.name;
      $('#finderWhy').textContent = m.why + (picked.length > 1 ? ' The other ' + (picked.length - 1) + ' come right after, in order.' : '');
      finder.hidden = false;
    }
  }

  /* ---------- ad dollar tracer ---------- */
  const funnel = $('#funnel');
  if (funnel) {
    const NOTES = {
      1: ['Dies here', 'The click paid for a page that took too long or said "Not Secure". They hit back and call the next ad.'],
      2: ['Dies here', 'The page worked. The phone rang four times at 6:40 PM and went to voicemail. They hired whoever answered.'],
      3: ['Dies here', 'Somebody answered, then "we\'ll call you back". By the time you did, the job was booked elsewhere.'],
      4: ['Leaks here', 'The job got done. The invoice went out three weeks later and got paid after the second reminder, if at all.'],
    };
    const nodes = $$('.node', funnel), out = $('#tracerOut'), togs = $$('.tog');
    function paint() {
      const off = togs.filter((b) => b.getAttribute('aria-pressed') === 'false').map((b) => +b.dataset.node);
      const first = off.length ? Math.min.apply(null, off) : 0;
      nodes.forEach((n) => { const k = +n.dataset.n; const em = n.querySelector('em'); const broken = first > 0 && k === first; n.classList.toggle('broken', broken); em.textContent = broken ? NOTES[k][0] : (first && k > first ? 'never reached' : ''); });
      out.classList.toggle('bad', !!first);
      out.textContent = first ? NOTES[first][1] + ' The ad did its job. The business did not, and the ad gets the blame.' : 'Every link holds. The dollar you spent on the click comes back as a paid job, and the ad that produced it gets more budget tomorrow morning.';
    }
    togs.forEach((b) => b.addEventListener('click', () => { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); paint(); }));
    paint();
  }

  /* ---------- tilt on system tiles, pointer devices only ---------- */
  if (!REDUCED && matchMedia('(pointer: fine)').matches) {
    $$('.sys').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(600px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 8) + 'deg) translateY(-1px)';
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }
})();
