/**
 * TOAO audit-call booking backend. Google Apps Script, runs as Owen's
 * toao.app Google account, so it can read the calendar and create events
 * with no OAuth client, no server, no cost.
 *
 * DEPLOY (about three minutes, once):
 *   1. Signed in as owen@toao.app, open https://script.google.com → New project.
 *   2. Replace the default code with this file. Save. Name it "TOAO booking".
 *   3. Deploy → New deployment → type "Web app".
 *      Execute as: Me.   Who has access: Anyone.   Deploy.
 *   4. Approve the permission prompt (Calendar + Mail, your own account).
 *   5. Copy the Web app URL (ends in /exec) and paste it into
 *      BOOKING_ENDPOINT at the top of book.js on the site. Done.
 *   Re-deploy (Manage deployments → edit → new version) after any edit here.
 *
 * SAFETY: only accepts slots inside WINDOWS, 15 minutes long, at least
 * LEAD_MIN minutes out, not clashing with anything on the calendar, and
 * caps bookings per email per day. Anything else is refused.
 */
var TZ = 'America/New_York';
var CAL_ID = 'primary';                 // or 'owen@toao.app'
var NOTIFY = 'owen@toao.app';
var DUR_MIN = 15, LEAD_MIN = 120, HORIZON_DAYS = 45;
var WINDOWS = { 0: [[14, 30, 17, 30]], 1: [[14, 30, 17, 30], [18, 15, 19, 15]], 2: [[14, 30, 17, 30]], 3: [[14, 30, 17, 30]], 4: [[14, 30, 16, 0], [16, 15, 17, 30]], 5: [[14, 30, 17, 30]], 6: [[14, 30, 17, 30]] };

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* GET ?action=busy&from=ISO&to=ISO → busy intervals (start/end only, no titles) */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'audit') return audit(p.url);
  if (p.action !== 'busy') return json({ ok: true, service: 'toao-booking' });
  var from = new Date(p.from || Date.now()), to = new Date(p.to || (Date.now() + HORIZON_DAYS * 864e5));
  var events = CalendarApp.getCalendarById(CAL_ID).getEvents(from, to);
  var busy = [];
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.isAllDayEvent()) continue;
    if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO) continue;
    busy.push([ev.getStartTime().toISOString(), ev.getEndTime().toISOString()]);
  }
  return json({ ok: true, busy: busy });
}

/* POST JSON {start,end,name,business,email,phone,tz} → creates the event */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var b = JSON.parse(e.postData.contents || '{}');
    var start = new Date(b.start), end = new Date(b.end);
    var name = clean(b.name, 80), business = clean(b.business, 120), email = clean(b.email, 120), phone = clean(b.phone, 40);
    if (!name || !business || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'fields' });
    if (isNaN(start) || isNaN(end) || (end - start) !== DUR_MIN * 60000) return json({ ok: false, error: 'slot' });
    if (start.getTime() < Date.now() + LEAD_MIN * 60000 || start.getTime() > Date.now() + HORIZON_DAYS * 864e5) return json({ ok: false, error: 'slot' });
    if (!insideWindow(start, end)) return json({ ok: false, error: 'slot' });

    var cal = CalendarApp.getCalendarById(CAL_ID);
    var clash = cal.getEvents(start, end).filter(function (ev) { return !ev.isAllDayEvent(); });
    if (clash.length) return json({ ok: false, error: 'taken' });
    var dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
    var sameEmail = cal.getEvents(dayStart, new Date(dayStart.getTime() + 864e5)).filter(function (ev) { return (ev.getDescription() || '').indexOf(email) >= 0; });
    if (sameEmail.length >= 2) return json({ ok: false, error: 'limit' });

    var desc = 'Free full business audit call (booked on toao.app)\n\nName: ' + name + '\nBusiness: ' + business + '\nEmail: ' + email + '\nPhone: ' + (phone || 'not given') + '\nLook at first: ' + clean(b.focus, 200) + '\nTheir timezone: ' + clean(b.tz, 60) + '\n\nOwen calls them. 15 minutes: phone line, site, ads, files, process. Send the ranked gap list after.';
    var ev = cal.createEvent('Audit call: ' + business + ' (' + name + ')', start, end, { description: desc, guests: email, sendInvites: true });
    ev.addPopupReminder(15);
    try { MailApp.sendEmail(NOTIFY, 'Audit call booked: ' + business + ' · ' + fmt(start), desc + '\n\nEvent: ' + (ev.getId ? ev.getId() : '')); } catch (err) {}
    return json({ ok: true, id: ev.getId() });
  } catch (err) {
    return json({ ok: false, error: 'server', detail: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err2) {}
  }
}

function insideWindow(start, end) {
  var dow = parseInt(Utilities.formatDate(start, TZ, 'u'), 10) % 7;    // 1=Mon … 0=Sun
  var wins = WINDOWS[dow] || [];
  var sm = mins(start), em = mins(end);
  for (var i = 0; i < wins.length; i++) {
    var w = wins[i], ws = w[0] * 60 + w[1], we = w[2] * 60 + w[3];
    if (sm >= ws && em <= we && (sm - ws) % DUR_MIN === 0) return true;
  }
  return false;
}
function mins(d) { return parseInt(Utilities.formatDate(d, TZ, 'H'), 10) * 60 + parseInt(Utilities.formatDate(d, TZ, 'm'), 10); }
function fmt(d) { return Utilities.formatDate(d, TZ, 'EEE MMM d, h:mm a') + ' ET'; }
function clean(s, n) { return String(s || '').replace(/[\r\n<>]/g, ' ').trim().slice(0, n); }

/* GET ?action=audit&url=... → fetches a site once (following up to 5 redirects
   by hand so the chain is visible), returns status, timing, size, headers and
   the HTML. All scoring happens in the visitor's browser. Nothing is stored. */
function audit(raw) {
  var u = String(raw || '').trim(); if (!u) return json({ ok: false, error: 'url' });
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  var chain = [], t0 = Date.now(), r, code, tries = 0;
  try {
    while (tries++ < 6) {
      r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: false, validateHttpsCertificates: false, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TOAO-audit/1.0)' } });
      code = r.getResponseCode(); var h = r.getAllHeaders(), loc = h.Location || h.location;
      chain.push({ url: u, status: code });
      if (code >= 300 && code < 400 && loc) { u = /^https?:/i.test(loc) ? loc : u.replace(/^(https?:\/\/[^\/]+).*$/, '$1') + (loc.charAt(0) === '/' ? '' : '/') + loc; continue; }
      break;
    }
  } catch (err) {
    if (/^https:/i.test(u) && chain.length === 0) { try { return audit(u.replace(/^https:/i, 'http:')); } catch (e2) {} }
    return json({ ok: false, error: 'fetch', detail: String(err) });
  }
  var html = r.getContentText() || '';
  return json({ ok: true, url: u, chain: chain, status: code, ms: Date.now() - t0, bytes: html.length, headers: r.getAllHeaders(), html: html.slice(0, 500000) });
}
