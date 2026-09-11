/* audit.js: the free website auditor. Fetches the page once (through the
   Apps Script endpoint when deployed, otherwise a public relay), scores it
   in the visitor's browser on checks you can verify by hand, and builds a
   better homepage from what the site itself says. Nothing is stored. */
(function () {
  'use strict';
  const AUDIT_ENDPOINT = '';   /* same Apps Script /exec URL as book.js, once deployed */
  const RELAY = 'https://api.allorigins.win/get?url=';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const form = $('#auditForm'); if (!form) return;
  const input = $('#auditUrl'), status = $('#auditStatus'), results = $('#results'), btn = $('#auditBtn');
  const YEAR = new Date().getFullYear();
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

  async function fetchSite(url) {
    if (AUDIT_ENDPOINT) {
      const j = await (await fetch(AUDIT_ENDPOINT + '?action=audit&url=' + encodeURIComponent(url))).json();
      if (!j.ok) throw new Error(j.error || 'fetch');
      return j;
    }
    const j = await (await fetch(RELAY + encodeURIComponent(url))).json();
    if (!j.contents) throw new Error('fetch');
    const st = j.status || {};
    return { ok: true, url: st.url || url, status: st.http_code, ms: Math.round(st.response_time || 0), bytes: j.contents.length, html: j.contents, headers: {}, chain: [], relay: true };
  }

  function analyse(res, typed) {
    const doc = new DOMParser().parseFromString(res.html, 'text/html');
    const html = res.html, finalUrl = res.chain && res.chain.length ? res.chain[res.chain.length - 1].url : res.url;
    const https = /^https:/i.test(finalUrl) && !/^http:/i.test(typed) || (/^https:/i.test(finalUrl) && res.chain && res.chain.length > 0);
    const isHttps = /^https:/i.test(finalUrl);
    const txt = (el) => clean(el && el.textContent);
    const title = txt(doc.querySelector('title'));
    const desc = clean((doc.querySelector('meta[name="description"]') || {}).content);
    const viewport = !!doc.querySelector('meta[name="viewport"]');
    const h1s = $$('h1', doc).map(txt).filter(Boolean);
    const heads = $$('h2, h3', doc).map(txt).filter((t) => t.length > 2 && t.length < 44);
    const imgs = $$('img', doc), noAlt = imgs.filter((i) => !i.getAttribute('alt')).length;
    const scripts = $$('script[src]', doc).length;
    const jq = /jquery[-.]?(1\.\d+\.\d+)/i.exec(html);
    const years = (html.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi) || []).map((m) => +m.slice(-4)).filter((y) => y > 1995 && y <= YEAR + 1);
    const copyYear = years.length ? Math.max.apply(null, years) : null;
    const tel = doc.querySelector('a[href^="tel:"]'); const phone = tel ? clean(tel.textContent) || tel.getAttribute('href').slice(4) : ((html.match(/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/) || [])[0] || '');
    const mail = doc.querySelector('a[href^="mailto:"]'); const email = mail ? mail.getAttribute('href').slice(7).split('?')[0] : '';
    const hasForm = !!doc.querySelector('form');
    const bodyText = txt(doc.body).slice(0, 200000);
    const addr = (bodyText.match(/\b\d{2,5}\s+[A-Z][A-Za-z0-9.\s]{2,40}?,?\s+[A-Z][a-zA-Z\s]{2,30},?\s+(?:FL|Florida)\b[,\s]*\d{5}?/) || [])[0] || '';
    const city = addr ? clean(addr.split(',').slice(-2)[0]) : '';
    const licence = (bodyText.match(/\b(?:Lic(?:ense|ence)?\.?\s*(?:No\.?|#)?\s*[A-Z]{0,4}\s?\d{4,}|C[PGC]C\d{5,})/i) || [])[0] || '';
    const insured = /licensed\s+(?:and|&)\s+insured/i.test(bodyText);
    const legacy = /<(font|center|marquee|blink)\b/i.test(html);
    const tables = $$('table', doc).length;
    const responsive = /@media/i.test(html) || !!doc.querySelector('img[srcset], picture, link[media]');
    const mixed = isHttps ? (html.match(/\s(?:src|href)=["']http:\/\//gi) || []).length : 0;
    const kb = Math.round(res.bytes / 1024), ms = res.ms || 0;
    const og = !!doc.querySelector('meta[property="og:image"]');
    const favicon = !!doc.querySelector('link[rel~="icon"]');
    const navLinks = $$('nav a, header a', doc).map(txt).filter((t) => t.length > 2 && t.length < 30);
    const paras = $$('p', doc).map(txt).filter((t) => t.length > 60 && t.length < 260);

    const clamp = (n) => Math.max(4, Math.min(100, Math.round(n)));
    const s = {};
    s.security = clamp(isHttps ? (mixed ? 62 : 100) : 12);
    s.speed = clamp(100 - (kb > 100 ? 15 : 0) - (kb > 250 ? 20 : 0) - (kb > 500 ? 25 : 0) - (scripts > 5 ? 10 : 0) - (scripts > 12 ? 15 : 0) - (imgs.length > 30 ? 10 : 0) - (ms > 1500 ? 10 : 0) - (ms > 3000 ? 10 : 0));
    s.mobile = clamp((viewport ? 60 : 0) + (responsive ? 25 : 0) + (tables > 3 ? 0 : 15));
    s.trust = clamp((phone ? 35 : 0) + (hasForm || email ? 25 : 0) + (addr ? 15 : 0) + (licence ? 15 : 0) + (isHttps ? 10 : 0));
    s.fresh = clamp((copyYear === null ? 70 : YEAR - copyYear <= 1 ? 100 : YEAR - copyYear <= 3 ? 60 : 25) - (jq ? 30 : 0) - (legacy ? 20 : 0));
    s.search = clamp((title.length >= 10 && title.length <= 70 ? 25 : title ? 12 : 0) + (desc ? 25 : 0) + (h1s.length === 1 ? 20 : h1s.length ? 8 : 0) + (imgs.length === 0 || (imgs.length - noAlt) / imgs.length >= 0.8 ? 15 : 0) + (og ? 15 : 0));
    s.overall = Math.round(s.security * 0.25 + s.speed * 0.18 + s.mobile * 0.18 + s.trust * 0.17 + s.fresh * 0.12 + s.search * 0.1);

    const f = [];
    const add = (st, t, n) => f.push({ st, t, n });
    add(isHttps ? 'pass' : 'fail', isHttps ? 'Loads over HTTPS' : 'Chrome shows "Not Secure" next to your name', isHttps ? 'The padlock is there. That is the first thing a homeowner sees.' : 'No security certificate. Google ranks the page lower and the browser warns visitors before they see your work. It is a fix, not a rebuild.');
    if (mixed) add('warn', mixed + ' insecure file' + (mixed > 1 ? 's' : '') + ' on a secure page', 'Images or scripts still load over plain http, which can trigger a warning even with a certificate.');
    add(kb <= 150 ? 'pass' : kb <= 400 ? 'warn' : 'fail', 'Page is ' + kb + ' kB of HTML' + (scripts ? ' with ' + scripts + ' external scripts' : ''), kb <= 150 ? 'Light enough to load on a phone on cellular.' : 'Heavy pages lose people on cellular before they see the phone number. We ship under 45 kB.');
    add(viewport ? 'pass' : 'fail', viewport ? 'Built for phones' : 'Not built for phones', viewport ? 'The page tells phones how to scale itself.' : 'No viewport tag, so a phone shows the desktop layout and the visitor pinches and zooms to find your number.');
    add(phone ? 'pass' : 'fail', phone ? 'Phone number is tappable: ' + phone : 'No tappable phone number', phone ? 'One tap and they are calling you.' : 'A number that is not a link is a number typed by hand, or not at all.');
    add(hasForm || email ? 'pass' : 'fail', hasForm ? 'Has a contact form' : email ? 'Has an email link' : 'No way to write to you', 'Some people will not call. Give them a second door.');
    add(copyYear === null ? 'warn' : YEAR - copyYear <= 1 ? 'pass' : 'fail', copyYear === null ? 'No visible copyright year' : 'Footer says ' + copyYear, copyYear === null ? 'Not a problem on its own, but visitors use it to guess whether you are still in business.' : YEAR - copyYear <= 1 ? 'Reads as current.' : 'A ' + (YEAR - copyYear) + '-year-old footer reads as a business that might not answer.');
    if (jq) add('fail', 'Runs jQuery ' + jq[1], 'A library version from over a decade ago, usually a sign the whole site is that old.');
    if (legacy) add('fail', 'Uses HTML tags from the 2000s', 'Things like <font> and <center>. Modern browsers tolerate them; Google does not reward them.');
    add(h1s.length === 1 ? 'pass' : 'warn', h1s.length === 1 ? 'One clear headline' : h1s.length ? h1s.length + ' main headlines' : 'No main headline', 'Search engines read the main headline to understand what the page is.');
    add(desc ? 'pass' : 'warn', desc ? 'Has a search description' : 'No search description', desc ? 'This is the text Google shows under your name.' : 'Google will make up its own snippet from whatever it finds first.');
    add(licence ? 'pass' : 'warn', licence ? 'Licence number is on the page' : 'No licence number found', licence ? 'Verified trust signal, in your own words.' : 'If you are licensed, say so with the number. It is the cheapest trust you can add.');
    return { s, f, title, desc, h1s, heads, phone, email, addr, city, licence, insured, navLinks, paras, kb, ms, scripts, imgs: imgs.length, noAlt, finalUrl, copyYear, relay: !!res.relay };
  }

  function preview(a) {
    const host = a.finalUrl.replace(/^https?:\/\//, '').split('/')[0];
    const name = clean((a.title.split(/[|\-–:]/)[0] || host)).slice(0, 48) || host;
    const h1 = (a.h1s[0] && a.h1s[0].length < 70 ? a.h1s[0] : '') || (a.title.split(/[|\-–:]/)[1] ? clean(a.title.split(/[|\-–:]/).slice(1).join(' ')) : '') || name;
    const sub = a.desc || a.paras[0] || '';
    const bad = /contact|about|home|welcome|copyright|menu|login|blog|gallery|review|faq|privacy|terms|call|quote|free|our|why|the /i;
    const svc = []; [].concat(a.heads, a.navLinks).forEach((t) => { if (!bad.test(t) && !svc.some((x) => x.toLowerCase() === t.toLowerCase())) svc.push(t); });
    const services = svc.slice(0, 6);
    const trust = [a.licence && 'Licence ' + a.licence.replace(/^[^0-9A-Z]*/i, ''), a.insured && 'Licensed and insured', a.city && 'Serving ' + a.city].filter(Boolean);
    const cta = a.phone ? '<a class="cta" href="tel:' + esc(a.phone.replace(/[^\d+]/g, '')) + '">Call ' + esc(a.phone) + '</a>' : '<a class="cta" href="#contact">Get a quote</a>';
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(name) + '</title><style>'
      + 'body{margin:0;font:16px/1.55 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#14110d;background:#fbfaf7}.w{max-width:1040px;margin:0 auto;padding:0 22px}'
      + '.note{background:#14110d;color:#fbfaf7;font-size:12px;padding:8px 14px;text-align:center;letter-spacing:.04em}.note b{color:#ff5a1f}'
      + 'nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0;gap:14px}nav b{font-size:18px;letter-spacing:-.02em}nav .cta{padding:10px 16px;font-size:14px}'
      + '.hero{padding:56px 0 48px}.hero h1{font-size:clamp(30px,5vw,52px);line-height:1.05;letter-spacing:-.03em;margin:0 0 14px;max-width:16ch}.hero p{font-size:18px;color:#4f4a43;max-width:52ch;margin:0 0 26px}'
      + '.cta{display:inline-block;background:#14110d;color:#fff;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:999px}.cta:hover{background:#ff5a1f}'
      + '.trust{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.trust span{font-size:13px;padding:7px 12px;border:1px solid #e3ded4;border-radius:999px;background:#fff}'
      + '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:8px 0 48px}.card{background:#fff;border:1px solid #e3ded4;border-radius:16px;padding:22px}.card h3{margin:0 0 6px;font-size:18px}.card p{margin:0;color:#6b665e;font-size:14px}'
      + 'h2{font-size:26px;letter-spacing:-.02em;margin:0 0 16px}.contact{background:#14110d;color:#fbfaf7;padding:48px 0;margin-top:20px}.contact h2{color:#fff}.contact .row{display:grid;grid-template-columns:1fr 1fr;gap:28px}.contact input,.contact textarea{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #3a3733;background:#1e1c19;color:#fff;margin-bottom:10px;font:inherit}.contact .cta{background:#ff5a1f}.contact p{color:#c9c3b8;margin:0 0 10px}'
      + 'footer{padding:22px 0;font-size:13px;color:#8a847a}@media(max-width:700px){.contact .row{grid-template-columns:1fr}.hero{padding:36px 0}}'
      + '</style></head><body><div class="note">Preview built from <b>' + esc(host) + '</b>. Nothing invented: blocks with no source on your site are left out.</div><div class="w">'
      + '<nav><b>' + esc(name) + '</b>' + cta + '</nav>'
      + '<section class="hero"><h1>' + esc(h1) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + cta + (trust.length ? '<div class="trust">' + trust.map((t) => '<span>' + esc(t) + '</span>').join('') + '</div>' : '') + '</section>'
      + (services.length >= 2 ? '<h2>What we do</h2><div class="grid">' + services.map((t) => '<div class="card"><h3>' + esc(t) + '</h3><p>Ask us about ' + esc(t.toLowerCase()) + '.</p></div>').join('') + '</div>' : '')
      + '</div><section class="contact" id="contact"><div class="w"><div class="row"><div><h2>Get in touch</h2>' + (a.phone ? '<p>Phone: ' + esc(a.phone) + '</p>' : '') + (a.email ? '<p>Email: ' + esc(a.email) + '</p>' : '') + (a.addr ? '<p>' + esc(a.addr) + '</p>' : '') + '</div><div><input placeholder="Your name"><input placeholder="Phone"><textarea rows="3" placeholder="What do you need?"></textarea><a class="cta" href="#">Request a quote</a></div></div></div></section>'
      + '<div class="w"><footer>© ' + YEAR + ' ' + esc(name) + '</footer></div></body></html>';
  }

  function dial(el, v) { el.classList.remove('good', 'mid'); if (v >= 80) el.classList.add('good'); else if (v >= 50) el.classList.add('mid'); el.querySelector('b').textContent = v; requestAnimationFrame(() => { el.querySelector('.bar').style.strokeDashoffset = 264 - 264 * v / 100; }); }

  function show(a) {
    results.hidden = false;
    $('#resHost').textContent = a.finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    $('#resSub').textContent = a.s.overall >= 80 ? 'Solid. A few things to tighten, nothing bleeding.' : a.s.overall >= 50 ? 'Working, but leaking. The fixes below are cheap.' : 'This site is costing you jobs. The good news: all of it is fixable.';
    dial($('#dialOverall'), a.s.overall);
    ['security', 'speed', 'mobile', 'trust', 'fresh', 'search'].forEach((k) => dial($('#dial-' + k), a.s[k]));
    $('#findings').innerHTML = a.f.map((x) => '<li class="' + x.st + '"><i></i><div><b>' + esc(x.t) + '</b><span>' + esc(x.n) + '</span></div></li>').join('');
    $('#facts').innerHTML = [['HTML size', a.kb + ' kB'], ['External scripts', a.scripts], ['Images', a.imgs + (a.noAlt ? ' (' + a.noAlt + ' without alt)' : '')], ['Fetched in', a.ms ? a.ms + ' ms' : 'n/a']].map((p) => '<div><span class="mono">' + p[0] + '</span><b>' + esc(p[1]) + '</b></div>').join('');
    $('#prevFrame').srcdoc = preview(a);
    $('#prevHost').textContent = a.finalUrl.replace(/^https?:\/\//, '').split('/')[0];
    const focus = 'Website audit for ' + a.finalUrl + ': scored ' + a.s.overall + '/100';
    $('#ctaBook').href = '../index.html#schedule?focus=' + encodeURIComponent(focus);
    $('#ctaMail').href = 'mailto:owen@toao.app?subject=' + encodeURIComponent('Website audit: ' + a.finalUrl) + '&body=' + encodeURIComponent('Overall ' + a.s.overall + '/100\n' + a.f.map((x) => (x.st === 'pass' ? 'OK  ' : x.st === 'warn' ? 'WARN' : 'FIX ') + ' ' + x.t).join('\n') + '\n\nI would like the better homepage built for real.');
    $('#relayNote').hidden = !a.relay;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = clean(input.value).replace(/^\s*(https?:\/\/)?/i, (m, p) => p || 'https://');
    if (!/^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(url)) { status.textContent = 'Type a web address like yourbusiness.com'; status.classList.add('err'); return; }
    status.classList.remove('err'); status.textContent = 'Fetching the page once…'; btn.setAttribute('aria-busy', 'true'); results.hidden = true;
    try {
      let res;
      try { res = await fetchSite(url); } catch (err) { if (/^https:/i.test(url)) { url = url.replace(/^https:/i, 'http:'); res = await fetchSite(url); } else throw err; }
      status.textContent = 'Scoring in your browser…';
      const a = analyse(res, url); show(a);
      status.textContent = 'Done. Nothing was stored.';
    } catch (err) {
      status.textContent = 'Could not fetch that address. Check the spelling, or email owen@toao.app and we will run it by hand.'; status.classList.add('err');
    }
    btn.removeAttribute('aria-busy');
  });
  $$('.prev-tabs button').forEach((b) => b.addEventListener('click', () => { $$('.prev-tabs button').forEach((x) => x.classList.toggle('on', x === b)); $('#prevWrap').classList.toggle('mobile', b.dataset.view === 'mobile'); }));
  const q = new URLSearchParams(location.search).get('url'); if (q) { input.value = q; form.requestSubmit(); }
})();
