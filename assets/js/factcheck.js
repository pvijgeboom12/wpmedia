/* Live AI-factchecker module (/nl/factchecker/). Works with worker/factcheck.js.
   Demo mode (no webhook configured): plays the process only, never shows a made-up verdict. */
(function () {
  var root = document.getElementById('fcTool');
  if (!root) return;
  var form = document.getElementById('fcForm'), stage = document.getElementById('fcStage');
  var phaseEl = document.getElementById('fcPhase'), live = document.getElementById('fcLive'), out = document.getElementById('fcResult');
  var btn = form.querySelector('button[type=submit]'), msg = document.getElementById('fcMsg');
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SITEKEY = root.getAttribute('data-sitekey');
  var tsId = null, tsToken = '', tsLoading = false, timers = [], pollT = null, running = false;

  var SCRIPT = {
    r1: { label: 'Ronde 1 · de drie checken blind, los van elkaar',
      claude: ['Ik splits je tekst in losse claims.', 'Ik zoek bronnen, en ook tegenbewijs.'],
      gpt: ['Ik check eerst de bronnen die je meestuurde.', 'Ik lees wat het web zegt over elke claim.'],
      gemini: ['Ik zie de antwoorden van de anderen niet.', 'Per claim kies ik: klopt, deels, niet of onbekend.'] },
    r2: { label: 'Ronde 2 · ze lezen elkaars antwoord en checken het',
      claude: ['Ik lees de andere twee antwoorden.', 'Alleen bewijs kan mijn oordeel veranderen.'],
      gpt: ['Waar zijn we het oneens? Dat zoek ik op.', 'Ik check het betwiste punt opnieuw.'],
      gemini: ['Een betere bron? Dan pas ik mijn oordeel aan.', 'Geen bewijs? Dan blijf ik bij mijn oordeel.'] },
    src: { label: 'Bronnen · bij onenigheid beslist een betrouwbare bron',
      hub: ['Bij onenigheid geven betrouwbare bronnen de doorslag.'] },
    sum: { label: 'Samenvatting · neutraal, zonder eigen mening',
      hub: ['Ik zet op een rij: eens, verschillen en open punten.'] }
  };
  var ORDER = ['r1', 'r2', 'src', 'sum'];

  function later(fn, ms) { var t = setTimeout(fn, RM ? 0 : ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function bubble(who) { return stage.querySelector('[data-bubble="' + who + '"]'); }
  function col(who) { return stage.querySelector('[data-who="' + who + '"]'); }

  function type(b, text, done) {
    var el = b.querySelector('.fc-text'), c = col(b.getAttribute('data-bubble'));
    b.classList.add('show'); el.textContent = ''; b._full = text;
    if (c) { c.classList.add('thinking'); c.classList.remove('talking'); }
    later(function () {
      if (c) { c.classList.remove('thinking'); c.classList.add('talking'); }
      if (RM) { el.textContent = text; end(); return; }
      var i = 0;
      (function step() {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) later(step, 28); else end();
      })();
    }, 900);
    function end() { later(function () { if (c) c.classList.remove('talking'); if (done) done(); }, 1300); }
  }
  function sayAll(who, lines, done) {
    var i = 0;
    (function next() { if (i >= lines.length) { if (done) done(); return; } type(bubble(who), lines[i++], next); })();
  }
  function phase(p, done) {
    stage.setAttribute('data-phase', p);
    live.textContent = SCRIPT[p].label; phaseEl.textContent = SCRIPT[p].label;
    var s = SCRIPT[p], who = ['claude', 'gpt', 'gemini', 'hub'].filter(function (w) { return s[w]; });
    var left = who.length;
    who.forEach(function (w, k) { later(function () { sayAll(w, s[w], function () { if (--left === 0 && done) done(); }); }, k * 450); });
  }
  function playScript(i, loopUntil) {
    if (!running) return;
    var p = ORDER[i];
    phase(p, function () {
      if (i + 1 < ORDER.length) playScript(i + 1, loopUntil);
      else if (loopUntil && !loopUntil()) later(function () { playScript(2, loopUntil); }, 1200);
      else if (loopUntil) loopUntil(true);
    });
  }


  /* Truth score: derived only from the verdicts, never guessed by an AI */
  var pctEl = document.getElementById('fcPct'), barEl = document.getElementById('fcBar'), subEl = document.getElementById('fcScoreSub');
  var SUB0 = subEl.textContent;
  function computeScore(claims) {
    var VAL = { 'klopt': 100, 'klopt deels': 50, 'klopt niet': 0 }, sum = 0, n = 0, unk = 0;
    (claims || []).forEach(function (c) {
      var v = VAL[String(c.oordeel || '').toLowerCase()];
      if (v === undefined) unk++; else { sum += v; n++; }
    });
    return { pct: n ? Math.round(sum / n) : null, n: n, unk: unk };
  }
  function tone(p) { return p >= 70 ? 'g' : p >= 40 ? 'o' : 'r'; }
  function resetScore() { pctEl.className = 'fc-pct'; pctEl.textContent = '–'; barEl.className = ''; barEl.style.width = '0'; subEl.textContent = SUB0; }
  function rollScore(target, sub) {
    var t0 = null, dur = RM ? 0 : 1800;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var k = dur ? Math.min(1, (ts - t0) / dur) : 1;
      if (k < 1) {
        var shown = target === null ? Math.floor(Math.random() * 100) : Math.round(target * (1 - Math.pow(1 - k, 3)));
        shown = Math.max(0, Math.min(100, shown));
        pctEl.textContent = shown + '%'; pctEl.className = 'fc-pct ' + tone(shown);
        requestAnimationFrame(frame);
      } else if (target === null) {
        pctEl.textContent = '?'; pctEl.className = 'fc-pct'; barEl.className = ''; barEl.style.width = '0';
      } else {
        pctEl.textContent = target + '%'; pctEl.className = 'fc-pct ' + tone(target);
      }
    }
    if (target !== null) { barEl.className = tone(target); barEl.style.width = target + '%'; }
    subEl.textContent = sub;
    live.textContent = (target === null ? 'Geen waarheidsscore. ' : 'Waarheidsscore ' + target + ' procent. ') + sub;
    later(function () { requestAnimationFrame(frame); }, 400);
  }

  var tip = stage.querySelector('.fc-tip');
  if (tip) {
    tip.addEventListener('click', function () { tip.setAttribute('aria-expanded', tip.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); });
    tip.addEventListener('blur', function () { tip.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') tip.setAttribute('aria-expanded', 'false'); });
  }

  /* Turnstile, loaded on first interaction */
  function loadTurnstile() {
    if (!SITEKEY || tsLoading) return; tsLoading = true;
    window.fcTsReady = function () {
      tsId = window.turnstile.render('#fcTurnstile', { sitekey: SITEKEY, theme: 'dark', language: 'nl',
        callback: function (t) { tsToken = t; }, 'expired-callback': function () { tsToken = ''; } });
    };
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=fcTsReady';
    s.async = true; s.defer = true; document.head.appendChild(s);
  }
  form.addEventListener('focusin', loadTurnstile);
  form.addEventListener('pointerenter', loadTurnstile);
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { loadTurnstile(); io.disconnect(); } }, { rootMargin: '200px' }); io.observe(form); } else loadTurnstile();

  var ERR = {
    too_short: 'Schrijf een hele zin of een cijfer met context. Minimaal 12 tekens.',
    email: 'Dit e-mailadres klopt niet. Laat het leeg of vul het opnieuw in.',
    turnstile: 'De beveiligingscheck lukte niet. Probeer het nog een keer.',
    limit_ip: 'Je hebt vandaag het maximum aantal checks gedaan. Morgen kan het weer. Of vraag hieronder een uitgebreide check aan.',
    limit_site: 'Het maximum voor vandaag is bereikt. Probeer het morgen opnieuw, of vraag hieronder een check aan.',
    delivery: 'De check kon niet starten. Probeer het later nog eens.',
    timeout: 'Dit duurt langer dan normaal. Kijk over een paar minuten nog eens, of vraag hieronder een check aan.',
    error: 'Er ging iets mis tijdens de check. Probeer het later nog eens.'
  };
  function idleCols() { stage.querySelectorAll('.fc-col,.fc-hub').forEach(function (c) { c.classList.remove('thinking', 'talking'); }); stage.querySelectorAll('.fc-bubble').forEach(function (b) { if (b._full) b.querySelector('.fc-text').textContent = b._full; }); }
  function fail(code) {
    running = false; clearTimers(); idleCols(); stage.setAttribute('data-phase', 'idle');
    msg.textContent = ERR[code] || ERR.error; msg.className = 'form-msg err'; phaseEl.textContent = 'Gestopt.'; resetScore();
    btn.disabled = false; btn.textContent = 'Check deze claim';
    if (window.turnstile && tsId !== null) { window.turnstile.reset(tsId); tsToken = ''; }
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var VCLASS = { 'klopt': 'ok', 'klopt deels': 'part', 'klopt niet': 'no', 'onbekend': 'unk' };
  function link(u) { return /^https?:\/\//i.test(u) ? '<a href="' + esc(u) + '" target="_blank" rel="nofollow noopener">' + esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)) + '</a>' : ''; }

  function renderDemo() {
    out.innerHTML = '<div class="fc-demo"><p class="fc-tag">Preview</p><h3>Zo werkt het proces.</h3>' +
      '<p>In deze preview draait de echte check nog niet. Je ziet dus alleen hoe de drie AI\'s samenwerken. Na de livegang staat hier per claim het oordeel, met bronnen.</p></div>';
    out.hidden = false; out.focus();
  }
  function renderResult(job) {
    var r = job.resultaat || {}, claims = Array.isArray(r.claims) ? r.claims : [];
    var h = '<p class="fc-tag">Uitkomst' + (r.zekerheid ? ' · zekerheid ' + esc(r.zekerheid) : '') + '</p>';
    if (!claims.length) h += '<p>De modellen gaven geen oordeel per claim terug. Lees hieronder de discussie.</p>';
    claims.forEach(function (c) {
      var v = String(c.oordeel || 'onbekend').toLowerCase();
      h += '<article class="fc-claim"><div class="fc-claim-top"><span class="fc-v ' + (VCLASS[v] || 'unk') + '">' + esc(v.charAt(0).toUpperCase() + v.slice(1)) + '</span>' +
        (c.eens ? '<span class="fc-eens">Eens: ' + esc(c.eens) + '</span>' : '') + '</div>' +
        '<p class="fc-claim-t">' + esc(c.claim) + '</p>' + (c.toelichting ? '<p>' + esc(c.toelichting) + '</p>' : '') +
        (c.doorslag && c.doorslag.bron ? '<p class="fc-src">Doorslag: ' + link(c.doorslag.bron) + (c.doorslag.toelichting ? ' · ' + esc(c.doorslag.toelichting) : '') + '</p>' : '') +
        (Array.isArray(c.bronnen) && c.bronnen.length ? '<p class="fc-src">Bronnen: ' + c.bronnen.map(link).filter(Boolean).join(' · ') + '</p>' : '') + '</article>';
    });
    if (Array.isArray(r.open) && r.open.length) h += '<div class="fc-open"><h4>Nog open</h4><ul>' + r.open.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul></div>';
    var rounds = [['ronde1', 'Ronde 1'], ['ronde2', 'Ronde 2']].filter(function (x) { return job[x[0]]; });
    if (rounds.length) {
      h += '<details class="fc-more"><summary>Lees de hele discussie</summary>';
      rounds.forEach(function (x) { ['gpt', 'claude', 'gemini'].forEach(function (m) { if (job[x[0]][m]) h += '<h4>' + x[1] + ' · ' + { claude: 'Claude', gpt: 'ChatGPT', gemini: 'Gemini' }[m] + '</h4><p class="fc-pre">' + esc(job[x[0]][m]) + '</p>'; }); });
      h += '</details>';
    }
    h += '<div class="cta-row"><a class="btn btn-primary" href="/nl/contact/?topic=automation" data-track="cta_factcheck_result">Zo\'n workflow voor je eigen werk?</a></div>';
    out.innerHTML = h; out.hidden = false; out.focus();
  }

  /* Show real round text in the bubbles as it arrives */
  function excerpt(t) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > 150 ? t.slice(0, 147) + '…' : t; }
  var shown = {};
  function showRound(job, key) {
    if (shown[key] || !job[key]) return; shown[key] = true;
    ['claude', 'gpt', 'gemini'].forEach(function (m) { if (job[key][m]) SCRIPT[key === 'ronde1' ? 'r1' : 'r2'][m] = [excerpt(job[key][m])]; });
    ['claude', 'gpt', 'gemini'].forEach(function (m) { if (job[key][m]) later(function () { type(bubble(m), excerpt(job[key][m])); }, 300); });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (running) return;
    var fd = new FormData(form), d = {};
    fd.forEach(function (v, k) { d[k] = v; });
    d.lang = 'nl'; d.page = location.pathname; d.token = tsToken; d.consent = d.consent === 'on';
    if ((d.vraag || '').trim().length < 12) { msg.textContent = ERR.too_short; msg.className = 'form-msg err'; return; }
    if (SITEKEY && !tsToken && window.turnstile) { msg.textContent = 'Nog even geduld: de beveiligingscheck is bijna klaar.'; msg.className = 'form-msg'; return; }
    msg.textContent = ''; btn.disabled = true; btn.textContent = 'Bezig met checken…';
    out.hidden = true; out.innerHTML = ''; shown = {}; running = true; resetScore(); stage.querySelectorAll('.fc-bubble').forEach(function (b) { b._full = ''; b.classList.remove('show'); b.querySelector('.fc-text').textContent = b.getAttribute('data-bubble') === 'hub' ? 'Komen in actie als de drie klaar zijn.' : 'Leest je claim…'; });
    stage.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
    fetch('/api/factcheck', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) return fail(res.j && res.j.error);
        if (res.j.demo) {
          playScript(0, function () { { running = false; idleCols(); stage.setAttribute('data-phase', 'done'); live.textContent = phaseEl.textContent = 'Klaar. Dit was een preview van het proces.'; renderDemo(); rollScore(null, 'Preview: geen echte uitslag. Na de livegang rolt hier het echte percentage uit.'); btn.disabled = false; btn.textContent = 'Check deze claim'; } return true; });
          return;
        }
        var job = null, started = Date.now();
        playScript(0, function () { return !running; });
        function finish() { running = false; clearTimers(); idleCols(); stage.setAttribute('data-phase', 'done'); live.textContent = phaseEl.textContent = 'Klaar. Hieronder staat de uitkomst.'; renderResult(job); var sc = computeScore((job.resultaat || {}).claims); rollScore(sc.pct, sc.pct === null ? 'Niet te bepalen: geen claim kreeg een duidelijk oordeel.' : 'Gemiddelde van ' + sc.n + (sc.n === 1 ? ' claim' : ' claims') + (sc.unk ? '. ' + sc.unk + ' onbekend telt niet mee' : '') + '.'); btn.disabled = false; btn.textContent = 'Check nog een claim'; }
        (function poll() {
          if (Date.now() - started > 6 * 60 * 1000) return fail('timeout');
          fetch('/api/factcheck?id=' + encodeURIComponent(res.j.id)).then(function (r) { return r.json(); }).then(function (j) {
            if (j.ok) {
              job = j.job;
              showRound(job, 'ronde1'); showRound(job, 'ronde2');
              if (job.status === 'error') return fail('error');
              if (job.status === 'done') return finish();
            }
            pollT = setTimeout(poll, 4000);
          }).catch(function () { pollT = setTimeout(poll, 6000); });
        })();
      })
      .catch(function () { fail('delivery'); });
  });
})();
