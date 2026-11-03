/* Waterproofmedia — shared behaviour: nav, reveal, contact form, assistant. */
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var LANG = (doc.lang || 'nl').slice(0, 2);
  var T = {
    nl: {
      sending: 'Versturen…', send: 'Verstuur je bericht',
      required: 'Vul je naam, e-mailadres en een korte vraag in.',
      failed: 'Versturen lukte niet. Mail ons direct op info@waterproofmedia.com, dan reageren we net zo snel.',
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
      failed: 'Sending failed. Email us directly at info@waterproofmedia.com and we will reply just as fast.',
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

  /* The living wave: layered contour lines that drift and answer the pointer */
  var cv = document.getElementById('wave');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mx = .5, my = .5, tmx = .5, tmy = .5, energy = 0, tm = 0, running = true, visible = true;
    var LINES = innerWidth < 640 ? 26 : 44;
    function size() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LINES = W < 640 ? 26 : 44;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      mx += (tmx - mx) * .05; my += (tmy - my) * .05; energy *= .96;
      var step = W < 640 ? 10 : 7;
      for (var i = 0; i < LINES; i++) {
        var d = i / (LINES - 1);                 // 0 = horizon, 1 = foreground
        var base = H * (.1 + d * .66);
        var amp = 4 + d * d * (H * .12);
        var spd = .35 + d * .5;
        var a = (.1 + d * .42) * (d > .82 ? Math.max(0, (1 - d) / .18) : 1);
        var g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(77,141,255,' + a * .55 + ')');
        g.addColorStop(.55, 'rgba(92,242,214,' + a + ')');
        g.addColorStop(1, 'rgba(77,141,255,' + a * .4 + ')');
        ctx.strokeStyle = g; ctx.lineWidth = .7 + d * 1.1;
        ctx.beginPath();
        for (var x = -step; x <= W + step; x += step) {
          var u = x / W;
          var y = base
            + Math.sin(u * 5.2 + tm * spd + i * .33) * amp * .55
            + Math.sin(u * 11.7 - tm * spd * .8 + i * .21) * amp * .22
            + Math.sin(u * 2.1 + tm * .18) * amp * .5;
          y -= Math.exp(-(u - .56) * (u - .56) * 7) * H * .16 * d * (1 + .08 * Math.sin(tm * .4));
          var dx = u - mx, swell = Math.exp(-dx * dx * 28) * (18 + energy * 40) * d;
          y -= swell * Math.sin(tm * 1.6 - Math.abs(dx) * 18);
          if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    function loop() { if (!running) return; tm += .012; draw(); requestAnimationFrame(loop); }
    size(); addEventListener('resize', size, { passive: true });
    if (!still) {
      addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
        if (Math.abs(nx - tmx) > .002) energy = Math.min(1, energy + .04);
        tmx = nx; tmy = ny;
      }, { passive: true });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !running) { running = true; loop(); } else if (!visible) running = false;
      }).observe(cv);
      document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else if (visible && !running) { running = true; loop(); } });
      loop();
    } else { tm = 2; draw(); }
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
      data.lang = LANG; data.page = location.pathname;
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
        .catch(function () { msg.textContent = t.failed; msg.className = 'form-msg err'; btn.disabled = false; btn.textContent = t.send; });
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
    return esc(s).replace(/(https:\/\/[^\s<)]+|\/(?:nl|en)\/[a-z0-9\-\/#?=]*)/g, function (u) {
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
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12), lang: LANG, page: location.pathname }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        ty.remove(); if (!j.reply) throw new Error('x');
        add('bot', j.reply); history.push({ role: 'assistant', content: j.reply });
        if (j.lead) track('generate_lead', { method: 'assistant', lang: LANG });
      })
      .catch(function () { ty.remove(); add('bot', t.agentErr); })
      .then(function () { busy = false; });
  }
  fab.addEventListener('click', openBox);
  box.querySelector('.agent-head button').addEventListener('click', closeBox);
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBox(); });
  box.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); ask(inp.value); });
  document.querySelectorAll('[data-open-agent]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openBox(); }); });
})();
