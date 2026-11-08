/* Waterproofmedia — shared behaviour: nav, reveal, contact form, assistant. */
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var LANG = (doc.lang || 'nl').slice(0, 2);

  /* Attribution without cookies or storage: UTM tags and the external referrer host
     travel along internal links as query parameters and are sent with a lead.
     Nothing is written to the device, so no consent is needed for this. */
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'lp'];
  var ATTR = (function () {
    var q = new URLSearchParams(location.search), a = {};
    ATTR_KEYS.forEach(function (k) { var v = q.get(k); if (v) a[k] = v.slice(0, 120); });
    if (!a.ref && document.referrer) {
      try { var h = new URL(document.referrer).hostname.replace(/^www\./, ''); if (h && h !== location.hostname.replace(/^www\./, '')) a.ref = h; } catch (e) {}
    }
    if ((a.utm_source || a.ref) && !a.lp) a.lp = location.pathname;
    return a;
  })();
  if (Object.keys(ATTR).length) {
    document.querySelectorAll('a[href]').forEach(function (el) {
      var u; try { u = new URL(el.getAttribute('href'), location.href); } catch (e) { return; }
      if (u.origin !== location.origin || /\.(pdf|png|jpe?g|webp|svg|zip)$/i.test(u.pathname)) return;
      Object.keys(ATTR).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, ATTR[k]); });
      el.setAttribute('href', u.pathname + u.search + u.hash);
    });
  }

  /* Cloudflare Web Analytics: cookieless, no consent needed. Paste the site token from
     Cloudflare → Analytics & Logs → Web Analytics. Empty = off. */
  var CF_BEACON_TOKEN = '';
  if (CF_BEACON_TOKEN) {
    var bs = document.createElement('script');
    bs.defer = true; bs.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    bs.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON_TOKEN }));
    document.head.appendChild(bs);
  }
  var T = {
    nl: {
      sending: 'Versturen…', send: 'Verstuur je bericht',
      required: 'Vul je naam, e-mailadres en een korte vraag in.',
      failed: 'Versturen via het formulier lukte niet. Je bericht staat klaar in een e-mail aan info@waterproofmedia.com. Of plan direct een moment in de agenda.',
      mailBtn: 'Open de e-mail met je bericht', calBtn: 'Plan direct een gesprek', mailSubj: 'Aanvraag via waterproofmedia.com',
      canned: [
        'Mooi! We zetten campagnes op Meta, TikTok en LinkedIn op als experiment en sturen elke dag bij. Lees meer op /nl/campagnes/ of plan direct een kennismaking: /plan',
        'Dat hangt af van je doel en de omvang. Je krijgt vooraf een vaste scope en prijs, na een korte kennismaking. De Growth Scan is gratis. Plan een gesprek: /plan',
        'De Growth Scan is een gratis analyse van je website. Je ziet waar kansen liggen in merk, content, vindbaarheid en conversie. Probeer hem op /en/growth-scan/',
        'Kies zelf een moment in de agenda: /plan Of laat je gegevens achter via /nl/contact/'
      ],
      offline: 'Goede vraag. Die beantwoorden we graag persoonlijk. Plan een kennismaking via /plan of mail naar info@waterproofmedia.com. Je vindt ook alles over onze diensten en cases op /nl/cases/',
      agentTitle: 'Growth-assistent', agentSub: 'AI-assistent · antwoordt namens Waterproofmedia',
      hello: 'Hoi! Ik beantwoord vragen over onze diensten, cases en producten. Waar ben je naar op zoek?',
      quick: ['Ik wil een campagne starten', 'Wat kost een traject?', 'Wat is de Growth Scan?', 'Ik wil een gesprek plannen'],
      placeholder: 'Typ je vraag…', typing: 'Aan het typen…',
      agentErr: 'Er ging iets mis. Je kunt ons altijd mailen op info@waterproofmedia.com of direct een gesprek plannen via /nl/contact/.',
      foot: 'AI kan fouten maken. Afspraken maak je altijd met een mens.', open: 'Stel je vraag', close: 'Sluiten'
    },
    en: {
      sending: 'Sending…', send: 'Send your message',
      required: 'Please add your name, email and a short question.',
      failed: 'The form could not send your message. It is ready for you in an email to info@waterproofmedia.com. Or pick a time in the calendar right away.',
      mailBtn: 'Open the email with your message', calBtn: 'Book a call now', mailSubj: 'Request via waterproofmedia.com',
      canned: [
        'Great! We run campaigns on Meta, TikTok and LinkedIn as experiments and steer them every day. Book an intro call: /plan',
        'That depends on your goal and scope. You get a fixed scope and price upfront, after a short intro call. The Growth Scan is free. Book a call: /plan',
        'The Growth Scan is a free analysis of your website. It shows opportunities in brand, content, search and conversion. Try it at /en/growth-scan/',
        'Pick a time in the calendar: /plan Or leave your details at /en/contact/'
      ],
      offline: 'Good question. We are happy to answer that personally. Book an intro call via /plan or email info@waterproofmedia.com. You can also find our services and cases at /en/cases/',
      agentTitle: 'Growth assistant', agentSub: 'AI assistant · answers on behalf of Waterproofmedia',
      hello: 'Hi! I answer questions about our services, cases and products. What are you looking for?',
      quick: ['I want to start a campaign', 'What does a project cost?', 'What is the Growth Scan?', 'I want to book a call'],
      placeholder: 'Type your question…', typing: 'Typing…',
      agentErr: 'Something went wrong. You can always email info@waterproofmedia.com or book a call via /en/contact/.',
      foot: 'AI can make mistakes. Agreements are always made with a human.', open: 'Ask a question', close: 'Close'
    }
  }[LANG] || null;
  var t = T || {};

  function track(name, params) { try { if (window.gtag) gtag('event', name, params || {}); } catch (e) {} }

  /* Nav */
  var nav = document.getElementById('nav');
  if (nav) addEventListener('scroll', function () { nav.classList.toggle('scrolled', scrollY > 12); }, { passive: true });
  var mb = document.getElementById('menuBtn'), mm = document.getElementById('mobileMenu');
  if (mb && mm) {
    mb.addEventListener('click', function () {
      var o = mm.classList.toggle('open');
      mb.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    mm.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { mm.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); }); });
  }

  /* Hero load: the one orchestrated entrance */
  var hero = document.querySelector('.hero');
  if (hero) requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('ready'); }); });

  /* The living wave: layered contour lines that drift, sparkle on the crests
     and answer pointer, touch and scroll. Same code on desktop and mobile. */
  var cv = document.getElementById('wave');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mx = .56, tmx = .56, energy = 0, tm = 0, running = true, visible = true, lastInput = -99;
    var LINES = 44, small = false, glints = [], GL = 34;
    /* One pre-rendered glint sprite: soft cyan halo, white core, thin flare */
    var spr = document.createElement('canvas'), S = 64; spr.width = spr.height = S;
    (function () {
      var c = spr.getContext('2d'), h = S / 2;
      var rg = c.createRadialGradient(h, h, 0, h, h, h);
      rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.12, 'rgba(210,255,248,.9)');
      rg.addColorStop(.35, 'rgba(92,242,214,.28)'); rg.addColorStop(1, 'rgba(92,242,214,0)');
      c.fillStyle = rg; c.fillRect(0, 0, S, S);
      var lg = c.createLinearGradient(0, 0, S, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.85)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = lg; c.fillRect(0, h - .6, S, 1.2);
      var vg = c.createLinearGradient(0, h - 14, 0, h + 14);
      vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(.5, 'rgba(255,255,255,.6)'); vg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = vg; c.fillRect(h - .5, h - 14, 1, 28);
    })();
    function size() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      small = W < 640; LINES = small ? 32 : 44; GL = small ? 26 : 34;
    }
    function wy(i, u) {
      var d = i / (LINES - 1), base = H * (.1 + d * .66), amp = 4 + d * d * (H * .12), spd = .35 + d * .5;
      var y = base
        + Math.sin(u * 5.2 + tm * spd + i * .33) * amp * .55
        + Math.sin(u * 11.7 - tm * spd * .8 + i * .21) * amp * .22
        + Math.sin(u * 2.1 + tm * .18) * amp * .5;
      y -= Math.exp(-(u - .56) * (u - .56) * 7) * H * .16 * d * (1 + .08 * Math.sin(tm * .4));
      var dx = u - mx, swell = Math.exp(-dx * dx * 28) * (18 + energy * 40) * d;
      return y - swell * Math.sin(tm * 1.6 - Math.abs(dx) * 18);
    }
    /* New glint: pick the highest crest out of a few candidates, biased to the swell */
    function spawn(g, fresh) {
      var i = Math.round(LINES * (.3 + Math.random() * .5)), best = 0, by = 1e9;
      for (var k = 0; k < 5; k++) {
        var u = Math.random() < .55 ? mx + (Math.random() - .5) * .5 : Math.random();
        var y = wy(i, u) - wy(i, u - .015) * .5 - wy(i, u + .015) * .5;   // negative = crest
        if (y < by) { by = y; best = u; }
      }
      g.i = i; g.u = best; g.t = fresh ? Math.random() * 2.4 : 0;
      g.life = 1.4 + Math.random() * 2.2; g.s = .45 + Math.random() * .75; g.v = (Math.random() - .3) * .004;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      /* With no pointer the swell wanders by itself, so phones see it breathe */
      if (tm - lastInput > 2.5) tmx = .56 + Math.sin(tm * .21) * .26 + Math.sin(tm * .53) * .08;
      mx += (tmx - mx) * .04; energy *= .965;
      var step = small ? 8 : 7;
      for (var i = 0; i < LINES; i++) {
        var d = i / (LINES - 1);
        var a = (.1 + d * .42) * (d > .82 ? Math.max(0, (1 - d) / .18) : 1);
        var g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(77,141,255,' + a * .55 + ')');
        g.addColorStop(.55, 'rgba(92,242,214,' + a + ')');
        g.addColorStop(1, 'rgba(77,141,255,' + a * .4 + ')');
        ctx.strokeStyle = g; ctx.lineWidth = (small ? .9 : .7) + d * 1.1;
        ctx.beginPath();
        for (var x = -step; x <= W + step; x += step) {
          var y = wy(i, x / W);
          if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      /* Sparkle: glints ride the crests and flare up with energy */
      while (glints.length < GL) { var n = {}; spawn(n, true); glints.push(n); }
      ctx.globalCompositeOperation = 'lighter';
      for (var j = 0; j < GL; j++) {
        var gl = glints[j]; gl.t += .016; gl.u += gl.v * .1;
        if (gl.t > gl.life || gl.u < -.02 || gl.u > 1.02) { spawn(gl); continue; }
        var p = gl.t / gl.life, tw = Math.sin(Math.PI * p); tw *= tw;
        var flick = .75 + .25 * Math.sin(tm * 9 + j * 1.7);
        var al = Math.min(1, tw * flick * ((small ? .8 : .6) + energy * .6));
        if (al < .02) continue;
        var sz = S * gl.s * (small ? .55 : .5) * (1 + energy * .5);
        ctx.globalAlpha = al;
        ctx.drawImage(spr, gl.u * W - sz / 2, wy(gl.i, gl.u) - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function loop() { if (!running) return; tm += .012; draw(); requestAnimationFrame(loop); }
    size(); addEventListener('resize', size, { passive: true });
    function nudge(clientX, amt) {
      var r = cv.getBoundingClientRect();
      tmx = (clientX - r.left) / r.width; lastInput = tm; energy = Math.min(1, energy + amt);
    }
    if (!still) {
      addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') nudge(e.clientX, .04); }, { passive: true });
      addEventListener('touchstart', function (e) { if (e.touches[0]) nudge(e.touches[0].clientX, .35); }, { passive: true });
      addEventListener('touchmove', function (e) { if (e.touches[0]) nudge(e.touches[0].clientX, .05); }, { passive: true });
      var sy = scrollY;
      addEventListener('scroll', function () {
        var dy = Math.abs(scrollY - sy); sy = scrollY;
        energy = Math.min(1, energy + Math.min(.25, dy * .006));
      }, { passive: true });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !running) { running = true; loop(); } else if (!visible) running = false;
      }).observe(cv);
      document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else if (visible && !running) { running = true; loop(); } });
      loop();
    } else { tm = 2; for (var q = 0; q < GL; q++) { var z = {}; spawn(z); z.t = z.life / 2; glints.push(z); } draw(); }
  }

  /* Track primary CTAs */
  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () { track(el.getAttribute('data-track'), { lang: LANG }); });
  });

  /* Prefill contact form from ?topic= */
  var form = document.getElementById('contactForm');
  if (form) {
    var topic = new URLSearchParams(location.search).get('topic');
    if (topic) { var r = form.querySelector('input[name=topic][value="' + topic + '"]'); if (r) r.checked = true; }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = document.getElementById('formMsg'), btn = form.querySelector('button[type=submit]');
      var fd = new FormData(form), data = {};
      fd.forEach(function (v, k) { data[k] = v; });
      data.lang = LANG; data.page = location.pathname; data.attribution = ATTR;
      if (!data.name || !data.email || !data.message) { msg.textContent = t.required; msg.className = 'form-msg err'; return; }
      btn.disabled = true; btn.textContent = t.sending; msg.textContent = '';
      fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) throw new Error('x');
          track('generate_lead', { method: 'contact_form', topic: data.topic || '', lang: LANG });
          form.hidden = true; document.getElementById('formDone').classList.add('show');
          document.getElementById('formDone').focus();
        })
        .catch(function () {
          var body = [data.message, '', data.name, data.company, data.website, data.phone, data.topic ? 'Onderwerp/topic: ' + data.topic : '', data.timing ? 'Start: ' + data.timing : ''].filter(function (x) { return x !== undefined; }).join('\n');
          var href = 'mailto:info@waterproofmedia.com?subject=' + encodeURIComponent(t.mailSubj) + '&body=' + encodeURIComponent(body);
          msg.className = 'form-msg fallback';
          msg.innerHTML = '<span>' + t.failed + '</span><span class="fb-row"><a class="btn btn-primary" href="' + href + '">' + t.mailBtn + '</a><a class="btn btn-ghost" href="/plan" target="_blank" rel="noopener">' + t.calBtn + '</a></span>';
          track('contact_fallback', { lang: LANG });
          btn.disabled = false; btn.textContent = t.send;
        });
    });
  }

  /* Assistant */
  if (!T || document.body.hasAttribute('data-no-agent')) return;
  var history = [], busy = false;
  var fab = document.createElement('button');
  fab.className = 'agent-fab'; fab.type = 'button'; fab.setAttribute('aria-haspopup', 'dialog');
  fab.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="lbl">' + t.open + '</span>';
  fab.setAttribute('aria-label', t.open);
  var box = document.createElement('div');
  box.className = 'agent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', t.agentTitle);
  box.innerHTML = '<div class="agent-head"><div><b>' + t.agentTitle + '</b><small>' + t.agentSub + '</small></div><button type="button" aria-label="' + t.close + '">&times;</button></div>' +
    '<div class="agent-log" aria-live="polite"></div><div class="agent-quick"></div>' +
    '<form class="agent-form"><input type="text" maxlength="600" autocomplete="off" aria-label="' + t.placeholder + '" placeholder="' + t.placeholder + '"><button type="submit" aria-label="Send">&uarr;</button></form>' +
    '<div class="agent-foot">' + t.foot + '</div>';
  document.body.appendChild(fab); document.body.appendChild(box);
  var log = box.querySelector('.agent-log'), quick = box.querySelector('.agent-quick'), inp = box.querySelector('input');

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function linkify(s) {
    return esc(s).replace(/(https:\/\/[^\s<)]+|\/(?:nl|en)\/[a-z0-9\-\/#?=]*|\/plan\b)/g, function (u) {
      var ext = u.indexOf('http') === 0 && u.indexOf('waterproofmedia.com') < 0;
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + u + '</a>';
    });
  }
  function add(role, text) { var d = document.createElement('div'); d.className = 'msg ' + role; d.innerHTML = role === 'bot' ? linkify(text) : esc(text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function openBox() {
    box.classList.add('open'); fab.style.display = 'none';
    if (!log.children.length) {
      add('bot', t.hello);
      t.quick.forEach(function (q) { var b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.onclick = function () { ask(q); }; quick.appendChild(b); });
      track('agent_open', { lang: LANG });
    }
    inp.focus();
  }
  function closeBox() { box.classList.remove('open'); fab.style.display = ''; fab.focus(); }
  function ask(q) {
    q = (q || '').trim(); if (!q || busy) return;
    quick.innerHTML = ''; add('me', q); history.push({ role: 'user', content: q }); inp.value = '';
    busy = true; var ty = add('bot typing', t.typing);
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12), lang: LANG, page: location.pathname, attribution: ATTR }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.reply) throw new Error('x');
        ty.remove();
        add('bot', j.reply); history.push({ role: 'assistant', content: j.reply });
        if (j.lead) track('generate_lead', { method: 'assistant', lang: LANG });
      })
      .catch(function () {
        ty.remove();
        var i = t.quick.indexOf(q), a = i > -1 ? t.canned[i] : t.offline;
        add('bot', a); history.push({ role: 'assistant', content: a });
      })
      .then(function () { busy = false; });
  }
  fab.addEventListener('click', openBox);
  box.querySelector('.agent-head button').addEventListener('click', closeBox);
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBox(); });
  box.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); ask(inp.value); });
  document.querySelectorAll('[data-open-agent]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openBox(); }); });
})();
