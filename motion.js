/* motion.js: GSAP + ScrollTrigger choreography for the set pieces.
   Self-hosted from assets/. Skips entirely for reduced motion or if GSAP
   failed to load; the page reads fine without it. Lessons carried over
   from She Trades: never let a once:true trigger own a gsap.from, and keep
   html scroll-behavior on auto while anything is pinned. */
(function () {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  const $ = (s, r) => (r || document).querySelector(s);

  /* progress line along the top edge */
  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  /* hero: the console drifts slower than the page, the copy settles back */
  gsap.to('.hero-inner', { y: -60, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-bg', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.fromTo('#console', { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: '.demo', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* statement: words light up under the scrub, pinned on desktop */
  const st = $('#statementText');
  if (st) {
    const text = st.textContent.trim();
    const accentFrom = text.indexOf('We look once');
    st.textContent = '';
    let pos = 0;
    text.split(' ').forEach((w) => {
      const s = document.createElement('span');
      s.className = 'w' + (accentFrom >= 0 && pos >= accentFrom ? ' hot' : '');
      s.textContent = w; st.appendChild(s); st.appendChild(document.createTextNode(' '));
      pos += w.length + 1;
    });
    const words = Array.from(st.querySelectorAll('.w'));
    const light = (p) => { const n = Math.round(p * words.length * 1.12); words.forEach((w, i) => w.classList.toggle('lit', i < n)); };
    mm.add('(min-width: 901px)', () => {
      ScrollTrigger.create({ trigger: '.statement-pin', start: 'top top', end: '+=130%', pin: true, scrub: true, onUpdate: (s) => light(s.progress) });
    });
    mm.add('(max-width: 900px)', () => {
      ScrollTrigger.create({ trigger: st, start: 'top 85%', end: 'bottom 40%', scrub: true, onUpdate: (s) => light(s.progress) });
    });
  }

  /* leaks: the orange line draws down the list as you read */
  if ($('.leak-line')) {
    gsap.to('.leak-line', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#leaks', start: 'top 75%', end: 'bottom 55%', scrub: true } });
  }

  /* ads: the daily-loop line draws as you read it */
  if ($('.loop-line')) {
    gsap.to('.loop-line', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#loopList', start: 'top 80%', end: 'bottom 60%', scrub: true } });
  }

  /* journey: pinned horizontal track with a meter, desktop only */
  const track = $('#jTrack');
  if (track) {
    const stops = gsap.utils.toArray('.stage');
    mm.add('(min-width: 901px)', () => {
      const idx = $('#jIndex'), bar = $('#jBar');
      const distance = () => track.scrollWidth - window.innerWidth + 24;
      const tween = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: '.journey-pin', start: 'top top', end: () => '+=' + (distance() + 300),
          pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => {
            const n = Math.min(5, Math.max(1, Math.ceil(s.progress * 5.3)));
            idx.textContent = String(n).padStart(2, '0');
            bar.style.transform = 'scaleX(' + s.progress + ')';
            stops.forEach((el, i) => el.classList.toggle('on', i === n - 1));
          },
        },
      });
      stops.forEach((el) => {
        const n = el.querySelector('.stage-n'); if (!n) return;
        gsap.fromTo(n, { x: 50 }, { x: -20, ease: 'none', scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
    });
    mm.add('(max-width: 900px)', () => {
      stops.forEach((el) => {
        gsap.fromTo(el, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } });
      });
    });
  }

  /* flagships: each card settles back and dims as the next one slides over it */
  mm.add('(min-width: 901px)', () => {
    const cards = gsap.utils.toArray('.stack-card');
    cards.forEach((card, i) => {
      const next = cards[i + 1]; if (!next) return;
      gsap.to(card, { scale: 0.94, opacity: 0.5, ease: 'none', scrollTrigger: { trigger: next, start: 'top 85%', end: 'top 100px', scrub: true } });
    });
  });

  /* founder: portrait parallax inside its bezel */
  if ($('#portrait')) {
    gsap.fromTo('#portrait', { y: -36, scale: 1.1 }, { y: 36, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.portrait', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* section headings: a heavier lift than the generic reveal */
  gsap.utils.toArray('section h2:not(.statement-h):not(.journey h2)').forEach((h) => {
    gsap.fromTo(h, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' } });
    h.classList.remove('reveal');
  });

  /* magnetic buttons, pointer devices only */
  if (matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.btn').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.45, ease: 'power3' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.45, ease: 'power3' });
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.2);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.2);
      });
      b.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
  }

  /* keep measurements honest once fonts and images are in */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
